import { useState } from 'react'
import { useParams } from 'react-router-dom'
import useRaceStore from '../store/useRaceStore'
import PitStopModal from '../components/PitStopModal'
import { minutesToHHMM, secondsToMMSS } from '../utils/time'
import type { PitStop } from '../types'

const AVG_PIT_SECONDS = 30

export default function PitStopLog() {
  const { raceId } = useParams<{ raceId: string }>()
  const { races, addPitStop, updatePitStop, deletePitStop } = useRaceStore()

  const race = races.find((r) => r.id === raceId)
  const [showModal, setShowModal] = useState(false)
  const [editingPitStop, setEditingPitStop] = useState<PitStop | null>(null)

  if (!race) {
    return <div className="p-8 text-gray-400">Race not found.</div>
  }

  const pitStops = [...race.pitStops].sort((a, b) => a.minute - b.minute)

  const handleSave = (data: Omit<PitStop, 'id'>) => {
    if (!raceId) return
    if (editingPitStop) {
      updatePitStop(raceId, editingPitStop.id, data)
    } else {
      addPitStop(raceId, data)
    }
    setShowModal(false)
    setEditingPitStop(null)
  }

  const handleEdit = (ps: PitStop) => {
    setEditingPitStop(ps)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (!raceId) return
    if (confirm('Delete this pit stop record?')) {
      deletePitStop(raceId, id)
    }
  }

  const totalDurationSeconds = pitStops.reduce((sum, ps) => sum + ps.durationSeconds, 0)
  const avgDuration = pitStops.length > 0 ? totalDurationSeconds / pitStops.length : 0
  const bestStop = pitStops.length > 0 ? Math.min(...pitStops.map((ps) => ps.durationSeconds)) : 0
  const driverSwapCount = pitStops.filter((ps) => ps.driverSwap).length

  const getVarianceColor = (variance: number) => {
    const abs = Math.abs(variance)
    if (abs <= 15) return 'text-green-400 bg-green-900/30'
    if (abs <= 45) return 'text-yellow-400 bg-yellow-900/30'
    return 'text-red-400 bg-red-900/30'
  }

  const getDriverNames = (ps: PitStop) => {
    const stint = race.stints.find((s) => s.id === ps.stintId)
    if (!stint) return { from: null, to: null }
    const fromDriver = race.drivers.find((d) => d.id === stint.driverId)
    if (!ps.driverSwap) return { from: fromDriver ?? null, to: fromDriver ?? null }
    const nextStint = race.stints
      .filter((s) => s.plannedStartMinute >= ps.minute && s.id !== stint.id)
      .sort((a, b) => a.plannedStartMinute - b.plannedStartMinute)[0]
    const toDriver = nextStint ? race.drivers.find((d) => d.id === nextStint.driverId) : null
    return { from: fromDriver ?? null, to: toDriver ?? fromDriver ?? null }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pit Stop Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">{race.name}</p>
        </div>
        <button
          onClick={() => { setEditingPitStop(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
          Log Pit Stop
        </button>
      </div>

      {/* Summary cards */}
      {pitStops.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Stops', value: String(pitStops.length), sub: undefined, color: 'text-white' },
            { label: 'Avg Stop Time', value: secondsToMMSS(Math.round(avgDuration)), sub: `best: ${secondsToMMSS(bestStop)}`, color: 'text-white' },
            { label: 'Time Lost', value: secondsToMMSS(totalDurationSeconds), sub: 'cumulative', color: 'text-red-400' },
            { label: 'Driver Swaps', value: String(driverSwapCount), sub: `${pitStops.length - driverSwapCount} fuel only`, color: 'text-blue-400' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
              <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
              {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Table or empty state */}
      {pitStops.length === 0 ? (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-16 text-center text-gray-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
          </svg>
          <p className="text-base font-medium text-gray-500">No pit stops logged yet</p>
          <p className="text-sm mt-1">Log your first pit stop to track strategy.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider bg-gray-900/80">
                  <th className="text-left px-4 py-3 font-semibold">#</th>
                  <th className="text-left px-4 py-3 font-semibold">Time</th>
                  <th className="text-left px-4 py-3 font-semibold">Driver</th>
                  <th className="text-right px-4 py-3 font-semibold">Fuel</th>
                  <th className="text-center px-4 py-3 font-semibold">Tires</th>
                  <th className="text-center px-4 py-3 font-semibold">Swap</th>
                  <th className="text-right px-4 py-3 font-semibold">Duration</th>
                  <th className="text-right px-4 py-3 font-semibold">vs. Target</th>
                  <th className="text-left px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {pitStops.map((ps, idx) => {
                  const { from, to } = getDriverNames(ps)
                  const variance = ps.durationSeconds - AVG_PIT_SECONDS
                  const varClass = getVarianceColor(variance)

                  return (
                    <tr key={ps.id} className="hover:bg-gray-800/30 transition-colors group">
                      {/* Stop number badge */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-gray-400 text-xs font-bold font-mono">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-white text-sm">{minutesToHHMM(ps.minute)}</div>
                      </td>

                      {/* Driver */}
                      <td className="px-4 py-3">
                        {ps.driverSwap && from && to && from.id !== to.id ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: from.color }}
                            />
                            <span className="text-gray-400 text-xs">{from.name}</span>
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-600">
                              <path d="M8 4a.5.5 0 01.5.5v5.793l2.146-2.147a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L7.5 10.293V4.5A.5.5 0 018 4z" transform="rotate(-90 8 8)"/>
                            </svg>
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: to.color }}
                            />
                            <span className="text-blue-300 text-xs font-medium">{to.name}</span>
                          </div>
                        ) : from ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: from.color }}
                            />
                            <span className="text-gray-300 text-xs">{from.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Fuel */}
                      <td className="px-4 py-3 text-right">
                        {ps.fuelAdded > 0 ? (
                          <span className="font-mono text-sm text-white">{ps.fuelAdded.toFixed(1)} L</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Tires */}
                      <td className="px-4 py-3 text-center">
                        {ps.tireChange ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-900/50 text-green-400 text-xs">✓</span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>

                      {/* Driver swap indicator */}
                      <td className="px-4 py-3 text-center">
                        {ps.driverSwap ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-900/50 text-blue-400 text-xs">✓</span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 text-right font-mono text-white text-sm">
                        {secondsToMMSS(ps.durationSeconds)}
                      </td>

                      {/* Variance */}
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${varClass}`}>
                          {variance >= 0 ? '+' : ''}{variance}s
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">
                        {ps.notes || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(ps)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(ps.id)}
                            className="px-2 py-1 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded text-xs transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <PitStopModal
          pitStop={editingPitStop}
          stintId={race.stints[0]?.id ?? ''}
          currentMinute={Math.floor(race.raceState.elapsedSeconds / 60)}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false)
            setEditingPitStop(null)
          }}
        />
      )}
    </div>
  )
}
