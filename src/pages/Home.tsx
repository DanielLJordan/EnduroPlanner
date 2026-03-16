import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useRaceStore from '../store/useRaceStore'
import { IRACING_SPECIAL_EVENTS, searchEvents } from '../data/iracingEvents'
import type { IRacingEvent } from '../data/iracingEvents'
import { getEventCarClasses } from '../data/carClasses'

function useCountdown(targetDateStr: string) {
  const [remaining, setRemaining] = useState<number | null>(null)
  useEffect(() => {
    if (!targetDateStr) return
    const target = new Date(targetDateStr).getTime()
    const tick = () => {
      const diff = target - Date.now()
      setRemaining(diff > 0 ? diff : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDateStr])
  return remaining
}

function CountdownBadge({ startTime }: { startTime: string }) {
  const ms = useCountdown(startTime)
  if (ms === null || ms === 0) return null

  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const label = days > 0
    ? `${days}d ${hours}h ${mins}m`
    : hours > 0
    ? `${hours}h ${mins}m ${secs}s`
    : `${mins}m ${secs}s`

  const urgent = totalSec < 3600

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold rounded-full px-2.5 py-0.5 border ${
      urgent
        ? 'bg-red-900/40 text-red-300 border-red-800 animate-pulse'
        : 'bg-blue-900/30 text-blue-300 border-blue-800'
    }`}>
      <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
        <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.5 6.707V3a.5.5 0 00-1 0v4a.5.5 0 00.146.354l2 2a.5.5 0 00.708-.708L6.5 6.707z"/>
      </svg>
      {label}
    </span>
  )
}

interface NewRaceForm {
  name: string
  track: string
  durationHours: string
  startTime: string
  carName: string
}

const defaultForm: NewRaceForm = {
  name: '',
  track: '',
  durationHours: '6',
  startTime: '',
  carName: '',
}

const CATEGORY_LABELS: Record<string, string> = {
  endurance: 'Endurance',
  oval: 'Oval',
  road: 'Road',
  dirt: 'Dirt',
}

const CATEGORY_COLORS: Record<string, string> = {
  endurance: '#3b82f6',
  oval: '#8b5cf6',
  road: '#10b981',
  dirt: '#f59e0b',
}

const CATEGORY_BADGE: Record<string, string> = {
  endurance: 'bg-blue-900/40 text-blue-300 border-blue-800',
  oval: 'bg-purple-900/40 text-purple-300 border-purple-800',
  road: 'bg-emerald-900/40 text-emerald-300 border-emerald-800',
  dirt: 'bg-amber-900/40 text-amber-300 border-amber-800',
}

export default function Home() {
  const { races, createRace, deleteRace } = useRaceStore()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewRaceForm>(defaultForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Event search state
  const [eventQuery, setEventQuery] = useState('')
  const [showEventDropdown, setShowEventDropdown] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<IRacingEvent | null>(null)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [useCustom, setUseCustom] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredEvents = searchEvents(eventQuery)

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowEventDropdown(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function selectEvent(event: IRacingEvent) {
    setSelectedEvent(event)
    setSelectedClass(null)
    setEventQuery(event.name)
    setShowEventDropdown(false)
    setForm((f) => ({
      ...f,
      name: event.name,
      track: event.track,
      durationHours: String(event.durationHours),
      carName: '',
    }))
  }

  function clearEvent() {
    setSelectedEvent(null)
    setSelectedClass(null)
    setEventQuery('')
    setForm(defaultForm)
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.track.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const id = await createRace({
        name: form.name.trim(),
        track: form.track.trim(),
        durationHours: parseFloat(form.durationHours) || 6,
        startTime: form.startTime,
        teamNotes: '',
        car: {
          name: form.carName.trim() || 'Unknown Car',
          tankSizeLiters: 70,
          burnRatePerLap: 3.0,
          avgLapTimeSeconds: 90,
          tireStintLimitLaps: 40,
        },
      })
      setForm(defaultForm)
      setSelectedEvent(null)
      setEventQuery('')
      setShowForm(false)
      navigate(`/race/${id}/scheduler`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create race')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Delete this race?')) deleteRace(id)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12z" opacity=".3"/>
                <path d="M10 4.5a.5.5 0 01.5.5v4.793l2.854 2.853a.5.5 0 01-.708.708l-3-3A.5.5 0 019.5 10V5a.5.5 0 01.5-.5z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Stint Manager</h1>
          </div>
          <p className="text-gray-400 text-base">iRacing endurance race strategy & management</p>
        </div>

        {/* New Race Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-200">Races</h2>
          <button
            onClick={() => { setShowForm((v) => !v); setForm(defaultForm); setSelectedEvent(null); setEventQuery('') }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + New Race
          </button>
        </div>

        {/* New Race Form */}
        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-5">Create New Race</h3>

            {/* Event picker */}
            {!useCustom && (
              <div className="mb-5">
                <label className="block text-sm text-gray-400 mb-1">
                  iRacing Special Event
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={eventQuery}
                      onChange={(e) => {
                        setEventQuery(e.target.value)
                        setShowEventDropdown(true)
                        if (selectedEvent && e.target.value !== selectedEvent.name) {
                          setSelectedEvent(null)
                          setForm((f) => ({ ...f, name: e.target.value, track: '', durationHours: '6' }))
                        }
                      }}
                      onFocus={() => setShowEventDropdown(true)}
                      placeholder="Search events — e.g. Le Mans, Daytona, Spa..."
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 pr-8 focus:outline-none focus:border-blue-500"
                    />
                    {selectedEvent && (
                      <button
                        onClick={clearEvent}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {showEventDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                      {filteredEvents.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No events found</div>
                      ) : (
                        <>
                          {/* Group by category */}
                          {(['endurance', 'road', 'oval', 'dirt'] as const).map((cat) => {
                            const group = filteredEvents.filter((e) => e.category === cat)
                            if (group.length === 0) return null
                            return (
                              <div key={cat}>
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-900/50 sticky top-0">
                                  {CATEGORY_LABELS[cat]}
                                </div>
                                {group.map((event) => (
                                  <button
                                    key={event.id}
                                    onClick={() => selectEvent(event)}
                                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0 ${
                                      selectedEvent?.id === event.id ? 'bg-blue-900/30' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-white text-sm font-medium">{event.name}</span>
                                        <span className="text-gray-500 text-xs ml-2">{event.track}</span>
                                      </div>
                                      <span className="text-gray-400 text-xs font-mono ml-3 flex-shrink-0">
                                        {event.durationHours}h
                                      </span>
                                    </div>
                                    {event.carClasses.length > 0 && (
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {event.carClasses.map((c) => (
                                          <span key={c} className="text-xs text-gray-500 bg-gray-700/50 rounded px-1">
                                            {c}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected event preview */}
                {selectedEvent && (
                  <div className="mt-2 flex items-center gap-3 bg-blue-900/20 border border-blue-800 rounded-md px-3 py-2 text-xs">
                    <span className="text-blue-400 font-semibold">{selectedEvent.shortName}</span>
                    <span className="text-gray-400">{selectedEvent.track}</span>
                    <span className="text-gray-500 font-mono">{selectedEvent.durationHours}h</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-400">{selectedEvent.carClasses.join(', ')}</span>
                  </div>
                )}

                <button
                  onClick={() => setUseCustom(true)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Or create a custom event →
                </button>
              </div>
            )}

            {useCustom && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-gray-400">Custom event</span>
                <button
                  onClick={() => { setUseCustom(false); clearEvent() }}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  ← Pick from iRacing events
                </button>
              </div>
            )}

            {/* Fields — always shown, pre-filled from event selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Race Name *
                  {selectedEvent && <span className="text-gray-600 ml-1">(from event)</span>}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Daytona 24H Season 1"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Track *</label>
                <input
                  type="text"
                  value={form.track}
                  onChange={(e) => setForm((f) => ({ ...f, track: e.target.value }))}
                  placeholder="e.g. Daytona International Speedway"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (hours)</label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={form.durationHours}
                  onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Car</label>

                {/* Class selector — shown when an event is selected */}
                {selectedEvent && (() => {
                  const classes = getEventCarClasses(selectedEvent.carClasses)
                  const activeClass = classes.find((c) => c.id === selectedClass)
                  return (
                    <div className="space-y-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {classes.map((cls) => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              setSelectedClass(cls.id)
                              setForm((f) => ({ ...f, carName: '' }))
                            }}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                              selectedClass === cls.id
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                            }`}
                          >
                            {cls.label}
                          </button>
                        ))}
                      </div>

                      {activeClass && (
                        <select
                          value={form.carName}
                          onChange={(e) => setForm((f) => ({ ...f, carName: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 text-sm"
                        >
                          <option value="">Select a car…</option>
                          {activeClass.cars.map((car) => (
                            <option key={car} value={car}>{car}</option>
                          ))}
                        </select>
                      )}

                      {/* Manual override */}
                      <input
                        type="text"
                        value={form.carName}
                        onChange={(e) => setForm((f) => ({ ...f, carName: e.target.value }))}
                        placeholder="Or type a car name…"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 text-sm placeholder-gray-600"
                      />
                    </div>
                  )
                })()}

                {/* No event selected — plain text input */}
                {!selectedEvent && (
                  <input
                    type="text"
                    value={form.carName}
                    onChange={(e) => setForm((f) => ({ ...f, carName: e.target.value }))}
                    placeholder="e.g. Porsche 911 GT3 R"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
            </div>

            {createError && (
              <div className="mb-3 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
                {createError}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowForm(false); setForm(defaultForm); setSelectedEvent(null); setEventQuery(''); setCreateError(null) }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || !form.track.trim() || creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm transition-colors"
              >
                {creating ? 'Creating…' : 'Create Race'}
              </button>
            </div>
          </div>
        )}

        {/* Race List */}
        {races.length === 0 ? (
          <div className="text-center py-20 text-gray-600 border border-dashed border-gray-800 rounded-xl">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-base text-gray-500 font-medium">No races yet</p>
            <p className="text-sm mt-1 text-gray-600">Create your first race to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {races.map((race) => {
              const matchedEvent = IRACING_SPECIAL_EVENTS.find(
                (e) => e.name === race.name || e.track === race.track
              )
              const accentColor = matchedEvent ? CATEGORY_COLORS[matchedEvent.category] : '#374151'
              return (
                <div
                  key={race.id}
                  onClick={() => navigate(`/race/${race.id}/scheduler`)}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-5 cursor-pointer hover:border-gray-700 hover:bg-gray-800/40 transition-all group relative overflow-hidden"
                >
                  {/* Left color accent */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="pl-3 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {race.name}
                        </h3>
                        {matchedEvent && (
                          <span className={`text-xs border rounded px-1.5 py-0.5 font-medium ${CATEGORY_BADGE[matchedEvent.category]}`}>
                            {CATEGORY_LABELS[matchedEvent.category]}
                          </span>
                        )}
                        {race.raceState.isRunning && (
                          <span className="flex items-center gap-1.5 bg-green-900/40 border border-green-800 rounded px-1.5 py-0.5">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-green-400 text-xs font-semibold">LIVE</span>
                          </span>
                        )}
                        {race.startTime && !race.raceState.isRunning && race.raceState.elapsedSeconds === 0 && (
                          <CountdownBadge startTime={race.startTime} />
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5">{race.track}</p>
                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 rounded-full px-2.5 py-0.5">
                          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 7.5a.5.5 0 000 1h5.793l-2.147 2.146a.5.5 0 00.708.708l3-3a.5.5 0 000-.708l-3-3a.5.5 0 10-.708.708L10.293 7.5H4.5z" opacity=".5"/><path fillRule="evenodd" d="M8 1a.5.5 0 01.5.5v4.793l1.146-1.147a.5.5 0 11.708.708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 11.708-.708L7.5 6.293V1.5A.5.5 0 018 1z" opacity="0"/><circle cx="8" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1"/><path d="M8 5.5v2.793l1.5 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none"/></svg>
                          {race.durationHours}h
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 rounded-full px-2.5 py-0.5">
                          {race.drivers.length} driver{race.drivers.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-600">{race.car.name}</span>
                        {race.startTime && (
                          <span className="text-xs text-gray-600">
                            {new Date(race.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {race.stints.length > 0 && (
                          <span className="text-xs text-gray-600">{race.stints.length} stints</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, race.id)}
                      className="ml-4 px-2.5 py-1 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded text-xs transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
