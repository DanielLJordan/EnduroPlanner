import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import useRaceStore from '../store/useRaceStore'
import StintEditModal from '../components/StintEditModal'
import type { Stint, RaceEvent, Driver } from '../types'
import { minutesToHHMM } from '../utils/time'

const PX_PER_HOUR = 120
const ROW_HEIGHT = 68
const HEADER_HEIGHT = 40
const LABEL_WIDTH = 140

interface ValidationWarning {
  type: 'overlap' | 'max_stint' | 'min_stint' | 'gap' | 'coverage' | 'availability'
  message: string
}

type StrategyMode = 'pace' | 'efficiency' | 'consistency'

// ────────────────────────────────────────────────────────────────────────────────
// Strategy generators
// ────────────────────────────────────────────────────────────────────────────────

function calcFuelStintMinutes(race: RaceEvent): number {
  if (race.car.burnRatePerLap > 0 && race.car.avgLapTimeSeconds > 0) {
    return (
      Math.floor((race.car.tankSizeLiters * 0.9) / race.car.burnRatePerLap) *
      (race.car.avgLapTimeSeconds / 60)
    )
  }
  return 60
}

function clampStintDuration(
  duration: number,
  driver: Driver,
  fuelMax: number,
  remaining: number
): number {
  let d = Math.min(duration, driver.maxStintMinutes, fuelMax, remaining)
  d = Math.max(d, Math.min(driver.minStintMinutes, remaining))
  return Math.max(d, 1)
}

function generatePaceStints(race: RaceEvent, variantMultiplier: number): Stint[] {
  const totalMinutes = race.durationHours * 60
  const fuelMax = calcFuelStintMinutes(race)
  const drivers = [...race.drivers].sort((a, b) => b.irating - a.irating)
  if (drivers.length === 0) return []

  // Higher-rated drivers get longer stints and more stints
  // Top driver gets 1.3x base, bottom gets 0.8x base
  const baseMinutes = Math.min(fuelMax, 90) * variantMultiplier
  const stints: Stint[] = []
  let currentMinute = 0
  let pass = 0

  // Build a weighted rotation: top driver appears more often
  const rotation: Driver[] = []
  drivers.forEach((d, i) => {
    const weight = Math.max(1, drivers.length - i)
    for (let w = 0; w < weight; w++) {
      rotation.push(d)
    }
  })

  // Prefer race-start drivers at the beginning
  const startPref = drivers.find((d) => d.prefersRaceStart)
  if (startPref) {
    const idx = rotation.findIndex((d) => d.id === startPref.id)
    if (idx > 0) {
      rotation.splice(idx, 1)
      rotation.unshift(startPref)
    }
  }

  let rotIdx = 0
  while (currentMinute < totalMinutes) {
    const driver = rotation[rotIdx % rotation.length]
    const remaining = totalMinutes - currentMinute

    // Scale stint length by irating rank within drivers array
    const rank = drivers.findIndex((d) => d.id === driver.id)
    const rankFactor = 1.3 - (rank / Math.max(drivers.length - 1, 1)) * 0.5
    const duration = clampStintDuration(
      Math.round(baseMinutes * rankFactor),
      driver,
      fuelMax,
      remaining
    )

    stints.push({
      id: `gen-pace-${pass}-${rotIdx}`,
      driverId: driver.id,
      plannedStartMinute: currentMinute,
      plannedDurationMinutes: Math.round(duration),
      fuelLoad: race.car.tankSizeLiters,
      tireSet: `Set ${Math.floor(pass / drivers.length) + 1}`,
      notes: '',
      status: 'scheduled',
    })

    currentMinute += duration
    rotIdx++
    pass++
    if (duration <= 0) break
  }
  return stints
}

function generateEfficiencyStints(race: RaceEvent, variantMultiplier: number): Stint[] {
  const totalMinutes = race.durationHours * 60
  const fuelMax = calcFuelStintMinutes(race)
  const drivers = race.drivers
  if (drivers.length === 0) return []

  const baseStint = Math.round(fuelMax * variantMultiplier)
  const stints: Stint[] = []
  let currentMinute = 0
  let driverIdx = 0

  while (currentMinute < totalMinutes) {
    const driver = drivers[driverIdx % drivers.length]
    const remaining = totalMinutes - currentMinute
    const duration = clampStintDuration(baseStint, driver, fuelMax, remaining)

    stints.push({
      id: `gen-eff-${driverIdx}`,
      driverId: driver.id,
      plannedStartMinute: currentMinute,
      plannedDurationMinutes: Math.round(duration),
      fuelLoad: race.car.tankSizeLiters,
      tireSet: `Set ${Math.floor(driverIdx / drivers.length) + 1}`,
      notes: '',
      status: 'scheduled',
    })

    currentMinute += duration
    driverIdx++
    if (duration <= 0) break
  }
  return stints
}

