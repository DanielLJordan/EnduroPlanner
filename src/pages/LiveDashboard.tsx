import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import useRaceStore from '../store/useRaceStore'
import PitStopModal from '../components/PitStopModal'
import { formatTime, minutesToHHMM } from '../utils/time'
import type { PitStop } from '../types'
import { useNavigate } from 'react-router-dom'

// ── iRacing WebSocket bridge types ────────────────────────────────────────────
type IRacingConnState = 'disconnected' | 'connecting' | 'connected' | 'iracing_offline'

interface IRacingTelemetry {
  SessionTime?: number      // seconds into current session
  FuelLevel?: number        // liters
  Lap?: number
  IsOnTrack?: boolean
  PlayerCarPosition?: number
  SessionState?: number     // 1=getInCar 2=warmup 3=parade 4=racing 5=checkered 6=cooldown
  SessionFlags?: number
}

interface IRacingMessage {
  type: 'telemetry' | 'session' | 'ping' | 'status'
  data?: IRacingTelemetry
  connected?: boolean       // iRacing process is running
}

export default function LiveDashboard() {
  const { raceId } = useParams<{ raceId: string }>()
  const navigate = useNavigate()
  const {
    races,
    startRace,
    pauseRace,
    updateElapsed,
    updateRace,
    addIncident,
    deleteIncident,
    addPitStop,
    updateStint,
  } = useRaceStore()

  const race = races.find((r) => r.id === raceId)
  const [incidentNote, setIncidentNote] = useState('')
  const [showPitModal, setShowPitModal] = useState(false)
  const [pitStintId, setPitStintId] = useState<string>('')
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())
  const [showRecalcWarning, setShowRecalcWarning] = useState(false)

  // ── iRacing live connection ─────────────────────────────────────────────────
  const [irConnState, setIrConnState] = useState<IRacingConnState>('disconnected')
  const [irLiveSync, setIrLiveSync] = useState(false)   // auto-update elapsed from iRacing
  const [irTelemetry, setIrTelemetry] = useState<IRacingTelemetry | null>(null)
  const [irWsUrl, setIrWsUrl] = useState('ws://localhost:8182')
  const [showIrSettings, setShowIrSettings] = useState(false)
  const [irLiveFuel, setIrLiveFuel] = useState<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const irSessionStartRef = useRef<number | null>(null)   // SessionTime when race started

  const connectToIRacing = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    setIrConnState('connecting')
    const ws = new WebSocket(irWsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIrConnState('connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg: IRacingMessage = JSON.parse(event.data)
        if (msg.type === 'status') {
          if (msg.connected === false) setIrConnState('iracing_offline')
          else if (msg.connected === true) setIrConnState('connected')
        }
        if (msg.type === 'telemetry' && msg.data) {
          const t = msg.data
          setIrTelemetry(t)
          if (t.FuelLevel !== undefined) setIrLiveFuel(t.FuelLevel)

          // Live sync: update race elapsed from iRacing SessionTime
          if (irLiveSync && raceId && t.SessionTime !== undefined) {
            if (irSessionStartRef.current === null) {
              irSessionStartRef.current = t.SessionTime
            }
            const delta = Math.floor(t.SessionTime - irSessionStartRef.current)
            if (delta >= 0) updateElapsed(raceId, delta)
          }
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      setIrConnState('disconnected')
    }

    ws.onclose = () => {
      if (irConnState !== 'disconnected') setIrConnState('disconnected')
      wsRef.current = null
    }
  }, [irWsUrl, irLiveSync, raceId, updateElapsed, irConnState])

  const disconnectFromIRacing = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setIrConnState('disconnected')
    setIrTelemetry(null)
    setIrLiveFuel(null)
    irSessionStartRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => wsRef.current?.close()
  }, [])

  const IR_CONN_STYLES: Record<IRacingConnState, string> = {
    disconnected: 'bg-gray-700 text-gray-400',
    connecting: 'bg-yellow-900/50 text-yellow-400',
    connected: 'bg-green-900/50 text-green-400',
    iracing_offline: 'bg-orange-900/50 text-orange-400',
  }
  const IR_CONN_LABEL: Record<IRacingConnState, string> = {
    disconnected: 'Not connected',
    connecting: 'Connecting…',
    connected: 'iRacing Live',
    iracing_offline: 'iRacing offline',
  }

  const elapsed = race?.raceState.elapsedSeconds ?? 0
  const isRunning = race?.raceState.isRunning ?? false
  const totalSeconds = (race?.durationHours ?? 0) * 3600
  const remaining = Math.max(0, totalSeconds - elapsed)
  const elapsedMinutes = elapsed / 60

  // 1-second interval
  useEffect(() => {
    if (!isRunning || !raceId) return
    const interval = setInterval(() => {
      updateElapsed(raceId, elapsed + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, elapsed, raceId, updateElapsed])

  // Spacebar to toggle
  const handleSpacebar = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!raceId) return
        if (isRunning) {
          pauseRace(raceId)
        } else {
          startRace(raceId)
        }
      }
    },
    [isRunning, raceId, startRace, pauseRace]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleSpacebar)
    return () => window.removeEventListener('keydown', handleSpacebar)
  }, [handleSpacebar])

  if (!race) {
    return <div className="p-8 text-gray-400">Race not found.</div>
  }

  const progressPct = totalSeconds > 0 ? Math.min((elapsed / totalSeconds) * 100, 100) : 0

  // Current active stint
  const activeStint = race.stints.find((s) => s.status === 'active')
  const currentDriver = activeStint
    ? race.drivers.find((d) => d.id === activeStint.driverId)
    : null

  // If no active stint, find scheduled stint covering current elapsed time
  const currentScheduledStint = !activeStint
    ? race.stints.find(
        (s) =>
          s.status === 'scheduled' &&
          s.plannedStartMinute <= elapsedMinutes &&
          s.plannedStartMinute + s.plannedDurationMinutes > elapsedMinutes
      )
    : null

  const displayStint = activeStint ?? currentScheduledStint
  const displayDriver = displayStint
    ? race.drivers.find((d) => d.id === displayStint.driverId)
    : null

  // Stint time
  const stintElapsedMinutes = activeStint
    ? elapsedMinutes - (activeStint.actualStartMinute ?? activeStint.plannedStartMinute)
    : displayStint
    ? elapsedMinutes - displayStint.plannedStartMinute
    : 0
  const stintRemainingMinutes = displayStint
    ? displayStint.plannedDurationMinutes - stintElapsedMinutes
    : 0

  const stintNearEnd =
    displayDriver &&
    stintRemainingMinutes <= 5 &&
    stintRemainingMinutes >= 0

  // Next driver
  const sortedScheduled = race.stints
    .filter((s) => s.status === 'scheduled' && s.plannedStartMinute > elapsedMinutes)
    .sort((a, b) => a.plannedStartMinute - b.plannedStartMinute)
  const nextStint = sortedScheduled[0]
  const nextDriver = nextStint ? race.drivers.find((d) => d.id === nextStint.driverId) : null
  const nextStartsInMinutes = nextStint ? nextStint.plannedStartMinute - elapsedMinutes : null

  // Fuel estimation — use live iRacing data if available
  const lapTimeMin = race.car.avgLapTimeSeconds / 60
  const lapsDone = lapTimeMin > 0 ? Math.floor(elapsedMinutes / lapTimeMin) : 0
  const fuelUsed = lapsDone * race.car.burnRatePerLap
  const estimatedFuel = Math.max(0, (displayStint?.fuelLoad ?? race.car.tankSizeLiters) - fuelUsed)
  const currentFuel = irLiveFuel !== null ? irLiveFuel : estimatedFuel
  const lapsRemainingFuel =
    race.car.burnRatePerLap > 0 ? Math.floor(currentFuel / race.car.burnRatePerLap) : 0
  const fuelPct = race.car.tankSizeLiters > 0 ? (currentFuel / race.car.tankSizeLiters) * 100 : 0

  // Upcoming stints (next 3)
  const upcomingStints = sortedScheduled.slice(0, 3)

  // Stints ending check - stints that should be ending now
  const stintsEndingSoon = race.stints.filter((s) => {
    const endMinute = s.plannedStartMinute + s.plannedDurationMinutes
    return (
      s.status !== 'completed' &&
      endMinute <= elapsedMinutes &&
      endMinute > elapsedMinutes - 5 &&
      !dismissedBanners.has(s.id)
    )
  })

  const handleToggleRace = () => {
    if (!raceId) return
    if (isRunning) {
      pauseRace(raceId)
    } else {
      startRace(raceId)
    }
  }

  const handleLogIncident = () => {
    if (!raceId || !incidentNote.trim()) return
    addIncident(raceId, {
      minute: Math.floor(elapsedMinutes),
      note: incidentNote.trim(),
    })
    setIncidentNote('')

    // Check if any scheduled stints extend beyond next fuel window by more than 10 minutes
    if (race) {
      const lapTimeMin = race.car.avgLapTimeSeconds / 60
      const fuelStintMinutes =
        race.car.burnRatePerLap > 0 && lapTimeMin > 0
          ? Math.floor((race.car.tankSizeLiters * 0.9) / race.car.burnRatePerLap) * lapTimeMin
          : 0

      if (fuelStintMinutes > 0) {
        const currentElapsedMin = elapsed / 60
        // Next fuel window from current position
        const nextFuelWindow =
          Math.ceil((currentElapsedMin + 1) / fuelStintMinutes) * fuelStintMinutes

        const futureStints = race.stints.filter(
          (s) => s.status === 'scheduled' && s.plannedStartMinute >= currentElapsedMin
        )

        const hasOverrun = futureStints.some((s) => {
          const stintEnd = s.plannedStartMinute + s.plannedDurationMinutes
          return stintEnd > nextFuelWindow + 10
        })

        if (hasOverrun) {
          setShowRecalcWarning(true)
        }
      }
    }
  }

  const handlePitStop = (stintId: string) => {
    setPitStintId(stintId)
    setShowPitModal(true)
  }

  const handleSavePitStop = (data: Omit<PitStop, 'id'>) => {
    if (!raceId) return
    addPitStop(raceId, data)
    // Mark stint as completed
    updateStint(raceId, data.stintId, { status: 'completed' })
    setShowPitModal(false)
  }

  const handleMarkActive = (stintId: string) => {
    if (!raceId) return
    updateStint(raceId, stintId, {
      status: 'active',
      actualStartMinute: Math.floor(elapsedMinutes),
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Live Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* iRacing connection badge */}
          <button
            onClick={() => setShowIrSettings((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${IR_CONN_STYLES[irConnState]}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                irConnState === 'connected'
                  ? 'bg-green-400 animate-pulse'
                  : irConnState === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : irConnState === 'iracing_offline'
                  ? 'bg-orange-400'
                  : 'bg-gray-500'
              }`}
            />
            {IR_CONN_LABEL[irConnState]}
          </button>
          <div className="text-xs text-gray-500">SPACE to start/pause</div>
        </div>
      </div>

      {/* iRacing connection settings panel */}
      {showIrSettings && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">iRacing Live Connection</h3>
            <button
              onClick={() => setShowIrSettings(false)}
              className="text-gray-500 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Connect to a local{' '}
            <a
              href="https://github.com/apiirodsde/node-irsdk"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline"
            >
              node-irsdk
            </a>{' '}
            bridge server to sync live telemetry (fuel level, session time, lap count) directly from iRacing.
          </p>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">WebSocket URL</label>
              <input
                type="text"
                value={irWsUrl}
                onChange={(e) => setIrWsUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                placeholder="ws://localhost:8182"
              />
            </div>
            {irConnState === 'disconnected' || irConnState === 'iracing_offline' ? (
              <button
                onClick={connectToIRacing}
                className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={disconnectFromIRacing}
                className="mt-5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Live sync toggle */}
          {irConnState === 'connected' && (
            <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800 rounded-md">
              <div className="flex-1">
                <div className="text-sm text-green-300 font-medium">Live Time Sync</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Override race timer with iRacing SessionTime. Click Start to set the sync point.
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !irLiveSync
                  setIrLiveSync(next)
                  if (next) {
                    irSessionStartRef.current = null  // reset sync anchor on enable
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  irLiveSync
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {irLiveSync ? 'Sync ON' : 'Sync OFF'}
              </button>
            </div>
          )}

          {/* Live telemetry data preview */}
          {irTelemetry && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { label: 'Session Time', value: irTelemetry.SessionTime !== undefined ? formatTime(Math.floor(irTelemetry.SessionTime)) : '—' },
                { label: 'Fuel', value: irTelemetry.FuelLevel !== undefined ? `${irTelemetry.FuelLevel.toFixed(1)} L` : '—' },
                { label: 'Lap', value: irTelemetry.Lap !== undefined ? String(irTelemetry.Lap) : '—' },
                { label: 'Position', value: irTelemetry.PlayerCarPosition !== undefined ? `P${irTelemetry.PlayerCarPosition}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-800 rounded-md p-2 text-center">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className="font-mono text-sm text-white">{value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 p-3 bg-gray-800 rounded-md">
            <p className="text-xs text-gray-500 font-mono">
              Bridge setup: <span className="text-gray-300">npm install -g node-irsdk && irsdkserver</span>
            </p>
          </div>
        </div>
      )}

      {/* Stint ending banners */}
      {stintsEndingSoon.map((stint) => {
        const driver = race.drivers.find((d) => d.id === stint.driverId)
        return (
          <div
            key={stint.id}
            className="bg-orange-900/40 border border-orange-500 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-orange-400 text-xl">⚠️</span>
              <div>
                <p className="text-orange-300 font-semibold">
                  Stint ending! {driver?.name ?? 'Unknown driver'}
                </p>
                <p className="text-orange-400/70 text-sm">Mark as complete and log pit stop?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePitStop(stint.id)}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm transition-colors"
              >
                Log Pit Stop
              </button>
              <button
                onClick={() => setDismissedBanners((p) => new Set([...p, stint.id]))}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )
      })}

      {/* Incident-triggered recalculation warning */}
      {showRecalcWarning && (
        <div className="bg-yellow-900/40 border border-yellow-500 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 text-xl">⚠️</span>
            <p className="text-yellow-300 text-sm font-medium">
              Strategy recalculation needed: incident may affect fuel windows. Check Scheduler.
            </p>
          </div>
          <button
            onClick={() => setShowRecalcWarning(false)}
            className="text-yellow-500 hover:text-yellow-300 text-sm px-3 py-1 rounded border border-yellow-700 hover:border-yellow-500 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP ROW: Race Clock */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-10">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Elapsed</div>
              <div className="text-5xl font-mono font-bold text-white tabular-nums">{formatTime(elapsed)}</div>
            </div>
            <div className="w-px bg-gray-800" />
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Remaining</div>
              <div
                className={`text-5xl font-mono font-bold tabular-nums ${
                  remaining < 3600 ? 'text-red-400' : remaining < 7200 ? 'text-yellow-400' : 'text-white'
                }`}
              >
                {formatTime(remaining)}
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleRace}
            className={`flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-white text-base transition-all shadow-lg ${
              isRunning
                ? 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-900/30'
                : 'bg-green-600 hover:bg-green-700 shadow-green-900/30'
            }`}
          >
            {isRunning ? (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                </svg>
                Start Race
              </>
            )}
          </button>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1.5">
          <span>0:00:00</span>
          <span className="text-gray-400 font-medium">{progressPct.toFixed(1)}% complete</span>
          <span>{formatTime(totalSeconds)}</span>
        </div>
      </div>

      {/* MIDDLE ROW: Driver cards + fuel */}
      <div className="grid grid-cols-3 gap-4">
        {/* Current Driver */}
        <div
          className="bg-gray-900 border-2 rounded-xl p-5 relative overflow-hidden"
          style={{ borderColor: displayDriver ? displayDriver.color + '60' : '#1f2937' }}
        >
          {displayDriver && (
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{ background: `radial-gradient(circle at top left, ${displayDriver.color}, transparent 60%)` }}
            />
          )}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Driver</span>
            {displayStint && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeStint ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-gray-700 text-gray-400'
              }`}>
                {activeStint ? 'ACTIVE' : 'SCHEDULED'}
              </span>
            )}
          </div>

          {displayDriver ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: displayDriver.color }}
                >
                  {displayDriver.initials}
                </div>
                <div>
                  <div className="font-bold text-white text-lg leading-tight">{displayDriver.name}</div>
                  <div className="text-xs text-gray-500">iR {displayDriver.irating.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-500 mb-0.5">Elapsed</div>
                  <div className="font-mono text-white font-semibold">
                    {Math.max(0, Math.floor(stintElapsedMinutes))} min
                  </div>
                </div>
                <div className={`rounded-lg p-2.5 ${stintNearEnd ? 'bg-red-900/30' : 'bg-gray-800/50'}`}>
                  <div className="text-xs text-gray-500 mb-0.5">Remaining</div>
                  <div className={`font-mono font-bold ${stintNearEnd ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {Math.max(0, Math.floor(stintRemainingMinutes))} min
                  </div>
                </div>
              </div>

              {stintNearEnd && (
                <div className="mt-3 bg-red-900/20 border border-red-800 rounded-lg p-2.5">
                  <p className="text-red-400 text-xs font-semibold flex items-center gap-1.5">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                      <path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"/>
                    </svg>
                    Within 5 min of max stint time!
                  </p>
                </div>
              )}

              {displayStint && !activeStint && (
                <button
                  onClick={() => handleMarkActive(displayStint.id)}
                  className="mt-3 w-full py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-sm transition-colors"
                >
                  Mark Active
                </button>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-sm mt-4">No active driver</div>
          )}
        </div>

        {/* Next Driver (On Deck) */}
        <div
          className="bg-gray-900 border-2 rounded-xl p-5"
          style={{ borderColor: nextDriver ? nextDriver.color + '40' : '#1f2937' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">On Deck</span>
            {nextDriver && (
              <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800 px-2 py-0.5 rounded-full font-bold">
                ON DECK
              </span>
            )}
          </div>

          {nextDriver ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: nextDriver.color }}
                >
                  {nextDriver.initials}
                </div>
                <div>
                  <div className="font-bold text-white text-lg leading-tight">{nextDriver.name}</div>
                  <div className="text-xs text-gray-500">iR {nextDriver.irating.toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-2.5">
                <div className="text-xs text-gray-500 mb-0.5">Starts In</div>
                <div className="font-mono text-white font-bold text-xl">
                  {nextStartsInMinutes !== null
                    ? `${Math.max(0, Math.floor(nextStartsInMinutes))} min`
                    : '—'}
                </div>
                {nextStint && (
                  <div className="text-xs text-gray-600 mt-0.5">
                    at {minutesToHHMM(nextStint.plannedStartMinute)} · {nextStint.plannedDurationMinutes} min stint
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-600 text-sm mt-4">No upcoming driver</div>
          )}
        </div>

        {/* Fuel Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fuel Status</span>
            {irLiveFuel !== null ? (
              <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full font-bold">
                LIVE
              </span>
            ) : (
              <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">estimated</span>
            )}
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Current Level</span>
              <span className="text-white font-mono font-bold">{currentFuel.toFixed(1)} L</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  fuelPct < 20 ? 'bg-red-500' : fuelPct < 40 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${fuelPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{fuelPct.toFixed(0)}% full</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="text-xs text-gray-500 mb-0.5">Laps Remaining</div>
              <div className="font-mono text-white font-semibold">{lapsRemainingFuel}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="text-xs text-gray-500 mb-0.5">Pit Window</div>
              <div className="font-mono text-white text-sm font-semibold">
                {lapTimeMin > 0 && lapsRemainingFuel > 0
                  ? minutesToHHMM(Math.floor(elapsedMinutes + lapsRemainingFuel * lapTimeMin))
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Upcoming stints + Incidents */}
      <div className="grid grid-cols-2 gap-4">
        {/* Upcoming Stints */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Upcoming Stints</h2>
          {upcomingStints.length === 0 ? (
            <p className="text-gray-600 text-sm">No upcoming stints scheduled.</p>
          ) : (
            <div className="space-y-1.5">
              {upcomingStints.map((stint, idx) => {
                const driver = race.drivers.find((d) => d.id === stint.driverId)
                return (
                  <div
                    key={stint.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors"
                  >
                    <span className="text-gray-600 font-mono text-xs w-4 text-center font-bold">{idx + 1}</span>
                    {driver && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: driver.color }}
                      />
                    )}
                    <div className="flex-1">
                      <span className="text-gray-200 text-sm font-medium">{driver?.name ?? 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white font-semibold">
                        {minutesToHHMM(stint.plannedStartMinute)}
                      </div>
                      <div className="text-xs text-gray-600">{stint.plannedDurationMinutes} min</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Incident Log */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Incident Log</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={incidentNote}
              onChange={(e) => setIncidentNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogIncident()}
              placeholder="Describe incident… (Enter to log)"
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleLogIncident}
              disabled={!incidentNote.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Log
            </button>
          </div>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {race.raceState.incidents.length === 0 ? (
              <p className="text-gray-600 text-sm">No incidents logged.</p>
            ) : (
              [...race.raceState.incidents]
                .sort((a, b) => b.minute - a.minute)
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-gray-800/40 transition-colors group"
                  >
                    <span className="font-mono text-gray-600 text-xs flex-shrink-0 mt-0.5 bg-gray-800 px-1.5 py-0.5 rounded">
                      {minutesToHHMM(incident.minute)}
                    </span>
                    <span className="text-gray-300 text-sm flex-1">{incident.note}</span>
                    <button
                      onClick={() => raceId && deleteIncident(raceId, incident.id)}
                      className="text-gray-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Team Notes + Debrief link row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team Notes</h2>
          <textarea
            value={race.teamNotes ?? ''}
            onChange={(e) => raceId && updateRace(raceId, { teamNotes: e.target.value })}
            placeholder="Strategy notes, driver messages, team reminders…"
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-gray-600"
          />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/race/${raceId}/debrief`)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors text-left"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-500">
                  <path fillRule="evenodd" d="M4 1a1 1 0 011-1h6a1 1 0 011 1v1h1a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1h1V1zm5 9.5a.5.5 0 01-.5.5h-2a.5.5 0 010-1H7V8a.5.5 0 011 0v1.5h.5a.5.5 0 01.5.5zm-2-6a.5.5 0 000 1h3a.5.5 0 000-1H7z" clipRule="evenodd"/>
                </svg>
                View Race Debrief
              </button>
              <button
                onClick={() => navigate(`/race/${raceId}/scheduler`)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors text-left"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-500">
                  <path d="M3.5 0a.5.5 0 01.5.5V1h8V.5a.5.5 0 011 0V1h1a2 2 0 012 2v11a2 2 0 01-2 2H2a2 2 0 01-2-2V3a2 2 0 012-2h1V.5a.5.5 0 01.5-.5zM1 4v10a1 1 0 001 1h12a1 1 0 001-1V4H1z"/>
                </svg>
                Adjust Schedule
              </button>
              <button
                onClick={() => navigate(`/race/${raceId}/pitstops`)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors text-left"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-gray-500">
                  <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319z"/>
                </svg>
                Pit Stop Log
              </button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-600 text-center">
              {race.stints.filter(s => s.status === 'completed').length}/{race.stints.length} stints completed
            </div>
          </div>
        </div>
      </div>

      {/* Pit Stop Modal */}
      {showPitModal && (
        <PitStopModal
          stintId={pitStintId}
          currentMinute={Math.floor(elapsedMinutes)}
          onSave={handleSavePitStop}
          onClose={() => setShowPitModal(false)}
        />
      )}
    </div>
  )
}
