import { useState } from 'react'
import { useParams } from 'react-router-dom'
import useRaceStore from '../store/useRaceStore'
import type { Driver, DriverTelemetry } from '../types'
import DriverSurveyModal from '../components/DriverSurveyModal'
import DriverIBTModal from '../components/DriverIBTModal'
import { parseIBTFile } from '../utils/ibtParser'
import type { IBTParseResult } from '../utils/ibtParser'

const DEFAULT_DRIVER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

const TIMEZONES = [
  { label: 'Not set', tz: '' },
  { label: 'UTC', tz: 'UTC' },
  { label: 'ET – New York', tz: 'America/New_York' },
  { label: 'CT – Chicago', tz: 'America/Chicago' },
  { label: 'MT – Denver', tz: 'America/Denver' },
  { label: 'PT – Los Angeles', tz: 'America/Los_Angeles' },
  { label: 'AKT – Anchorage', tz: 'America/Anchorage' },
  { label: 'HT – Honolulu', tz: 'Pacific/Honolulu' },
  { label: 'BRT – São Paulo', tz: 'America/Sao_Paulo' },
  { label: 'GMT – London', tz: 'Europe/London' },
  { label: 'CET – Paris', tz: 'Europe/Paris' },
  { label: 'EET – Helsinki', tz: 'Europe/Helsinki' },
  { label: 'MSK – Moscow', tz: 'Europe/Moscow' },
  { label: 'GST – Dubai', tz: 'Asia/Dubai' },
  { label: 'IST – Kolkata', tz: 'Asia/Kolkata' },
  { label: 'SGT – Singapore', tz: 'Asia/Singapore' },
  { label: 'JST – Tokyo', tz: 'Asia/Tokyo' },
  { label: 'AEST – Sydney', tz: 'Australia/Sydney' },
  { label: 'NZST – Auckland', tz: 'Pacific/Auckland' },
]

function getDriverLocalTime(tz: string): string {
  if (!tz) return ''
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
  } catch {
    return ''
  }
}

function tzLabel(tz: string): string {
  return TIMEZONES.find((t) => t.tz === tz)?.label.split('–')[0].trim() ?? tz
}

interface DriverFormData {
  name: string
  initials: string
  iracingId: string
  irating: string
  color: string
  minStintHours: string
  maxStintHours: string
  rainPreference: 'prefer' | 'neutral' | 'avoid'
  nightPreference: 'prefer' | 'neutral' | 'avoid'
  prefersRaceStart: boolean
  maxConsecutiveStints: string
  availableFromMinute: string
  availableToMinute: string
  timezone: string
}

const emptyDriverForm = (): DriverFormData => ({
  name: '',
  initials: '',
  iracingId: '',
  irating: '2000',
  color: DEFAULT_DRIVER_COLORS[0],
  minStintHours: '0.5',
  maxStintHours: '2',
  rainPreference: 'neutral',
  nightPreference: 'neutral',
  prefersRaceStart: false,
  maxConsecutiveStints: '3',
  availableFromMinute: '0',
  availableToMinute: '9999',
  timezone: '',
})

function parseDriverForm(f: DriverFormData) {
  return {
    name: f.name,
    initials: f.initials,
    iracingId: f.iracingId,
    irating: parseFloat(f.irating) || 0,
    color: f.color,
    minStintMinutes: Math.round((parseFloat(f.minStintHours) || 0) * 60),
    maxStintMinutes: Math.round((parseFloat(f.maxStintHours) || 0) * 60),
    rainPreference: f.rainPreference,
    nightPreference: f.nightPreference,
    prefersRaceStart: f.prefersRaceStart,
    maxConsecutiveStints: parseFloat(f.maxConsecutiveStints) || 3,
    availableFromMinute: parseFloat(f.availableFromMinute) || 0,
    availableToMinute: parseFloat(f.availableToMinute) || 9999,
    timezone: f.timezone,
    notes: '',
  }
}

