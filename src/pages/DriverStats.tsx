import { useParams, useNavigate } from 'react-router-dom'
import useRaceStore from '../store/useRaceStore'
import { formatMinutes } from '../utils/time'
import type { Driver, Stint } from '../types'

function formatLapTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(3).padStart(6, '0')
  return `${m}:${s}`
}

type DriverStatus = 'DRIVING' | 'ON DECK' | 'RESTING' | 'COMPLETED'

function getDriverStatus(
  driver: Driver,
  stints: Stint[],
  elapsedMinutes: number
): DriverStatus {
  const driverStints = stints.filter((s) => s.driverId === driver.id)

  if (driverStints.some((s) => s.status === 'active')) return 'DRIVING'

  if (driverStints.length > 0 && driverStints.every((s) => s.status === 'completed'))
    return 'COMPLETED'

  const sortedScheduled = stints
    .filter((s) => s.status === 'scheduled' && s.plannedStartMinute > elapsedMinutes)
    .sort((a, b) => a.plannedStartMinute - b.plannedStartMinute)

  const nextOverall = sortedScheduled[0]
  if (nextOverall && nextOverall.driverId === driver.id) return 'ON DECK'

  return 'RESTING'
}

const STATUS_STYLES: Record<DriverStatus, string> = {
  DRIVING: 'bg-green-700 text-green-200',
  'ON DECK': 'bg-yellow-700 text-yellow-200',
  RESTING: 'bg-gray-700 text-gray-300',
  COMPLETED: 'bg-blue-700 text-blue-200',
}

