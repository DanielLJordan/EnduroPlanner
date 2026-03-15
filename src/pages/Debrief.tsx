import { useParams, useNavigate } from 'react-router-dom'
import useRaceStore from '../store/useRaceStore'
import { formatTime, minutesToHHMM, secondsToMMSS } from '../utils/time'
import type { Driver, Stint, PitStop } from '../types'

const AVG_PIT_TARGET = 30

function pct(val: number, total: number) {
  return total > 0 ? Math.min((val / total) * 100, 100) : 0
}

function HighlightCard({
  icon,
  label,
  value,
  sub,
  color = 'text-white',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-500">{icon}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Debrief() {
  const { raceId } = useParams<{ raceId: string }>()
  const navigate = useNavigate()
  const { races } = useRaceStore()
  const race = races.find((r) => r.id === raceId)

  if (!race) {
    return <div className="p-8 text-gray-400">Race not found.</div>
  }

  const totalMinutes = race.durationHours * 60
  const elapsedMinutes = race.raceState.elapsedSeconds / 60
  const completedStints = race.stints.filter((s) => s.status === 'completed')
  const scheduledStints = race.stints.filter((s) => s.status !== 'completed')
  const fairShareMinutes = race.drivers.length > 0 ? totalMinutes / race.drivers.length : 0

  // Pit stop stats
  const pitStops = [...race.pitStops].sort((a, b) => a.minute - b.minute)
  const totalPitSeconds = pitStops.reduce((s, p) => s + p.durationSeconds, 0)
  const avgPitSeconds = pitStops.length > 0 ? totalPitSeconds / pitStops.length : 0
  const bestPit = pitStops.length > 0 ? Math.min(...pitStops.map((p) => p.durationSeconds)) : 0
  const worstPit = pitStops.length > 0 ? Math.max(...pitStops.map((p) => p.durationSeconds)) : 0

  // Per-driver analysis
  const driverStats = race.drivers.map((driver) => {
    const driverStints = race.stints.filter((s) => s.driverId === driver.id)
    const done = driverStints.filter((s) => s.status === 'completed')
    const totalPlanned = driverStints.reduce((s, st) => s + st.plannedDurationMinutes, 0)
    const totalActual = done.reduce(
      (s, st) => s + (st.actualDurationMinutes ?? st.plannedDurationMinutes),
      0
    )
    const avgStint = driverStints.length > 0 ? totalPlanned / driverStints.length : 0
    const longestStint = driverStints.length > 0
      ? Math.max(...driverStints.map((s) => s.plannedDurationMinutes))
      : 0
    const fairRatio = fairShareMinutes > 0 ? totalPlanned / fairShareMinutes : 0
    return { driver, driverStints, done, totalPlanned, totalActual, avgStint, longestStint, fairRatio }
  }).sort((a, b) => b.totalPlanned - a.totalPlanned)

  // Coverage: stints covering the full race duration
  const sortedStints = [...race.stints].sort((a, b) => a.plannedStartMinute - b.plannedStartMinute)
  let coveredMinutes = 0
  for (const stint of sortedStints) {
    const end = stint.plannedStartMinute + stint.plannedDurationMinutes
    if (stint.plannedStartMinute <= coveredMinutes) {
      coveredMinutes = Math.max(coveredMinutes, end)
    }
  }
  const coveragePct = pct(coveredMinutes, totalMinutes)

  // Total fuel added
  const totalFuelAdded = pitStops.reduce((s, p) => s + p.fuelAdded, 0)
  const tireChanges = pitStops.filter((p) => p.tireChange).length
  const driverSwaps = pitStops.filter((p) => p.driverSwap).length

  // Longest / shortest stint
  const allDurations = race.stints.map((s) => s.plannedDurationMinutes)
  const longestStintMin = allDurations.length > 0 ? Math.max(...allDurations) : 0
  const shortestStintMin = allDurations.length > 0 ? Math.min(...allDurations) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Race Debrief</h1>
          <p className="text-gray-500 text-sm mt-0.5">{race.name} · {race.track}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
            race.raceState.elapsedSeconds >= totalMinutes * 60
              ? 'bg-green-900/40 text-green-400 border-green-800'
              : race.raceState.elapsedSeconds > 0
              ? 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
              : 'bg-gray-800 text-gray-500 border-gray-700'
          }`}>
            {race.raceState.elapsedSeconds >= totalMinutes * 60
              ? 'FINISHED'
              : race.raceState.elapsedSeconds > 0
              ? 'IN PROGRESS'
              : 'NOT STARTED'}
          </div>
          <button
            onClick={() => navigate(`/race/${raceId}/scheduler`)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            ← Schedule
          </button>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HighlightCard
          icon={<svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v3.5l-1.3 1.3a.75.75 0 001.06 1.06l1.5-1.5a.75.75 0 00.24-.56v-3.8z"/></svg>}
          label="Race Time"
          value={formatTime(race.raceState.elapsedSeconds || totalMinutes * 60)}
          sub={`of ${race.durationHours}h planned`}
        />
        <HighlightCard
          icon={<svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M4 1a1 1 0 011-1h6a1 1 0 011 1v1h1a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1h1V1zm1 0v1h6V1H5zM3 3v11h10V3H3z"/></svg>}
          label="Stints"
          value={String(race.stints.length)}
          sub={`${completedStints.length} completed · ${scheduledStints.length} planned`}
        />
        <HighlightCard
          icon={<svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9.75-3.5a.75.75 0 000 1.5h1.04l-3.1 4.133-.001.001-.748-.749a.75.75 0 00-1.061 1.061l1.28 1.281a.75.75 0 001.06 0l3.52-4.692V8.5h.5a.75.75 0 000-1.5H9.75V4.5z" clipRule="evenodd"/></svg>}
          label="Pit Stops"
          value={String(pitStops.length)}
          sub={`avg ${secondsToMMSS(Math.round(avgPitSeconds))}`}
        />
        <HighlightCard
          icon={<svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-9.5a.5.5 0 01.5.5v3.793l1.146-1.147a.5.5 0 01.708.708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L7.5 9.793V6a.5.5 0 01.5-.5z"/></svg>}
          label="Coverage"
          value={`${coveragePct.toFixed(0)}%`}
          sub={`${Math.round(coveredMinutes)}/${totalMinutes} min covered`}
          color={coveragePct < 90 ? 'text-red-400' : coveragePct < 100 ? 'text-yellow-400' : 'text-green-400'}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Driver breakdown — 2 cols */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-white">Driver Performance</h2>
          </div>
          {driverStats.length === 0 ? (
            <div className="p-8 text-center text-gray-600 text-sm">No drivers added.</div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {driverStats.map(({ driver, driverStints, done, totalPlanned, avgStint, longestStint, fairRatio }) => {
                const fairColor =
                  fairRatio < 0.6 || fairRatio > 1.5
                    ? '#ef4444'
                    : fairRatio < 0.8 || fairRatio > 1.2
                    ? '#eab308'
                    : '#22c55e'
                return (
                  <div key={driver.id} className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: driver.color }}
                      >
                        {driver.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm">{driver.name}</div>
                        <div className="text-gray-500 text-xs">
                          {driverStints.length} stints · avg {Math.round(avgStint)} min · longest {longestStint} min
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-white text-sm font-semibold">
                          {minutesToHHMM(Math.round(totalPlanned))}
                        </div>
                        <div className="text-xs" style={{ color: fairColor }}>
                          {Math.round(fairRatio * 100)}% fair share
                        </div>
                      </div>
                    </div>
                    {/* Fair share bar */}
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(fairRatio, 1) * 100}%`,
                          backgroundColor: driver.color,
                        }}
                      />
                    </div>
                    {/* Stint blocks mini-timeline */}
                    <div className="relative h-4 bg-gray-800 rounded mt-2 overflow-hidden">
                      {driverStints.map((stint) => (
                        <div
                          key={stint.id}
                          className="absolute top-0.5 bottom-0.5 rounded-sm"
                          style={{
                            left: `${pct(stint.plannedStartMinute, totalMinutes)}%`,
                            width: `${Math.max(pct(stint.plannedDurationMinutes, totalMinutes), 0.5)}%`,
                            backgroundColor: stint.status === 'completed' ? driver.color + '80' : driver.color,
                          }}
                          title={`${minutesToHHMM(stint.plannedStartMinute)} – ${minutesToHHMM(stint.plannedStartMinute + stint.plannedDurationMinutes)} (${stint.plannedDurationMinutes} min) · ${stint.status}`}
                        />
                      ))}
                      {done.length > 0 && driverStints.length > done.length && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-yellow-400/50"
                          style={{ left: `${pct(elapsedMinutes, totalMinutes)}%` }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Pit stop summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Pit Stop Summary</h2>
            {pitStops.length === 0 ? (
              <p className="text-gray-600 text-sm">No pit stops logged.</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Total Stops', value: String(pitStops.length) },
                  { label: 'Avg Duration', value: secondsToMMSS(Math.round(avgPitSeconds)) },
                  { label: 'Best Stop', value: secondsToMMSS(bestPit), color: 'text-green-400' },
                  { label: 'Worst Stop', value: secondsToMMSS(worstPit), color: 'text-red-400' },
                  { label: 'Fuel Added', value: `${totalFuelAdded.toFixed(1)} L` },
                  { label: 'Tire Changes', value: String(tireChanges) },
                  { label: 'Driver Swaps', value: String(driverSwaps) },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className={`font-mono text-sm font-semibold ${color ?? 'text-white'}`}>{value}</span>
                  </div>
                ))}

                {/* Pit variance bars */}
                <div className="pt-2 border-t border-gray-800">
                  <div className="text-xs text-gray-600 mb-2">Stop durations (target {AVG_PIT_TARGET}s)</div>
                  {pitStops.map((ps, i) => {
                    const variance = ps.durationSeconds - AVG_PIT_TARGET
                    const barPct = Math.min(Math.abs(variance) / 60 * 100, 100)
                    return (
                      <div key={ps.id} className="flex items-center gap-2 mb-1">
                        <span className="text-gray-700 font-mono text-xs w-4">#{i + 1}</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: variance <= 0 ? '#22c55e' : variance <= 30 ? '#eab308' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className={`font-mono text-xs w-10 text-right ${
                          variance <= 0 ? 'text-green-400' : variance <= 30 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {variance >= 0 ? '+' : ''}{variance}s
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Race highlights */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Highlights</h2>
            <div className="space-y-2.5">
              {[
                { label: 'Longest Stint', value: `${longestStintMin} min` },
                { label: 'Shortest Stint', value: `${shortestStintMin} min` },
                { label: 'Incidents', value: String(race.raceState.incidents.length) },
                { label: 'Drivers', value: String(race.drivers.length) },
                {
                  label: 'Avg Stint',
                  value: race.stints.length > 0
                    ? `${Math.round(race.stints.reduce((s, st) => s + st.plannedDurationMinutes, 0) / race.stints.length)} min`
                    : '—'
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="font-mono text-sm text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Incidents */}
          {race.raceState.incidents.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Incidents</h2>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[...race.raceState.incidents]
                  .sort((a, b) => a.minute - b.minute)
                  .map((inc) => (
                    <div key={inc.id} className="flex gap-2.5 text-xs">
                      <span className="font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded flex-shrink-0">
                        {minutesToHHMM(inc.minute)}
                      </span>
                      <span className="text-gray-400">{inc.note}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
