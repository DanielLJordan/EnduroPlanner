/**
 * iRacing IBT (iRacing Binary Telemetry) file parser
 *
 * IBT file layout:
 *  [0]    irsdk_header         (112 bytes)
 *  [112]  irsdk_diskSubHeader  (32 bytes, 4-byte time_t + 4 pad + 2×double + 2×int)
 *  [varHeaderOffset]  irsdk_varHeader[numVars]  (144 bytes each)
 *  [sessionInfoOffset]  session YAML string  (sessionInfoLen bytes)
 *  [sessionInfoOffset + sessionInfoLen]  data records  (recordCount × bufLen bytes)
 */

// ── Constants ──────────────────────────────────────────────────────────────────

const HEADER_SIZE = 112
const DISK_SUB_HEADER_OFFSET = HEADER_SIZE
const VAR_HEADER_SIZE = 144 // irsdk_varHeader is 144 bytes

// irsdk_VarType enum
const VAR_TYPE = {
  CHAR: 0,
  BOOL: 1,
  INT: 2,
  BIT_FIELD: 3,
  FLOAT: 4,
  DOUBLE: 5,
} as const

// ── Types ──────────────────────────────────────────────────────────────────────

interface IBTVar {
  type: number
  offset: number // offset within a single data record
  count: number
  name: string
  unit: string
}

export interface IBTLap {
  lapNumber: number
  lapTimeSeconds: number
  fuelUsedLiters: number
  fuelAtLapStartLiters: number
}