function PreferenceBadge({
  label,
  value,
}: {
  label: string
  value: 'prefer' | 'neutral' | 'avoid' | boolean
}) {
  if (typeof value === 'boolean') {
    if (!value) return null
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-800"
        title={label}
      >
        {label === 'Start' ? '🚦' : label} Start
      </span>
    )
  }
  if (value === 'neutral') return null
  const isPrefer = value === 'prefer'
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${
        isPrefer
          ? 'bg-green-900/50 text-green-400 border-green-800'
          : 'bg-red-900/50 text-red-400 border-red-800'
      }`}
      title={`${label}: ${value}`}
    >
      {label === 'Rain' ? '🌧' : '🌙'} {isPrefer ? 'Prefers' : 'Avoids'} {label}
    </span>
  )
}

export default function DriverStats() {
  const { raceId } = useParams<{ raceId: string }>()
  const navigate = useNavigate()
  const { races } = useRaceStore()
  const race = races.find((r) => r.id === raceId)

  if (!race) {
    return <div className="p-8 text-gray-400">Race not found.</div>
  }

  const elapsedMinutes = race.raceState.elapsedSeconds / 60
  const totalMinutes = race.durationHours * 60
  const fairShareMinutes =
    race.drivers.length > 0 ? (race.durationHours * 60) / race.drivers.length : 0

  if (race.drivers.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Driver Stats</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center text-gray-500">
          <p>No drivers added yet.</p>
          <p className="text-sm mt-1 mb-4">Add drivers in Race Setup to see stats here.</p>
          <button
            onClick={() => navigate(`/race/${raceId}/setup`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + Add Drivers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Driver Stats</h1>
        <button
          onClick={() => navigate(`/race/${raceId}/setup`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          + Add Driver
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {race.drivers.map((driver) => {
          const driverStints = race.stints.filter((s) => s.driverId === driver.id)
          const completedStints = driverStints.filter((s) => s.status === 'completed')
          const remainingStints = driverStints.filter((s) => s.status !== 'completed')
          const totalDriveMinutes = driverStints.reduce(
            (sum, s) =>
              sum +
              (s.status === 'completed'
                ? s.actualDurationMinutes ?? s.plannedDurationMinutes
                : s.plannedDurationMinutes),
            0
          )
          const avgStintMinutes =
            driverStints.length > 0 ? totalDriveMinutes / driverStints.length : 0
          const status = getDriverStatus(driver, race.stints, elapsedMinutes)

          const fairRatio = fairShareMinutes > 0 ? totalDriveMinutes / fairShareMinutes : 0
          const fairPct = Math.round(fairRatio * 100)

          let fairBarColor: string
          let fairLabelColor: string
          if (fairRatio < 0.6 || fairRatio > 1.5) {
            fairBarColor = '#ef4444'
            fairLabelColor = 'text-red-400'
          } else if (fairRatio < 0.8 || fairRatio > 1.2) {
            fairBarColor = '#eab308'
            fairLabelColor = 'text-yellow-400'
          } else {
            fairBarColor = '#22c55e'
            fairLabelColor = 'text-green-400'
          }

          const availFrom = driver.availableFromMinute ?? 0
          const availTo = Math.min(driver.availableToMinute ?? 9999, totalMinutes)
          const stripeStyle =
            'repeating-linear-gradient(45deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 3px, transparent 3px, transparent 6px)'

          return (
            <div
              key={driver.id}
              className="bg-gray-900 rounded-lg overflow-hidden border-2 transition-all hover:border-opacity-80"
              style={{ borderColor: driver.color }}
            >
              {/* Header */}
              <div
                className="px-4 pt-4 pb-3 flex items-start justify-between"
                style={{ borderBottom: `1px solid ${driver.color}30` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: driver.color }}
                  >
                    {driver.initials}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-lg leading-tight">
                      {driver.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 font-mono">
                        iRating:{' '}
                        <span className="text-gray-300">{driver.irating.toLocaleString()}</span>
                      </span>
                    </div>
                    {/* Preference badges row */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <PreferenceBadge label="Rain" value={driver.rainPreference ?? 'neutral'} />
                      <PreferenceBadge label="Night" value={driver.nightPreference ?? 'neutral'} />
                      <PreferenceBadge label="Start" value={driver.prefersRaceStart ?? false} />
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[status]}`}
                >
                  {status}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 divide-x divide-gray-800 border-b border-gray-800">
                <div className="p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Stints</div>
                  <div className="text-xl font-bold font-mono text-white">
                    {driverStints.length}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Drive Time</div>
                  <div className="text-lg font-bold font-mono text-white">
                    {formatMinutes(Math.round(totalDriveMinutes))}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Avg Stint</div>
                  <div className="text-lg font-bold font-mono text-white">
                    {avgStintMinutes > 0 ? formatMinutes(Math.round(avgStintMinutes)) : '—'}
                  </div>
                </div>
              </div>

              {/* More stats */}
              <div className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-500">Completed: </span>
                  <span className="text-gray-300 font-mono">{completedStints.length}</span>
                  <span className="text-gray-500 ml-3">Remaining: </span>
                  <span className="text-gray-300 font-mono">{remainingStints.length}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {driver.minStintMinutes}–{driver.maxStintMinutes} min
                </div>
              </div>

              {/* Fair Share section */}
              <div className="px-4 pb-3 border-t border-gray-800 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Drive Time vs Fair Share</span>
                  <span className={`text-xs font-semibold ${fairLabelColor}`}>
                    {fairPct}% of fair share
                  </span>
                </div>
                <div className="relative h-2.5 bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full rounded-l absolute left-0 top-0"
                    style={{
                      width: `${Math.min(fairRatio, 1) * 100}%`,
                      backgroundColor: driver.color,
                    }}
                  />
                  {fairRatio > 1 && (
                    <div
                      className="h-full absolute top-0"
                      style={{
                        left: `${Math.min(fairRatio, 1) * 100}%`,
                        width: `${Math.min((fairRatio - 1) * 100, 50)}%`,
                        backgroundColor: fairBarColor,
                      }}
                    />
                  )}
                  {/* Fair share marker */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white/40" style={{ left: '100%', transform: 'translateX(-1px)' }} />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                  <span>0m</span>
                  <span className="text-gray-500">{Math.round(fairShareMinutes)}m target</span>
                  <span>{totalMinutes}m</span>
                </div>
              </div>

              {/* Mini stint timeline */}
              <div className="px-4 pb-4">
                <div className="text-xs text-gray-500 mb-2">Stint Timeline</div>
                <div
                  className="relative h-6 bg-gray-800 rounded overflow-hidden"
                  title="Stint timeline"
                >
                  {/* Unavailable region: before availFrom */}
                  {availFrom > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(availFrom / totalMinutes) * 100}%`,
                        background: stripeStyle,
                        backgroundColor: 'rgba(17,24,39,0.7)',
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Unavailable region: after availTo */}
                  {availTo < totalMinutes && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(availTo / totalMinutes) * 100}%`,
                        top: 0,
                        bottom: 0,
                        right: 0,
                        background: stripeStyle,
                        backgroundColor: 'rgba(17,24,39,0.7)',
                        zIndex: 1,
                      }}
                    />
                  )}

                  {driverStints.map((stint) => {
                    const leftPct = (stint.plannedStartMinute / totalMinutes) * 100
                    const widthPct = (stint.plannedDurationMinutes / totalMinutes) * 100
                    const isCompleted = stint.status === 'completed'
                    const isActive = stint.status === 'active'
                    return (
                      <div
                        key={stint.id}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 1)}%`,
                          top: 4,
                          bottom: 4,
                          backgroundColor: isCompleted
                            ? `${driver.color}60`
                            : driver.color,
                          borderRadius: 2,
                          border: isActive ? '1px solid white' : 'none',
                          zIndex: 2,
                        }}
                        title={`${stint.plannedDurationMinutes} min at ${Math.floor(stint.plannedStartMinute / 60)}h`}
                      />
                    )
                  })}
                  {/* Now indicator */}
                  {elapsedMinutes > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${Math.min((elapsedMinutes / totalMinutes) * 100, 100)}%`,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        backgroundColor: '#ef4444',
                        zIndex: 3,
                      }}
                    />
                  )}
                  {driverStints.length === 0 && (
                    <div className="flex items-center justify-center h-full text-xs text-gray-600">
                      No stints scheduled
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Telemetry comparison table */}
      {race.drivers.some((d) => d.telemetry) && (
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">IBT Telemetry Comparison</h2>
            <span className="text-xs text-gray-500">
              {race.drivers.filter((d) => d.telemetry).length}/{race.drivers.length} drivers uploaded
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Driver</th>
                  <th className="text-right px-4 py-3">Avg Lap</th>
                  <th className="text-right px-4 py-3">Best Lap</th>
                  <th className="text-right px-4 py-3">Fuel / Lap</th>
                  <th className="text-right px-4 py-3">Laps</th>
                  <th className="text-left px-4 py-3">Track</th>
                  <th className="text-right px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {race.drivers.map((driver) => {
                  const t = driver.telemetry
                  const best = t ? [...t.laps].sort((a, b) => a.lapTimeSeconds - b.lapTimeSeconds)[0] : null

                  // Find fastest avg lap for highlighting
                  const fastestAvg = Math.min(
                    ...race.drivers.filter((d) => d.telemetry).map((d) => d.telemetry!.avgLapTimeSeconds)
                  )

                  return (
                    <tr key={driver.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                            style={{ backgroundColor: driver.color }}
                          >
                            {driver.initials}
                          </div>
                          <span className="text-white font-medium text-sm">{driver.name}</span>
                        </div>
                      </td>
                      {t ? (
                        <>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono text-sm font-semibold ${
                              t.avgLapTimeSeconds === fastestAvg ? 'text-green-400' : 'text-white'
                            }`}>
                              {formatLapTime(t.avgLapTimeSeconds)}
                            </span>
                            {t.avgLapTimeSeconds === fastestAvg && (
                              <span className="ml-1.5 text-xs text-green-600">fastest</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-purple-300">
                            {best ? formatLapTime(best.lapTimeSeconds) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-blue-300">
                            {t.avgFuelPerLap > 0 ? `${t.avgFuelPerLap} L` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-gray-400">
                            {t.totalLaps}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                            {t.trackName}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {new Date(t.uploadedAt).toLocaleDateString()}
                          </td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-4 py-3 text-xs text-gray-700 italic">
                          No IBT data — upload in Race Setup
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
              {race.drivers.filter((d) => d.telemetry).length > 1 && (
                <tfoot>
                  <tr className="border-t border-gray-700 bg-gray-800/30">
                    <td className="px-5 py-2.5 text-xs text-gray-500 font-semibold uppercase tracking-wider">Team Avg</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-300 font-semibold">
                      {formatLapTime(
                        race.drivers.filter((d) => d.telemetry).reduce((s, d) => s + d.telemetry!.avgLapTimeSeconds, 0) /
                        race.drivers.filter((d) => d.telemetry).length
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">—</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-300 font-semibold">
                      {(() => {
                        const withFuel = race.drivers.filter((d) => d.telemetry && d.telemetry.avgFuelPerLap > 0)
                        if (withFuel.length === 0) return '—'
                        const avg = withFuel.reduce((s, d) => s + d.telemetry!.avgFuelPerLap, 0) / withFuel.length
                        return `${(Math.round(avg * 1000) / 1000)} L`
                      })()}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