function generateConsistencyStints(race: RaceEvent, variantMultiplier: number): Stint[] {
  const totalMinutes = race.durationHours * 60
  const fuelMax = calcFuelStintMinutes(race)
  const drivers = race.drivers
  if (drivers.length === 0) return []

  const fairShare = totalMinutes / drivers.length
  const nightStartMinute = race.durationHours >= 6 ? 360 : 9999

  // Build a sorted rotation: prefer night drivers for late stints
  const stints: Stint[] = []
  let currentMinute = 0

  // Start: prefer race-start drivers at minute 0
  const startPrefDrivers = drivers.filter((d) => d.prefersRaceStart)
  const otherDrivers = drivers.filter((d) => !d.prefersRaceStart)
  const orderedDrivers = [...startPrefDrivers, ...otherDrivers]

  let driverIdx = 0
  let pass = 0
  const baseStint = Math.round(Math.min(fairShare, fuelMax) * variantMultiplier)

  while (currentMinute < totalMinutes) {
    const isNight = currentMinute >= nightStartMinute

    // Pick best available driver for current time segment
    let chosenDriver: Driver
    if (isNight) {
      const nightPref = orderedDrivers.find((d, i) => {
        if (i !== driverIdx % orderedDrivers.length) return false
        return d.nightPreference === 'prefer'
      })
      chosenDriver = nightPref ?? orderedDrivers[driverIdx % orderedDrivers.length]
    } else {
      chosenDriver = orderedDrivers[driverIdx % orderedDrivers.length]
    }

    const remaining = totalMinutes - currentMinute
    const duration = clampStintDuration(baseStint, chosenDriver, fuelMax, remaining)

    stints.push({
      id: `gen-cons-${pass}-${driverIdx}`,
      driverId: chosenDriver.id,
      plannedStartMinute: currentMinute,
      plannedDurationMinutes: Math.round(duration),
      fuelLoad: race.car.tankSizeLiters,
      tireSet: `Set ${Math.floor(pass / orderedDrivers.length) + 1}`,
      notes: '',
      status: 'scheduled',
    })

    currentMinute += duration
    driverIdx++
    pass++
    if (duration <= 0) break
  }
  return stints
}

function generateStintsForMode(
  race: RaceEvent,
  mode: StrategyMode,
  variantMultiplier: number
): Stint[] {
  if (mode === 'pace') return generatePaceStints(race, variantMultiplier)
  if (mode === 'efficiency') return generateEfficiencyStints(race, variantMultiplier)
  return generateConsistencyStints(race, variantMultiplier)
}

// ────────────────────────────────────────────────────────────────────────────────
// Preference badges (shared inline helper)
// ────────────────────────────────────────────────────────────────────────────────