export interface IBTParseResult {
  laps: IBTLap[]
  avgLapTimeSeconds: number  // average of clean laps
  avgFuelPerLap: number      // average of clean laps (liters)
  totalLaps: number
  trackName: string
  carName: string
  tickRate: number
  driverName: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function readCString(view: DataView, offset: number, maxLen: number): string {
  let s = ''
  for (let i = 0; i < maxLen; i++) {
    const b = view.getUint8(offset + i)
    if (b === 0) break
    s += String.fromCharCode(b)
  }
  return s.trim()
}

function readVarValue(view: DataView, recordBase: number, v: IBTVar): number {
  const off = recordBase + v.offset
  switch (v.type) {
    case VAR_TYPE.FLOAT:  return view.getFloat32(off, true)
    case VAR_TYPE.DOUBLE: return view.getFloat64(off, true)
    case VAR_TYPE.INT:
    case VAR_TYPE.BIT_FIELD: return view.getInt32(off, true)
    case VAR_TYPE.BOOL:   return view.getUint8(off)
    default:              return 0
  }
}

/** Pull a named value from the session YAML string (very lightweight, no full YAML parser) */
function extractYamlValue(yaml: string, key: string): string {
  const re = new RegExp(`${key}:\\s*(.+)`)
  const m = yaml.match(re)
  return m ? m[1].trim() : ''
}

// ── Main parser ────────────────────────────────────────────────────────────────

export function parseIBTFile(buffer: ArrayBuffer): IBTParseResult {
  if (buffer.byteLength < HEADER_SIZE + 32) {
    throw new Error('File too small to be a valid IBT file')
  }

  const view = new DataView(buffer)

  // ── 1. Main header ───────────────────────────────────────────────────────────
  const ver             = view.getInt32(0,  true)
  const tickRate        = view.getInt32(8,  true)
  const sessionInfoLen  = view.getInt32(16, true)
  const sessionInfoOffset = view.getInt32(20, true)
  const numVars         = view.getInt32(24, true)
  const varHeaderOffset = view.getInt32(28, true)
  const bufLen          = view.getInt32(36, true)

  if (ver < 1 || numVars <= 0 || bufLen <= 0) {
    throw new Error('Invalid IBT file header — this may not be an iRacing telemetry file')
  }

  // ── 2. Disk sub-header (at offset 112) ───────────────────────────────────────
  // Layout: int32 startDate | int32 pad | double startTime | double endTime | int32 lapCount | int32 recordCount
  const recordCountFromHeader = view.getInt32(DISK_SUB_HEADER_OFFSET + 28, true)

  // ── 3. Session info YAML ─────────────────────────────────────────────────────
  const yamlBytes = new Uint8Array(
    buffer,
    sessionInfoOffset,
    Math.min(sessionInfoLen, buffer.byteLength - sessionInfoOffset)
  )
  const sessionYaml = new TextDecoder('utf-8').decode(yamlBytes)
  const trackName  = extractYamlValue(sessionYaml, 'TrackDisplayName') ||
                     extractYamlValue(sessionYaml, 'TrackName') || 'Unknown Track'
  const carName    = extractYamlValue(sessionYaml, 'CarScreenNameShort') ||
                     extractYamlValue(sessionYaml, 'CarScreenName') || 'Unknown Car'
  const driverName = extractYamlValue(sessionYaml, 'UserName') || ''

  // ── 4. Variable headers ──────────────────────────────────────────────────────
  const vars = new Map<string, IBTVar>()
  for (let i = 0; i < numVars; i++) {
    const base = varHeaderOffset + i * VAR_HEADER_SIZE
    if (base + VAR_HEADER_SIZE > buffer.byteLength) break
    const type   = view.getInt32(base,     true)
    const offset = view.getInt32(base + 4, true)
    const count  = view.getInt32(base + 8, true)
    const name   = readCString(view, base + 16, 32)
    const unit   = readCString(view, base + 112, 32)
    vars.set(name, { type, offset, count, name, unit })
  }

  const lapVar      = vars.get('Lap')
  const lapTimeVar  = vars.get('LapLastLapTime')
  const fuelVar     = vars.get('FuelLevel')
  const onTrackVar  = vars.get('IsOnTrack')

  if (!lapVar || !lapTimeVar) {
    throw new Error(
      'Required channels (Lap, LapLastLapTime) not found. ' +
      'Make sure this is a full iRacing session IBT file, not a replay.'
    )
  }
  if (!fuelVar) {
    throw new Error('FuelLevel channel not found in IBT file')
  }

  // ── 5. Data records ──────────────────────────────────────────────────────────
  const dataOffset = sessionInfoOffset + sessionInfoLen
  const recordCount = recordCountFromHeader > 0
    ? recordCountFromHeader
    : Math.floor((buffer.byteLength - dataOffset) / bufLen)

  if (recordCount <= 0 || dataOffset + recordCount * bufLen > buffer.byteLength) {
    throw new Error('IBT file appears to have no data records or is truncated')
  }

  // Step through every record, detect lap transitions
  const laps: IBTLap[] = []
  let prevLap         = -1
  let fuelAtLapStart  = -1
  let onTrack         = true

  for (let r = 0; r < recordCount; r++) {
    const recBase = dataOffset + r * bufLen
    if (recBase + bufLen > buffer.byteLength) break

    const currentLap = readVarValue(view, recBase, lapVar)
    const fuelLevel  = readVarValue(view, recBase, fuelVar)
    if (onTrackVar) {
      onTrack = readVarValue(view, recBase, onTrackVar) !== 0
    }

    if (prevLap === -1) {
      prevLap = currentLap
      fuelAtLapStart = fuelLevel
      continue
    }

    // Lap just incremented → a lap was completed
    if (currentLap !== prevLap && currentLap > prevLap) {
      const lapTime  = readVarValue(view, recBase, lapTimeVar)
      const fuelUsed = Math.max(0, fuelAtLapStart - fuelLevel)

      // Skip invalid lap times, outlap (lap 0) and pit laps
      const isValidTime = lapTime > 10 && lapTime < 600
      const isNotOutlap = prevLap > 0
      const isValidFuel = fuelUsed >= 0 && fuelUsed < 10

      if (isValidTime && isNotOutlap) {
        laps.push({
          lapNumber: prevLap,
          lapTimeSeconds: Math.round(lapTime * 1000) / 1000,
          fuelUsedLiters: isValidFuel ? Math.round(fuelUsed * 1000) / 1000 : 0,
          fuelAtLapStartLiters: Math.round(fuelAtLapStart * 100) / 100,
        })
      }

      fuelAtLapStart = fuelLevel
      prevLap = currentLap
    }
  }

  if (laps.length === 0) {
    throw new Error(
      'No complete laps found in the IBT file. ' +
      'The session may be too short or only contain an outlap.'
    )
  }

  // ── 6. Compute averages (exclude obvious outlier laps) ───────────────────────
  // Sort lap times, drop slowest 10% (likely yellow/safety car laps)
  const sortedTimes = [...laps].sort((a, b) => a.lapTimeSeconds - b.lapTimeSeconds)
  const keepCount = Math.max(1, Math.floor(sortedTimes.length * 0.9))
  const cleanLaps = sortedTimes.slice(0, keepCount)

  const avgLapTimeSeconds = cleanLaps.reduce((s, l) => s + l.lapTimeSeconds, 0) / cleanLaps.length

  const fuelLaps = cleanLaps.filter((l) => l.fuelUsedLiters > 0.01)
  const avgFuelPerLap =
    fuelLaps.length > 0
      ? fuelLaps.reduce((s, l) => s + l.fuelUsedLiters, 0) / fuelLaps.length
      : 0

  return {
    laps,
    avgLapTimeSeconds: Math.round(avgLapTimeSeconds * 100) / 100,
    avgFuelPerLap: Math.round(avgFuelPerLap * 1000) / 1000,
    totalLaps: laps.length,
    trackName,
    carName,
    driverName,
    tickRate,
  }
}