function driverToForm(driver: Driver): DriverFormData {
  const minH = driver.minStintMinutes / 60
  const maxH = driver.maxStintMinutes / 60
  return {
    name: driver.name,
    initials: driver.initials,
    iracingId: driver.iracingId,
    irating: String(driver.irating),
    color: driver.color,
    minStintHours: String(Number.isInteger(minH) ? minH : minH.toFixed(2).replace(/\.?0+$/, '')),
    maxStintHours: String(Number.isInteger(maxH) ? maxH : maxH.toFixed(2).replace(/\.?0+$/, '')),
    rainPreference: driver.rainPreference ?? 'neutral',
    nightPreference: driver.nightPreference ?? 'neutral',
    prefersRaceStart: driver.prefersRaceStart ?? false,
    maxConsecutiveStints: String(driver.maxConsecutiveStints ?? 3),
    availableFromMinute: String(driver.availableFromMinute ?? 0),
    availableToMinute: String(driver.availableToMinute ?? 9999),
    timezone: driver.timezone ?? '',
  }
}

type PrefValue = 'prefer' | 'neutral' | 'avoid'

function SegmentedPref({
  value,
  onChange,
  label,
}: {
  value: PrefValue
  onChange: (v: PrefValue) => void
  label: string
}) {
  const options: { val: PrefValue; icon: string }[] = [
    { val: 'prefer', icon: label === 'Rain' ? '🌧' : '🌙' },
    { val: 'neutral', icon: '' },
    { val: 'avoid', icon: '' },
  ]
  return (
    <div className="flex rounded-md overflow-hidden border border-gray-700">
      {options.map((opt) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
            value === opt.val
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {opt.icon ? `${opt.icon} ` : ''}
          {opt.val.charAt(0).toUpperCase() + opt.val.slice(1)}
        </button>
      ))}
    </div>
  )
}

function PillToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function DriverPrefBadges({ driver }: { driver: Driver }) {
  const badges: JSX.Element[] = []
  if (driver.rainPreference !== 'neutral') {
    const isPrefer = driver.rainPreference === 'prefer'
    badges.push(
      <span
        key="rain"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${
          isPrefer
            ? 'bg-green-900/50 text-green-400 border-green-800'
            : 'bg-red-900/50 text-red-400 border-red-800'
        }`}
        title={`Rain: ${driver.rainPreference}`}
      >
        🌧
      </span>
    )
  }
  if (driver.nightPreference !== 'neutral') {
    const isPrefer = driver.nightPreference === 'prefer'
    badges.push(
      <span
        key="night"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${
          isPrefer
            ? 'bg-green-900/50 text-green-400 border-green-800'
            : 'bg-red-900/50 text-red-400 border-red-800'
        }`}
        title={`Night: ${driver.nightPreference}`}
      >
        🌙
      </span>
    )
  }
  if (driver.prefersRaceStart) {
    badges.push(
      <span
        key="start"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border bg-yellow-900/50 text-yellow-400 border-yellow-800"
        title="Prefers race start"
      >
        🚦
      </span>
    )
  }
  return <>{badges}</>
}