function DriverPrefBadges({ driver }: { driver: Driver }) {
  return (
    <div className="flex gap-0.5 flex-wrap">
      {driver.rainPreference !== 'neutral' && (
        <span
          className={`inline-flex items-center px-1 py-0.5 rounded text-xs border ${
            driver.rainPreference === 'prefer'
              ? 'bg-green-900/50 text-green-400 border-green-800'
              : 'bg-red-900/50 text-red-400 border-red-800'
          }`}
          title={`Rain: ${driver.rainPreference}`}
        >
          🌧
        </span>
      )}
      {driver.nightPreference !== 'neutral' && (
        <span
          className={`inline-flex items-center px-1 py-0.5 rounded text-xs border ${
            driver.nightPreference === 'prefer'
              ? 'bg-green-900/50 text-green-400 border-green-800'
              : 'bg-red-900/50 text-red-400 border-red-800'
          }`}
          title={`Night: ${driver.nightPreference}`}
        >
          🌙
        </span>
      )}
      {driver.prefersRaceStart && (
        <span
          className="inline-flex items-center px-1 py-0.5 rounded text-xs border bg-yellow-900/50 text-yellow-400 border-yellow-800"
          title="Prefers race start"
        >
          🚦
        </span>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────────

export default function StintScheduler() {
  const { raceId } = useParams<{ raceId: string }>()
  const { races, addStint, updateStint, deleteStint } = useRaceStore()

  const race = races.find((r) => r.id === raceId)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedStint, setSelectedStint] = useState<Stint | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showStrategyPanel, setShowStrategyPanel] = useState(false)
  const [strategyMode, setStrategyMode] = useState<StrategyMode>('consistency')
  const [generatedVariants, setGeneratedVariants] = useState<Stint[][] | null>(null)
  const [exportCopied, setExportCopied] = useState(false)
  const [activeVariantTab, setActiveVariantTab] = useState<0 | 1 | 2>(0)
  const [showFuelWindows, setShowFuelWindows] = useState(true)
  const timelineRef = useRef<HTMLDivElement>(null)

  if (!race) {
    return <div className="p-8 text-gray-400">Race not found.</div>
  }

  const totalMinutes = race.durationHours * 60
  const timelineWidth = race.durationHours * PX_PER_HOUR
  const elapsedMinutes = race.raceState.elapsedSeconds / 60
  const nowX = LABEL_WIDTH + (elapsedMinutes / totalMinutes) * timelineWidth

  const ticks: number[] = []
  for (let m = 0; m <= totalMinutes; m += 30) {
    ticks.push(m)
  }

  const fuelStintMinutes = calcFuelStintMinutes(race)

  const fuelWindowMarkers: number[] = []
  if (fuelStintMinutes > 0) {
    for (let m = fuelStintMinutes; m < totalMinutes; m += fuelStintMinutes) {
      fuelWindowMarkers.push(m)
    }
  }

  const fairShareMinutes = race.drivers.length > 0 ? totalMinutes / race.drivers.length : totalMinutes

  const handleStintClick = (stint: Stint) => {
    setSelectedStint(stint)
    setModalMode('edit')
    setShowModal(true)
  }

  const handleAddStint = () => {
    setSelectedStint(null)
    setModalMode('create')
    setShowModal(true)
  }

  const handleExportSchedule = () => {
    if (!race) return
    const sorted = [...race.stints].sort((a, b) => a.plannedStartMinute - b.plannedStartMinute)
    const lines: string[] = [
      `STINT SCHEDULE — ${race.name}`,
      `Track: ${race.track} | Duration: ${race.durationHours}h | Drivers: ${race.drivers.length}`,
      '═'.repeat(60),
      `${'#'.padEnd(4)}${'Driver'.padEnd(18)}${'Start'.padEnd(8)}${'End'.padEnd(8)}${'Duration'.padEnd(10)}Status`,
      '─'.repeat(60),
    ]
    sorted.forEach((stint, i) => {
      const driver = race.drivers.find((d) => d.id === stint.driverId)
      const end = stint.plannedStartMinute + stint.plannedDurationMinutes
      lines.push(
        `${String(i + 1).padEnd(4)}${(driver?.name ?? 'Unknown').padEnd(18)}${minutesToHHMM(stint.plannedStartMinute).padEnd(8)}${minutesToHHMM(end).padEnd(8)}${String(stint.plannedDurationMinutes + ' min').padEnd(10)}${stint.status}`
      )
    })
    lines.push('─'.repeat(60))
    lines.push(`Total stints: ${sorted.length} | Generated: ${new Date().toLocaleString()}`)

    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2000)
    })
  }

  const handleSaveStint = (stintData: Omit<Stint, 'id'> | Stint) => {
    if (!raceId) return
    if (modalMode === 'edit' && 'id' in stintData) {
      updateStint(raceId, stintData.id, stintData)
    } else {
      addStint(raceId, stintData as Omit<Stint, 'id'>)
    }
    setShowModal(false)
  }

  const handleDeleteStint = (stintId: string) => {
    if (!raceId) return
    deleteStint(raceId, stintId)
  }

  const handleGenerateVariants = () => {
    // A = standard (1.0), B = +10% (1.1), C = -10% (0.9)
    const multipliers = [1.0, 1.1, 0.9]
    const variants = multipliers.map((m) => generateStintsForMode(race, strategyMode, m))
    setGeneratedVariants(variants)
    setActiveVariantTab(0)
  }

  const handleApplyVariant = (variantStints: Stint[]) => {
    if (!raceId) return
    race.stints.forEach((s) => deleteStint(raceId, s.id))
    variantStints.forEach((s) => {
      const { id: _id, ...rest } = s
      addStint(raceId, { ...rest, id: uuidv4() } as Omit<Stint, 'id'>)
    })
    setShowStrategyPanel(false)
    setGeneratedVariants(null)
  }

  // ── Validation ────────────────────────────────────────────────────────────────
  const warnings: ValidationWarning[] = []

  race.drivers.forEach((driver) => {
    const driverStints = race.stints
      .filter((s) => s.driverId === driver.id)
      .sort((a, b) => a.plannedStartMinute - b.plannedStartMinute)

    const availFrom = driver.availableFromMinute ?? 0
    const availTo = Math.min(driver.availableToMinute ?? 9999, totalMinutes)

    driverStints.forEach((stint) => {
      if (stint.plannedDurationMinutes > driver.maxStintMinutes) {
        warnings.push({
          type: 'max_stint',
          message: `${driver.name}: Stint at ${minutesToHHMM(stint.plannedStartMinute)} exceeds max stint time (${driver.maxStintMinutes} min)`,
        })
      }
      if (stint.plannedDurationMinutes < driver.minStintMinutes) {
        warnings.push({
          type: 'min_stint',
          message: `${driver.name}: Stint at ${minutesToHHMM(stint.plannedStartMinute)} is below min stint time (${driver.minStintMinutes} min)`,
        })
      }
      if (
        stint.plannedStartMinute < availFrom ||
        stint.plannedStartMinute + stint.plannedDurationMinutes > availTo + 1
      ) {
        warnings.push({
          type: 'availability',
          message: `${driver.name}: Stint at ${minutesToHHMM(stint.plannedStartMinute)} is outside their availability window (${minutesToHHMM(availFrom)}–${availTo >= totalMinutes ? 'end' : minutesToHHMM(availTo)})`,
        })
      }

      driverStints.forEach((other) => {
        if (other.id === stint.id) return
        const aStart = stint.plannedStartMinute
        const aEnd = aStart + stint.plannedDurationMinutes
        const bStart = other.plannedStartMinute
        const bEnd = bStart + other.plannedDurationMinutes
        if (aStart < bEnd && aEnd > bStart && stint.id < other.id) {
          warnings.push({
            type: 'overlap',
            message: `${driver.name}: Overlapping stints at ${minutesToHHMM(aStart)} and ${minutesToHHMM(bStart)}`,
          })
        }
      })
    })
  })

  const sortedStints = [...race.stints].sort(
    (a, b) => a.plannedStartMinute - b.plannedStartMinute
  )
  if (sortedStints.length > 0) {
    if (sortedStints[0].plannedStartMinute > 0) {
      warnings.push({
        type: 'coverage',
        message: `Race coverage gap: 0:00 to ${minutesToHHMM(sortedStints[0].plannedStartMinute)} has no driver assigned`,
      })
    }
    for (let i = 0; i < sortedStints.length - 1; i++) {
      const current = sortedStints[i]
      const next = sortedStints[i + 1]
      const currentEnd = current.plannedStartMinute + current.plannedDurationMinutes
      if (next.plannedStartMinute > currentEnd + 120) {
        warnings.push({
          type: 'gap',
          message: `Large gap (>2h): ${minutesToHHMM(currentEnd)} to ${minutesToHHMM(next.plannedStartMinute)}`,
        })
      }
    }
    const lastStint = sortedStints[sortedStints.length - 1]
    const lastEnd = lastStint.plannedStartMinute + lastStint.plannedDurationMinutes
    if (lastEnd < totalMinutes) {
      warnings.push({
        type: 'coverage',
        message: `Race coverage gap: ${minutesToHHMM(lastEnd)} to end of race`,
      })
    }
  } else {
    warnings.push({
      type: 'coverage',
      message: 'No stints scheduled. Add stints to cover the full race.',
    })
  }

  const totalStints = race.stints.length
  const totalDriveMinutes = race.stints.reduce((sum, s) => sum + s.plannedDurationMinutes, 0)

  const strategyModes: { id: StrategyMode; label: string; desc: string; icon: string }[] = [
    {
      id: 'pace',
      label: 'Pace',
      icon: '🏆',
      desc: 'Best iRating drivers get the most driving time and prime hours',
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      icon: '⛽',
      desc: 'Stint length = exact fuel window. Minimises pit stops',
    },
    {
      id: 'consistency',
      label: 'Consistency',
      icon: '⚖️',
      desc: 'Equal driving time for all. Respects night/rain preferences',
    },
  ]

  const variantLabels = ['A — Standard', 'B — +10% stints', 'C — −10% stints']

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Stint Scheduler</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSchedule}
            disabled={race.stints.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 hover:text-white rounded-md text-sm font-medium transition-colors"
            title="Copy schedule to clipboard"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M4 1.5H3a2 2 0 00-2 2V14a2 2 0 002 2h10a2 2 0 002-2V3.5a2 2 0 00-2-2h-1v1h1a1 1 0 011 1V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5a1 1 0 011-1h1v-1z"/><path d="M9.5 1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h3zm-3-1A1.5 1.5 0 005 1.5v1A1.5 1.5 0 006.5 4h3A1.5 1.5 0 0011 2.5v-1A1.5 1.5 0 009.5 0h-3z"/>
            </svg>
            {exportCopied ? 'Copied!' : 'Export'}
          </button>
          <button
            onClick={() => {
              setShowStrategyPanel((v) => !v)
              setGeneratedVariants(null)
            }}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            ✨ Generate Strategy
          </button>
          <button
            onClick={handleAddStint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + Add Stint
          </button>
        </div>
      </div>

      {/* ── Strategy Generation Panel ─────────────────────────────────────────── */}
      {showStrategyPanel && (
        <div className="bg-gray-900 border border-purple-800 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-purple-300">Auto-Generate Strategy</h2>
            <button
              onClick={() => {
                setShowStrategyPanel(false)
                setGeneratedVariants(null)
              }}
              className="text-gray-500 hover:text-gray-300 text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Mode selection cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {strategyModes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setStrategyMode(m.id)
                  setGeneratedVariants(null)
                }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  strategyMode === m.id
                    ? 'border-purple-500 bg-purple-900/40 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="text-xl mb-1">{m.icon}</div>
                <div className="font-semibold text-sm mb-1">{m.label}</div>
                <div className="text-xs opacity-70">{m.desc}</div>
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateVariants}
            disabled={race.drivers.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-md text-sm font-medium transition-colors mb-4"
          >
            Generate Variants A / B / C
          </button>

          {race.drivers.length === 0 && (
            <p className="text-yellow-500 text-xs mb-4">Add drivers in Race Setup first.</p>
          )}

          {/* Variant A/B/C tabs + previews */}
          {generatedVariants && (
            <div>
              {/* Tabs */}
              <div className="flex gap-1 mb-3 border-b border-gray-700 pb-2">
                {variantLabels.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVariantTab(idx as 0 | 1 | 2)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeVariantTab === idx
                        ? 'bg-purple-700 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Active variant preview */}
              {(() => {
                const variantStints = generatedVariants[activeVariantTab]
                const totalVariantMinutes = variantStints.reduce(
                  (s, st) => s + st.plannedDurationMinutes,
                  0
                )
                const avgDuration =
                  variantStints.length > 0
                    ? Math.round(totalVariantMinutes / variantStints.length)
                    : 0
                const usedDriverIds = new Set(variantStints.map((s) => s.driverId))
                return (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    {/* Mini timeline */}
                    <div
                      className="relative bg-gray-950 rounded overflow-hidden mb-4"
                      style={{ width: '100%', height: 48 }}
                    >
                      {variantStints.map((stint) => {
                        const driver = race.drivers.find((d) => d.id === stint.driverId)
                        const leftPct = (stint.plannedStartMinute / totalMinutes) * 100
                        const widthPct = (stint.plannedDurationMinutes / totalMinutes) * 100
                        return (
                          <div
                            key={stint.id}
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 0.5)}%`,
                              top: 6,
                              bottom: 6,
                              backgroundColor: driver?.color ?? '#6b7280',
                              borderRadius: 3,
                              opacity: 0.9,
                            }}
                            title={`${driver?.initials ?? '?'} — ${stint.plannedDurationMinutes} min`}
                          />
                        )
                      })}
                      {showFuelWindows &&
                        fuelWindowMarkers.map((m) => (
                          <div
                            key={m}
                            style={{
                              position: 'absolute',
                              left: `${(m / totalMinutes) * 100}%`,
                              top: 0,
                              bottom: 0,
                              width: 1,
                              backgroundColor: '#eab308',
                              opacity: 0.5,
                            }}
                          />
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Stints</div>
                        <div className="text-lg font-bold text-white">{variantStints.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Avg Duration</div>
                        <div className="text-lg font-bold text-white">{avgDuration}m</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Drivers Used</div>
                        <div className="text-lg font-bold text-white">{usedDriverIds.size}</div>
                      </div>
                    </div>

                    {/* Driver minutes breakdown */}
                    <div className="space-y-1 mb-4">
                      {race.drivers.map((d) => {
                        const mins = variantStints
                          .filter((s) => s.driverId === d.id)
                          .reduce((sum, s) => sum + s.plannedDurationMinutes, 0)
                        const pct = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0
                        return (
                          <div key={d.id} className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: d.color }}
                            />
                            <span className="text-xs text-gray-400 w-16 truncate">{d.initials}</span>
                            <div className="flex-1 h-1.5 bg-gray-700 rounded overflow-hidden">
                              <div
                                className="h-full rounded"
                                style={{ width: `${pct}%`, backgroundColor: d.color }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">{mins}m</span>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => handleApplyVariant(variantStints)}
                      className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Apply Variant {String.fromCharCode(65 + activeVariantTab)}
                    </button>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Race Info Bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Race Duration</div>
          <div className="text-2xl font-bold text-white font-mono">{race.durationHours}h</div>
          <div className="text-xs text-gray-400 mt-1">{totalMinutes} minutes total</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Stints Scheduled</div>
          <div className="text-2xl font-bold text-white font-mono">{totalStints}</div>
          <div className="text-xs text-gray-400 mt-1">{totalDriveMinutes} min planned</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Drivers</div>
          <div className="text-2xl font-bold text-white font-mono">{race.drivers.length}</div>
          <div className="text-xs text-gray-400 mt-1">
            {race.drivers.map((d) => d.initials).join(', ') || 'None added'}
          </div>
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-400">Timeline</h2>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showFuelWindows}
              onChange={(e) => setShowFuelWindows(e.target.checked)}
              className="w-3.5 h-3.5 accent-yellow-500"
            />
            Show Fuel Windows
          </label>
        </div>

        {race.drivers.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            Add drivers in Race Setup to begin scheduling stints.
          </div>
        ) : (
          <div className="overflow-x-auto" ref={timelineRef}>
            <div
              style={{
                width: LABEL_WIDTH + timelineWidth + 20,
                position: 'relative',
              }}
            >
              {/* Header row (time axis) */}
              <div
                style={{
                  height: HEADER_HEIGHT,
                  position: 'relative',
                  marginLeft: LABEL_WIDTH,
                }}
                className="border-b border-gray-700 mb-1"
              >
                {ticks.map((tick) => {
                  const x = (tick / totalMinutes) * timelineWidth
                  return (
                    <div
                      key={tick}
                      style={{ position: 'absolute', left: x, top: 0, transform: 'translateX(-50%)' }}
                      className="flex flex-col items-center"
                    >
                      <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                        {minutesToHHMM(tick)}
                      </span>
                      <div className="w-px h-2 bg-gray-700 mt-1" />
                    </div>
                  )
                })}
              </div>

              {/* Fuel windows overlay row */}
              {showFuelWindows && fuelWindowMarkers.length > 0 && (
                <div
                  style={{
                    height: 28,
                    position: 'relative',
                    marginLeft: LABEL_WIDTH,
                    marginBottom: 4,
                  }}
                  className="border-b border-gray-800"
                >
                  {fuelWindowMarkers.map((m) => {
                    const x = (m / totalMinutes) * timelineWidth
                    return (
                      <div
                        key={m}
                        style={{
                          position: 'absolute',
                          left: x,
                          top: 0,
                          bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          className="text-yellow-400 text-xs whitespace-nowrap font-medium"
                          style={{ transform: 'translateX(-50%)', lineHeight: '16px' }}
                        >
                          ⛽ Pit
                        </span>
                        <div
                          style={{
                            flex: 1,
                            width: 1,
                            borderLeft: '1px dashed #eab308',
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Driver rows */}
              {race.drivers.map((driver) => {
                const driverStints = race.stints.filter((s) => s.driverId === driver.id)
                const allocatedMinutes = driverStints.reduce(
                  (sum, s) => sum + s.plannedDurationMinutes,
                  0
                )
                const availFrom = driver.availableFromMinute ?? 0
                const availTo = Math.min(driver.availableToMinute ?? 9999, totalMinutes)
                const unavailBeforeX = availFrom > 0
                  ? (availFrom / totalMinutes) * timelineWidth
                  : 0
                const unavailAfterStart =
                  availTo < totalMinutes
                    ? (availTo / totalMinutes) * timelineWidth
                    : timelineWidth
                const stripeStyle =
                  'repeating-linear-gradient(45deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 4px, transparent 4px, transparent 8px)'

                return (
                  <div
                    key={driver.id}
                    style={{ height: ROW_HEIGHT, position: 'relative', display: 'flex', alignItems: 'center' }}
                    className="border-b border-gray-800/50"
                  >
                    {/* Driver label */}
                    <div
                      style={{ width: LABEL_WIDTH, flexShrink: 0 }}
                      className="flex items-start gap-2 pr-3 py-1"
                    >
                      {/* Fair share mini bar */}
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: driver.color }}
                        />
                        <div
                          className="w-3 rounded-sm overflow-hidden bg-gray-700"
                          style={{ height: 28 }}
                          title={`Allocated: ${allocatedMinutes}m / Fair share: ${Math.round(fairShareMinutes)}m`}
                        >
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: `${Math.min((allocatedMinutes / fairShareMinutes) * 100, 100)}%`,
                                backgroundColor:
                                  allocatedMinutes > fairShareMinutes * 1.05
                                    ? '#ef4444'
                                    : driver.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-300 truncate block">{driver.initials}</span>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {allocatedMinutes}m/{Math.round(fairShareMinutes)}m
                        </span>
                        <DriverPrefBadges driver={driver} />
                      </div>
                    </div>

                    {/* Timeline track */}
                    <div
                      style={{ width: timelineWidth, height: ROW_HEIGHT, position: 'relative' }}
                      className="bg-gray-950/30"
                    >
                      {/* Hour grid lines */}
                      {Array.from({ length: race.durationHours + 1 }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: i * PX_PER_HOUR,
                            top: 0,
                            bottom: 0,
                            width: 1,
                            backgroundColor: '#1f2937',
                          }}
                        />
                      ))}

                      {/* Unavailability shading: before availFrom */}
                      {availFrom > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: unavailBeforeX,
                            bottom: 0,
                            background: stripeStyle,
                            backgroundColor: 'rgba(17,24,39,0.7)',
                            pointerEvents: 'none',
                            zIndex: 1,
                          }}
                        />
                      )}

                      {/* Unavailability shading: after availTo */}
                      {availTo < totalMinutes && (
                        <div
                          style={{
                            position: 'absolute',
                            left: unavailAfterStart,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            background: stripeStyle,
                            backgroundColor: 'rgba(17,24,39,0.7)',
                            pointerEvents: 'none',
                            zIndex: 1,
                          }}
                        />
                      )}

                      {/* Fuel window dashed lines inside driver rows */}
                      {showFuelWindows &&
                        fuelWindowMarkers.map((m) => {
                          const x = (m / totalMinutes) * timelineWidth
                          return (
                            <div
                              key={m}
                              style={{
                                position: 'absolute',
                                left: x,
                                top: 0,
                                bottom: 0,
                                width: 1,
                                borderLeft: '1px dashed #eab308',
                                opacity: 0.35,
                                pointerEvents: 'none',
                              }}
                            />
                          )
                        })}

                      {/* Stint blocks */}
                      {driverStints.map((stint) => {
                        const left = (stint.plannedStartMinute / totalMinutes) * timelineWidth
                        const width = (stint.plannedDurationMinutes / totalMinutes) * timelineWidth
                        const isActive = stint.status === 'active'
                        const isCompleted = stint.status === 'completed'
                        return (
                          <div
                            key={stint.id}
                            onClick={() => handleStintClick(stint)}
                            style={{
                              position: 'absolute',
                              left,
                              width: Math.max(width, 4),
                              top: 8,
                              bottom: 8,
                              backgroundColor: driver.color,
                              opacity: isCompleted ? 0.5 : 1,
                              border: isActive ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                              borderRadius: 4,
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              paddingLeft: 4,
                              gap: 4,
                              zIndex: 2,
                            }}
                            title={`${driver.name} — ${stint.plannedDurationMinutes} min`}
                          >
                            {width > 40 && (
                              <span className="text-white text-xs font-semibold whitespace-nowrap overflow-hidden">
                                {driver.initials}
                              </span>
                            )}
                            {width > 70 && (
                              <span className="text-white/80 text-xs whitespace-nowrap">
                                {stint.plannedDurationMinutes}m
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* "Now" indicator */}
              {race.raceState.isRunning && elapsedMinutes > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: nowX,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: '#ef4444',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{ position: 'absolute', top: 0, left: -16 }}
                    className="text-red-400 text-xs font-bold bg-red-900/50 px-1 rounded"
                  >
                    NOW
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Fair Share Monitor ────────────────────────────────────────────────── */}
      {race.drivers.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Fair Share Monitor</h2>
          <div className="space-y-2">
            {race.drivers.map((driver) => {
              const allocatedMinutes = race.stints
                .filter((s) => s.driverId === driver.id)
                .reduce((sum, s) => sum + s.plannedDurationMinutes, 0)
              const ratio = fairShareMinutes > 0 ? allocatedMinutes / fairShareMinutes : 0
              const pct = Math.round(ratio * 100)

              const availFrom = driver.availableFromMinute ?? 0
              const availTo = driver.availableToMinute ?? 9999
              const violatesAvail = race.stints
                .filter((s) => s.driverId === driver.id)
                .some(
                  (s) =>
                    s.plannedStartMinute < availFrom ||
                    s.plannedStartMinute + s.plannedDurationMinutes > Math.min(availTo, totalMinutes) + 1
                )

              let barColor: string
              let labelColor: string
              if (violatesAvail || ratio < 0.6 || ratio > 1.5) {
                barColor = '#ef4444'
                labelColor = 'text-red-400'
              } else if (ratio < 0.8 || ratio > 1.2) {
                barColor = '#eab308'
                labelColor = 'text-yellow-400'
              } else {
                barColor = '#22c55e'
                labelColor = 'text-green-400'
              }

              const barWidth = Math.min(ratio, 1) * 100
              const overflowWidth = ratio > 1 ? Math.min((ratio - 1), 0.5) * 100 : 0

              return (
                <div key={driver.id} className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: driver.color }}
                  />
                  <span className="text-xs text-gray-300 w-20 truncate">{driver.name}</span>
                  <div className="flex-1 h-3 bg-gray-700 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded-l absolute left-0 top-0"
                      style={{ width: `${barWidth}%`, backgroundColor: driver.color }}
                    />
                    {overflowWidth > 0 && (
                      <div
                        className="h-full absolute top-0"
                        style={{
                          left: `${barWidth}%`,
                          width: `${overflowWidth}%`,
                          backgroundColor: '#ef4444',
                        }}
                      />
                    )}
                    {/* Fair share tick */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                      style={{ left: '100%', transform: 'translateX(-50%)' }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-14 text-right ${labelColor}`}>
                    {pct}% fair
                  </span>
                  <span className="text-xs text-gray-600 w-20 text-right">
                    {allocatedMinutes}m / {Math.round(fairShareMinutes)}m
                  </span>
                  <DriverPrefBadges driver={driver} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Validation Warnings ───────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-yellow-400 mb-3">
            ⚠️ Schedule Warnings ({warnings.length})
          </h2>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-sm px-3 py-2 rounded-md ${
                  w.type === 'overlap' || w.type === 'coverage'
                    ? 'bg-red-900/20 text-red-400'
                    : w.type === 'gap'
                    ? 'bg-orange-900/20 text-orange-400'
                    : w.type === 'availability'
                    ? 'bg-purple-900/20 text-purple-400'
                    : 'bg-yellow-900/20 text-yellow-400'
                }`}
              >
                <span className="flex-shrink-0">
                  {w.type === 'overlap' || w.type === 'coverage'
                    ? '🔴'
                    : w.type === 'gap'
                    ? '🟠'
                    : w.type === 'availability'
                    ? '🟣'
                    : '🟡'}
                </span>
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length === 0 && race.stints.length > 0 && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
          <p className="text-green-400 text-sm">✓ Schedule looks good! No warnings.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <StintEditModal
          stint={selectedStint}
          drivers={race.drivers}
          mode={modalMode}
          onSave={handleSaveStint}
          onDelete={handleDeleteStint}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
