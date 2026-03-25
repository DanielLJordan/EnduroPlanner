import { useState, useMemo } from 'react'
import useRaceStore from '../store/useRaceStore'
import { calcTeamSof, predictSplit, sofTierLabel, formatIrating } from '../utils/sof'
import {
  HISTORICAL_SOF_DATA,
  EVENTS_WITH_HISTORY,
  getEventHistory,
} from '../data/sofHistory'
import { IRACING_SPECIAL_EVENTS } from '../data/iracingEvents'

// ── helpers ──────────────────────────────────────────────────────────────────

const SPLIT_COLORS = [
  'bg-yellow-500',
  'bg-orange-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-gray-500',
]

const SPLIT_TEXT_COLORS = [
  'text-yellow-400',
  'text-orange-400',
  'text-blue-400',
  'text-cyan-400',
  'text-green-400',
  'text-purple-400',
  'text-pink-400',
  'text-gray-400',
]

function splitColor(splitNumber: number): string {
  return SPLIT_COLORS[(splitNumber - 1) % SPLIT_COLORS.length]
}
function splitTextColor(splitNumber: number): string {
  return SPLIT_TEXT_COLORS[(splitNumber - 1) % SPLIT_TEXT_COLORS.length]
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SOFCalculator() {
  const { getActiveRace } = useRaceStore()
  const race = getActiveRace()

  const [selectedEventId, setSelectedEventId] = useState<string>(
    EVENTS_WITH_HISTORY[0] ?? '',
  )
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')

  // Team SOF
  const teamSof = useMemo(
    () => (race ? calcTeamSof(race.drivers) : 0),
    [race],
  )
  const tier = sofTierLabel(teamSof)

  // Historical data for selected event
  const eventHistory = useMemo(
    () => getEventHistory(selectedEventId),
    [selectedEventId],
  )

  const years = useMemo(
    () => eventHistory.map((h) => h.year).sort((a, b) => b - a),
    [eventHistory],
  )

  // The record to use for the split prediction
  const historyRecord = useMemo(() => {
    if (selectedYear === 'all') return eventHistory[0] ?? null
    return eventHistory.find((h) => h.year === selectedYear) ?? null
  }, [eventHistory, selectedYear])

  const predictedSplit = useMemo(() => {
    if (!historyRecord || teamSof === 0) return null
    return predictSplit(teamSof, historyRecord)
  }, [historyRecord, teamSof])

  // Max SOF for bar chart scaling
  const maxSof = useMemo(() => {
    if (!historyRecord) return 5000
    return Math.max(...historyRecord.splits.map((s) => s.averageSof)) * 1.1
  }, [historyRecord])

  const eventName =
    IRACING_SPECIAL_EVENTS.find((e) => e.id === selectedEventId)?.shortName ??
    selectedEventId

  // Events with history — joined with display names
  const eventsWithHistory = EVENTS_WITH_HISTORY.map((id) => ({
    id,
    name: IRACING_SPECIAL_EVENTS.find((e) => e.id === id)?.shortName ?? id,
  }))

  // Year-over-year split 1 trend
  const split1Trend = useMemo(() => {
    return eventHistory
      .map((h) => ({
        year: h.year,
        sof: h.splits.find((s) => s.splitNumber === 1)?.averageSof ?? 0,
        note: h.note,
      }))
      .sort((a, b) => a.year - b.year)
  }, [eventHistory])

  if (!race) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No race selected.
      </div>
    )
  }

  const ratedDrivers = race.drivers.filter((d) => d.irating > 0)
  const maxDriverIrating =
    ratedDrivers.length > 0 ? Math.max(...ratedDrivers.map((d) => d.irating)) : 1

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">SOF &amp; Split Predictor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Team Strength of Field calculator and split placement estimate based on historical event data.
        </p>
      </div>

      {/* ── Team SOF ─────────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Team SOF
        </h2>

        {ratedDrivers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No drivers with iRating found. Add driver iRatings in Race Setup to
            calculate team SOF.
          </p>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Big SOF number */}
            <div className="flex flex-col items-center justify-center min-w-[140px] bg-gray-800/60 rounded-lg border border-gray-700/50 px-6 py-5">
              <p className="text-4xl font-bold text-white font-mono tracking-tight">
                {formatIrating(teamSof)}
              </p>
              <p className={`text-sm font-semibold mt-1.5 ${tier.color}`}>
                {tier.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">Team Average iRating</p>
            </div>

            {/* Driver breakdown */}
            <div className="flex-1 space-y-2.5">
              {[...ratedDrivers]
                .sort((a, b) => b.irating - a.irating)
                .map((driver) => {
                  const pct = (driver.irating / maxDriverIrating) * 100
                  const dTier = sofTierLabel(driver.irating)
                  return (
                    <div key={driver.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: driver.color }}
                          />
                          <span className="text-sm text-gray-300 font-medium">
                            {driver.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${dTier.color}`}>
                            {dTier.label}
                          </span>
                          <span className="text-sm font-mono text-white">
                            {formatIrating(driver.irating)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: driver.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}

              {/* Team average marker line */}
              <div className="mt-1 pt-2 border-t border-gray-700/50 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {ratedDrivers.length} driver{ratedDrivers.length !== 1 ? 's' : ''} rated
                </span>
                <span className="text-xs text-gray-500">
                  Range:{' '}
                  <span className="text-gray-300 font-mono">
                    {formatIrating(Math.min(...ratedDrivers.map((d) => d.irating)))}
                  </span>{' '}
                  –{' '}
                  <span className="text-gray-300 font-mono">
                    {formatIrating(Math.max(...ratedDrivers.map((d) => d.irating)))}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Split Predictor ────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Split Predictor
          </h2>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Event picker */}
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value)
                setSelectedYear('all')
              }}
              className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {eventsWithHistory.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>

            {/* Year picker */}
            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(
                  e.target.value === 'all' ? 'all' : Number(e.target.value),
                )
              }
              className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!historyRecord ? (
          <p className="text-sm text-gray-500">
            No historical data available for this event.
          </p>
        ) : (
          <>
            {/* Prediction badge */}
            {teamSof > 0 && predictedSplit !== null ? (
              <div className="flex items-center gap-4 mb-5 p-3.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 ${splitColor(predictedSplit)}`}
                >
                  {predictedSplit}
                </div>
                <div>
                  <p className="text-white font-semibold text-base">
                    Predicted Split {predictedSplit}
                  </p>
                  <p className="text-sm text-gray-400">
                    Based on {eventName}{' '}
                    {historyRecord.year} — your team SOF of{' '}
                    <span className="text-white font-mono">
                      {formatIrating(teamSof)}
                    </span>{' '}
                    is closest to Split {predictedSplit}'s average of{' '}
                    <span className="text-white font-mono">
                      {formatIrating(
                        historyRecord.splits.find(
                          (s) => s.splitNumber === predictedSplit,
                        )?.averageSof ?? 0,
                      )}
                    </span>
                    .
                  </p>
                </div>
              </div>
            ) : teamSof === 0 ? (
              <div className="mb-5 p-3.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
                <p className="text-sm text-gray-400">
                  Add driver iRatings in Race Setup to see your split prediction.
                </p>
              </div>
            ) : null}

            {/* Split SOF bars */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                {eventName} {historyRecord.year} — Split breakdown (
                {historyRecord.totalEntries} entries)
              </p>
              {historyRecord.splits.map((split) => {
                const barPct = (split.averageSof / maxSof) * 100
                const isMyPredicted = split.splitNumber === predictedSplit
                return (
                  <div key={split.splitNumber}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold w-16 ${splitTextColor(split.splitNumber)}`}
                        >
                          Split {split.splitNumber}
                        </span>
                        {isMyPredicted && teamSof > 0 && (
                          <span className="text-xs bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded px-1.5 py-0.5 font-medium">
                            Your team
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{split.entryCount} cars</span>
                        <span className="font-mono text-gray-200">
                          {formatIrating(split.averageSof)} SOF
                        </span>
                      </div>
                    </div>
                    <div className="relative h-5 bg-gray-800 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${splitColor(split.splitNumber)} opacity-70`}
                        style={{ width: `${barPct}%` }}
                      />
                      {/* Team SOF marker */}
                      {isMyPredicted && teamSof > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white opacity-90"
                          style={{
                            left: `${(teamSof / maxSof) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}

              <p className="text-xs text-gray-600 pt-1">
                * Historical SOF values are approximate. Actual split placement
                depends on total registrations and field composition on race day.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Split 1 SOF Trend ─────────────────────────────────────── */}
      {split1Trend.length > 1 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Split 1 SOF Trend — {eventName}
          </h2>
          <div className="flex items-end gap-4 h-28">
            {split1Trend.map((entry) => {
              const maxTrend = Math.max(...split1Trend.map((e) => e.sof)) * 1.1
              const pct = (entry.sof / maxTrend) * 100
              return (
                <div
                  key={entry.year}
                  className="flex flex-col items-center gap-1 flex-1"
                >
                  <span className="text-xs text-gray-400 font-mono">
                    {formatIrating(entry.sof)}
                  </span>
                  <div
                    className="w-full rounded-t bg-yellow-500/70 transition-all"
                    style={{ height: `${pct}%` }}
                  />
                  <span className="text-xs text-gray-500">{entry.year}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Split 1 average SOF year-over-year. Higher values indicate a more competitive top split.
          </p>
        </div>
      )}

      {/* ── All Events Quick Reference ────────────────────────────── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Cross-Event Comparison — Most Recent Year
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-800">
                <th className="pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Event
                </th>
                <th className="pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wider text-right">
                  Year
                </th>
                <th className="pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wider text-right">
                  Splits
                </th>
                <th className="pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wider text-right">
                  Split 1 SOF
                </th>
                <th className="pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wider text-right">
                  Your Split
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {EVENTS_WITH_HISTORY.map((eventId) => {
                const records = getEventHistory(eventId)
                const latest = records[0]
                if (!latest) return null
                const evName =
                  IRACING_SPECIAL_EVENTS.find((e) => e.id === eventId)
                    ?.shortName ?? eventId
                const split1Sof =
                  latest.splits.find((s) => s.splitNumber === 1)?.averageSof ??
                  0
                const myPredicted =
                  teamSof > 0 ? predictSplit(teamSof, latest) : null
                return (
                  <tr key={eventId}>
                    <td className="py-2.5 text-gray-300 font-medium">{evName}</td>
                    <td className="py-2.5 text-gray-500 text-right font-mono">
                      {latest.year}
                    </td>
                    <td className="py-2.5 text-gray-500 text-right">
                      {latest.splits.length}
                    </td>
                    <td className="py-2.5 text-yellow-400 text-right font-mono font-semibold">
                      {formatIrating(split1Sof)}
                    </td>
                    <td className="py-2.5 text-right">
                      {myPredicted !== null ? (
                        <span
                          className={`font-bold font-mono ${splitTextColor(myPredicted)}`}
                        >
                          Split {myPredicted}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {teamSof === 0 && (
          <p className="text-xs text-gray-600 mt-3">
            Add driver iRatings in Race Setup to see your predicted split for
            each event.
          </p>
        )}
      </div>
    </div>
  )
}