export default function RaceSetup() {
  const { raceId } = useParams<{ raceId: string }>()
  const { races, updateCar, addDriver, updateDriver, removeDriver } = useRaceStore()

  const race = races.find((r) => r.id === raceId)

  const [carForm, setCarForm] = useState({
    name: race?.car.name ?? '',
    tankSizeLiters: race?.car.tankSizeLiters ?? 70,
    burnRatePerLap: race?.car.burnRatePerLap ?? 3.0,
    avgLapTimeSeconds: race?.car.avgLapTimeSeconds ?? 90,
    tireStintLimitLaps: race?.car.tireStintLimitLaps ?? 40,
  })

  const [driverForm, setDriverForm] = useState<DriverFormData>(emptyDriverForm())
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<DriverFormData>(emptyDriverForm())
  const [carSaved, setCarSaved] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [surveyDriverId, setSurveyDriverId] = useState<string | null>(null)
  const [ibtDriverId, setIbtDriverId] = useState<string | null>(null)
  type TelemetryImport = {
    avgLapTime: number
    avgFuelPerLap: number
    laps: number
    source: string
    trackName?: string
    carName?: string
    driverName?: string
    lapTable?: IBTParseResult['laps']
  }

  const [telemetryImport, setTelemetryImport] = useState<TelemetryImport | null>(null)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)
  const [telemetryDragging, setTelemetryDragging] = useState(false)
  const [showLapTable, setShowLapTable] = useState(false)

  function handleTelemetryFile(file: File) {
    setTelemetryError(null)
    setTelemetryImport(null)
    setShowLapTable(false)

    const isIBT = file.name.toLowerCase().endsWith('.ibt')
    const isCSV = file.name.toLowerCase().endsWith('.csv')

    if (!isIBT && !isCSV) {
      setTelemetryError('Unsupported file type. Please upload an .ibt (iRacing telemetry) or .csv file.')
      return
    }

    if (isIBT) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const result = parseIBTFile(e.target?.result as ArrayBuffer)
          setTelemetryImport({
            avgLapTime: result.avgLapTimeSeconds,
            avgFuelPerLap: result.avgFuelPerLap,
            laps: result.totalLaps,
            source: 'iRacing IBT',
            trackName: result.trackName,
            carName: result.carName,
            driverName: result.driverName,
            lapTable: result.laps,
          })
        } catch (err) {
          setTelemetryError(err instanceof Error ? err.message : 'Failed to parse IBT file')
        }
      }
      reader.onerror = () => setTelemetryError('Failed to read file')
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.trim().split('\n')
          if (lines.length < 2) throw new Error('CSV has no data rows')
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
          const lapTimeIdx = headers.findIndex((h) =>
            h.includes('laptime') || h.includes('lap_time') || h.includes('lap time') || h === 'time'
          )
          if (lapTimeIdx === -1) throw new Error('Could not find a lap time column (expected "LapTime" or similar)')
          const fuelIdx = headers.findIndex((h) =>
            h.includes('fuel') && (h.includes('used') || h.includes('burn') || h.includes('lap') || h.includes('consumption'))
          ) !== -1
            ? headers.findIndex((h) => h.includes('fuel') && (h.includes('used') || h.includes('burn') || h.includes('lap') || h.includes('consumption')))
            : headers.findIndex((h) => h.includes('fuel'))

          const rows = lines.slice(1)
            .map((l) => l.split(',').map((v) => v.trim().replace(/^"|"$/g, '')))
            .filter((r) => r.length > 1)

          const lapTimes: number[] = []
          const fuelPerLap: number[] = []
          for (const row of rows) {
            const raw = row[lapTimeIdx] ?? ''
            let sec = raw.includes(':')
              ? parseInt(raw.split(':')[0]) * 60 + parseFloat(raw.split(':')[1])
              : parseFloat(raw)
            if (sec > 10 && sec < 600) lapTimes.push(sec)
            if (fuelIdx !== -1) {
              const f = parseFloat(row[fuelIdx] ?? '0')
              if (f > 0 && f < 20) fuelPerLap.push(f)
            }
          }
          if (lapTimes.length === 0) throw new Error('No valid lap times found in CSV')
          const avgLap = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length
          const avgFuel = fuelPerLap.length > 0
            ? fuelPerLap.reduce((a, b) => a + b, 0) / fuelPerLap.length : 0
          setTelemetryImport({
            avgLapTime: Math.round(avgLap * 10) / 10,
            avgFuelPerLap: Math.round(avgFuel * 100) / 100,
            laps: lapTimes.length,
            source: 'CSV',
          })
        } catch (err) {
          setTelemetryError(err instanceof Error ? err.message : 'Failed to parse CSV')
        }
      }
      reader.readAsText(file)
    }
  }

  function applyTelemetryImport() {
    if (!telemetryImport) return
    setCarForm((f) => ({
      ...f,
      avgLapTimeSeconds: telemetryImport.avgLapTime,
      ...(telemetryImport.avgFuelPerLap > 0 ? { burnRatePerLap: telemetryImport.avgFuelPerLap } : {}),
      ...(telemetryImport.trackName && !f.name ? { name: telemetryImport.carName ?? f.name } : {}),
    }))
    setTelemetryImport(null)
    setShowLapTable(false)
  }

  if (!race) {
    return (
      <div className="p-8 text-gray-400">Race not found.</div>
    )
  }

  const surveyDriver = surveyDriverId ? race.drivers.find((d) => d.id === surveyDriverId) ?? null : null
  const ibtDriver = ibtDriverId ? race.drivers.find((d) => d.id === ibtDriverId) ?? null : null

  const handleSaveTelemetry = (driverId: string, telemetry: DriverTelemetry) => {
    if (!raceId) return
    updateDriver(raceId, driverId, { telemetry })
    setIbtDriverId(null)
  }

  const handleApplyTeamAverage = () => {
    if (!raceId) return
    const withData = race.drivers.filter((d) => d.telemetry)
    if (withData.length === 0) return
    const avgLap = withData.reduce((s, d) => s + d.telemetry!.avgLapTimeSeconds, 0) / withData.length
    const avgFuel = withData.reduce((s, d) => s + d.telemetry!.avgFuelPerLap, 0) / withData.length
    setCarForm((f) => ({
      ...f,
      avgLapTimeSeconds: Math.round(avgLap * 100) / 100,
      ...(avgFuel > 0 ? { burnRatePerLap: Math.round(avgFuel * 1000) / 1000 } : {}),
    }))
  }

  const handleSaveCar = () => {
    if (!raceId) return
    updateCar(raceId, carForm)
    setCarSaved(true)
    setTimeout(() => setCarSaved(false), 2000)
  }

  const handleAddDriver = () => {
    if (!raceId || !driverForm.name.trim()) return
    const parsed = parseDriverForm(driverForm)
    addDriver(raceId, {
      ...parsed,
      name: parsed.name.trim(),
      initials: parsed.initials.trim() || parsed.name.slice(0, 2).toUpperCase(),
    })
    const nextColor = DEFAULT_DRIVER_COLORS[(race.drivers.length + 1) % DEFAULT_DRIVER_COLORS.length]
    setDriverForm({ ...emptyDriverForm(), color: nextColor })
    setShowAdvanced(false)
  }

  const handleStartEdit = (driver: Driver) => {
    setEditingDriverId(driver.id)
    setEditForm(driverToForm(driver))
  }

  const handleSaveEdit = (driverId: string) => {
    if (!raceId) return
    updateDriver(raceId, driverId, parseDriverForm(editForm))
    setEditingDriverId(null)
  }

  const handleRemoveDriver = (driverId: string) => {
    if (!raceId) return
    if (confirm('Remove this driver?')) {
      removeDriver(raceId, driverId)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Race Setup</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Car Details */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Car Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Car Name</label>
              <input
                type="text"
                value={carForm.name}
                onChange={(e) => setCarForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Porsche 911 GT3 R"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tank Size (L)</label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={carForm.tankSizeLiters}
                  onChange={(e) =>
                    setCarForm((f) => ({ ...f, tankSizeLiters: Number(e.target.value) }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Burn Rate (L/lap)</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={carForm.burnRatePerLap}
                  onChange={(e) =>
                    setCarForm((f) => ({ ...f, burnRatePerLap: Number(e.target.value) }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Avg Lap Time (sec)</label>
                <input
                  type="number"
                  min={30}
                  value={carForm.avgLapTimeSeconds}
                  onChange={(e) =>
                    setCarForm((f) => ({ ...f, avgLapTimeSeconds: Number(e.target.value) }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tire Stint Limit (laps)</label>
                <input
                  type="number"
                  min={1}
                  value={carForm.tireStintLimitLaps}
                  onChange={(e) =>
                    setCarForm((f) => ({ ...f, tireStintLimitLaps: Number(e.target.value) }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            {/* Telemetry Import (IBT / CSV) */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Import Telemetry
                </span>
                <div className="flex gap-1">
                  <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-800 rounded px-1.5 py-0.5">.ibt</span>
                  <span className="text-xs bg-gray-800 text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">.csv</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Drop an iRacing <strong className="text-gray-400">.ibt</strong> telemetry file to auto-fill lap time &amp; fuel burn.
                CSV exports also accepted.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setTelemetryDragging(true) }}
                onDragLeave={() => setTelemetryDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setTelemetryDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleTelemetryFile(file)
                }}
                className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
                  telemetryDragging
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-1">📂</div>
                <p className="text-sm text-gray-400">Drop <span className="text-blue-400 font-medium">.ibt</span> or .csv here</p>
                <p className="text-xs text-gray-600 mt-1">iRacing saves IBT files in Documents/iRacing/telemetry/</p>
                <label className="mt-3 inline-block cursor-pointer px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-xs transition-colors">
                  Browse file
                  <input
                    type="file"
                    accept=".ibt,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleTelemetryFile(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              {telemetryError && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
                  ✕ {telemetryError}
                </div>
              )}

              {telemetryImport && (
                <div className="mt-2 bg-green-900/20 border border-green-700 rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-green-400 font-semibold">
                        ✓ {telemetryImport.laps} laps parsed — {telemetryImport.source}
                      </p>
                      {telemetryImport.trackName && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {telemetryImport.trackName}
                          {telemetryImport.carName ? ` · ${telemetryImport.carName}` : ''}
                          {telemetryImport.driverName ? ` · ${telemetryImport.driverName}` : ''}
                        </p>
                      )}
                    </div>
                    {telemetryImport.lapTable && (
                      <button
                        onClick={() => setShowLapTable((v) => !v)}
                        className="text-xs text-gray-400 hover:text-white underline"
                      >
                        {showLapTable ? 'Hide laps' : 'Show laps'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-800 rounded p-2">
                      <div className="text-gray-500">Avg Lap Time</div>
                      <div className="text-white font-mono font-bold text-base">{telemetryImport.avgLapTime}s</div>
                    </div>
                    {telemetryImport.avgFuelPerLap > 0 && (
                      <div className="bg-gray-800 rounded p-2">
                        <div className="text-gray-500">Avg Fuel / Lap</div>
                        <div className="text-white font-mono font-bold text-base">{telemetryImport.avgFuelPerLap} L</div>
                      </div>
                    )}
                  </div>

                  {/* Lap table */}
                  {showLapTable && telemetryImport.lapTable && (
                    <div className="max-h-40 overflow-y-auto rounded border border-gray-700">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-700 bg-gray-800/80">
                            <th className="text-left px-2 py-1">Lap</th>
                            <th className="text-right px-2 py-1">Time</th>
                            <th className="text-right px-2 py-1">Fuel Used</th>
                          </tr>
                        </thead>
                        <tbody>
                          {telemetryImport.lapTable.map((lap) => (
                            <tr key={lap.lapNumber} className="border-b border-gray-800 hover:bg-gray-800/40">
                              <td className="px-2 py-1 text-gray-400 font-mono">{lap.lapNumber}</td>
                              <td className="px-2 py-1 text-right font-mono text-white">{lap.lapTimeSeconds.toFixed(3)}s</td>
                              <td className="px-2 py-1 text-right font-mono text-blue-300">
                                {lap.fuelUsedLiters > 0 ? `${lap.fuelUsedLiters.toFixed(3)} L` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={applyTelemetryImport}
                      className="flex-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      Apply to Car Setup
                    </button>
                    <button
                      onClick={() => { setTelemetryImport(null); setShowLapTable(false) }}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-xs transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {race.drivers.some((d) => d.telemetry) && (
                <button
                  onClick={handleApplyTeamAverage}
                  className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors"
                  title={`Average from ${race.drivers.filter((d) => d.telemetry).length} driver IBT file(s)`}
                >
                  Apply Team Avg ({race.drivers.filter((d) => d.telemetry).length} IBT)
                </button>
              )}
              <button
                onClick={handleSaveCar}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                {carSaved ? '✓ Saved!' : 'Save Car Details'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Driver Roster */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Driver Roster</h2>

          {/* Driver Table */}
          {race.drivers.length > 0 ? (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2 pr-3">Color</th>
                    <th className="text-left pb-2 pr-3">Name</th>
                    <th className="text-left pb-2 pr-3">Initials</th>
                    <th className="text-right pb-2 pr-3">iRating</th>
                    <th className="text-right pb-2 pr-3">Stint (h)</th>
                    <th className="text-left pb-2 pr-3">Timezone</th>
                    <th className="text-left pb-2 pr-3">Prefs</th>
                    <th className="text-right pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {race.drivers.map((driver) =>
                    editingDriverId === driver.id ? (
                      <tr key={driver.id} className="bg-gray-800/50">
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1 w-24">
                            {DEFAULT_DRIVER_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditForm((f) => ({ ...f, color: c }))}
                                className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                                style={{
                                  backgroundColor: c,
                                  outline: editForm.color === c ? '2px solid white' : 'none',
                                  outlineOffset: 1,
                                }}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-28 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={editForm.initials}
                            maxLength={3}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, initials: e.target.value }))
                            }
                            className="w-16 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <input
                            type="number"
                            value={editForm.irating}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, irating: e.target.value }))
                            }
                            className="w-20 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 text-right"
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <div className="flex gap-1 justify-end items-center">
                            <input
                              type="number"
                              min={0}
                              step={0.25}
                              value={editForm.minStintHours}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, minStintHours: e.target.value }))
                              }
                              className="w-14 bg-gray-800 border border-gray-600 text-white rounded px-1 py-1 text-xs focus:outline-none focus:border-blue-500 text-right"
                            />
                            <span className="text-gray-500">–</span>
                            <input
                              type="number"
                              min={0.25}
                              step={0.25}
                              value={editForm.maxStintHours}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, maxStintHours: e.target.value }))
                              }
                              className="w-14 bg-gray-800 border border-gray-600 text-white rounded px-1 py-1 text-xs focus:outline-none focus:border-blue-500 text-right"
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={editForm.timezone}
                            onChange={(e) => setEditForm((f) => ({ ...f, timezone: e.target.value }))}
                            className="w-36 bg-gray-800 border border-gray-600 text-white rounded px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                          >
                            {TIMEZONES.map((t) => (
                              <option key={t.tz} value={t.tz}>{t.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <DriverPrefBadges driver={{ ...driver, ...parseDriverForm(editForm) }} />
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleSaveEdit(driver.id)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingDriverId(null)}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={driver.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-2 pr-3">
                          <span
                            className="block w-5 h-5 rounded-full"
                            style={{ backgroundColor: driver.color }}
                          />
                        </td>
                        <td className="py-2 pr-3 text-gray-200">{driver.name}</td>
                        <td className="py-2 pr-3 text-gray-400 font-mono">{driver.initials}</td>
                        <td className="py-2 pr-3 text-right text-gray-200 font-mono">
                          {driver.irating.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-400 font-mono text-xs">
                          {(driver.minStintMinutes / 60).toFixed(driver.minStintMinutes % 60 === 0 ? 0 : 1)}h
                          {' – '}
                          {(driver.maxStintMinutes / 60).toFixed(driver.maxStintMinutes % 60 === 0 ? 0 : 1)}h
                        </td>
                        <td className="py-2 pr-3">
                          {driver.timezone ? (
                            <div className="flex flex-col">
                              <span className="text-gray-300 text-xs">{tzLabel(driver.timezone)}</span>
                              <span className="text-gray-500 text-xs font-mono">{getDriverLocalTime(driver.timezone)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <DriverPrefBadges driver={driver} />
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            <button
                              onClick={() => setIbtDriverId(driver.id)}
                              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                driver.telemetry
                                  ? 'bg-green-900/40 border border-green-800 text-green-400 hover:bg-green-800/50'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                              }`}
                              title={driver.telemetry
                                ? `IBT loaded: ${driver.telemetry.totalLaps} laps, avg ${driver.telemetry.avgLapTimeSeconds}s`
                                : 'Upload IBT telemetry file'}
                            >
                              {driver.telemetry ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                  IBT
                                </>
                              ) : (
                                '↑ IBT'
                              )}
                            </button>
                            <button
                              onClick={() => setSurveyDriverId(driver.id)}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs transition-colors"
                              title="Open survey/availability form"
                            >
                              📋
                            </button>
                            <button
                              onClick={() => handleStartEdit(driver)}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRemoveDriver(driver.id)}
                              className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-4">No drivers yet. Add your first driver below.</p>
          )}

          {/* Add Driver Form */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Add Driver</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Driver Name"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Initials</label>
                  <input
                    type="text"
                    value={driverForm.initials}
                    maxLength={3}
                    onChange={(e) => setDriverForm((f) => ({ ...f, initials: e.target.value }))}
                    placeholder="ABC"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">iRacing ID</label>
                  <input
                    type="text"
                    value={driverForm.iracingId}
                    onChange={(e) => setDriverForm((f) => ({ ...f, iracingId: e.target.value }))}
                    placeholder="123456"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">iRating</label>
                  <input
                    type="number"
                    value={driverForm.irating}
                    onChange={(e) =>
                      setDriverForm((f) => ({ ...f, irating: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DEFAULT_DRIVER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDriverForm((f) => ({ ...f, color: c }))}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: driverForm.color === c ? '2px solid white' : 'none',
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Stint (hrs)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={driverForm.minStintHours}
                    onChange={(e) =>
                      setDriverForm((f) => ({ ...f, minStintHours: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Stint (hrs)</label>
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={driverForm.maxStintHours}
                    onChange={(e) =>
                      setDriverForm((f) => ({ ...f, maxStintHours: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Timezone</label>
                <select
                  value={driverForm.timezone}
                  onChange={(e) => setDriverForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {TIMEZONES.map((t) => (
                    <option key={t.tz} value={t.tz}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Advanced Preferences Section */}
              <div className="border border-gray-700 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-medium transition-colors text-left"
                >
                  <span>{showAdvanced ? '▾' : '▸'}</span>
                  <span>Advanced Preferences</span>
                </button>
                {showAdvanced && (
                  <div className="px-3 py-3 space-y-3 bg-gray-800/50">
                    {/* Availability Window */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Availability Window</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Available From (min)</label>
                          <input
                            type="number"
                            min={0}
                            value={driverForm.availableFromMinute}
                            onChange={(e) =>
                              setDriverForm((f) => ({ ...f, availableFromMinute: e.target.value }))
                            }
                            className="w-full bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Available To (min)</label>
                          <input
                            type="number"
                            min={0}
                            value={driverForm.availableToMinute}
                            onChange={(e) =>
                              setDriverForm((f) => ({ ...f, availableToMinute: e.target.value }))
                            }
                            className="w-full bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-600 mt-0.5">Use 9999 for end of race</p>
                        </div>
                      </div>
                    </div>

                    {/* Rain Preference */}
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-gray-400 w-28 flex-shrink-0">Rain Preference</label>
                      <div className="flex-1">
                        <SegmentedPref
                          label="Rain"
                          value={driverForm.rainPreference}
                          onChange={(v) => setDriverForm((f) => ({ ...f, rainPreference: v }))}
                        />
                      </div>
                    </div>

                    {/* Night Preference */}
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-gray-400 w-28 flex-shrink-0">Night Preference</label>
                      <div className="flex-1">
                        <SegmentedPref
                          label="Night"
                          value={driverForm.nightPreference}
                          onChange={(v) => setDriverForm((f) => ({ ...f, nightPreference: v }))}
                        />
                      </div>
                    </div>

                    {/* Prefers Race Start */}
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-gray-400">Prefers Race Start</label>
                      <PillToggle
                        checked={driverForm.prefersRaceStart}
                        onChange={(v) => setDriverForm((f) => ({ ...f, prefersRaceStart: v }))}
                      />
                    </div>

                    {/* Max Consecutive Stints */}
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-gray-400 w-28 flex-shrink-0">Max Consecutive Stints</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={driverForm.maxConsecutiveStints}
                        onChange={(e) =>
                          setDriverForm((f) => ({ ...f, maxConsecutiveStints: e.target.value }))
                        }
                        className="w-20 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddDriver}
                disabled={!driverForm.name.trim()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
              >
                Add Driver
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Survey Modal */}
      {surveyDriver && raceId && (
        <DriverSurveyModal
          driver={surveyDriver}
          raceId={raceId}
          onClose={() => setSurveyDriverId(null)}
        />
      )}

      {ibtDriver && (
        <DriverIBTModal
          driver={ibtDriver}
          onSave={(telemetry) => handleSaveTelemetry(ibtDriver.id, telemetry)}
          onClose={() => setIbtDriverId(null)}
        />
      )}
    </div>
  )
}
