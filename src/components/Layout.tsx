import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import NavBar from './NavBar'
import useRaceStore from '../store/useRaceStore'

export default function Layout() {
  const { raceId } = useParams<{ raceId: string }>()
  const { setActiveRace, getActiveRace } = useRaceStore()

  useEffect(() => {
    if (raceId) {
      setActiveRace(raceId)
    }
  }, [raceId, setActiveRace])

  const race = getActiveRace()
  const elapsed = race?.raceState.elapsedSeconds ?? 0
  const total = (race?.durationHours ?? 0) * 3600
  const progressPct = total > 0 ? Math.min((elapsed / total) * 100, 100) : 0
  const isRunning = race?.raceState.isRunning ?? false

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800/80">
        {/* App brand */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12z" opacity=".3"/>
                <path d="M10 4.5a.5.5 0 01.5.5v4.793l2.854 2.853a.5.5 0 01-.708.708l-3-3A.5.5 0 019.5 10V5a.5.5 0 01.5-.5z"/>
              </svg>
            </div>
            <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Stint Mgr</span>
          </div>

          {/* Race info */}
          {race ? (
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                {isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                )}
                <p className="text-sm font-semibold text-white truncate leading-tight">{race.name}</p>
              </div>
              <p className="text-xs text-gray-500 truncate">{race.track}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                <span>{race.durationHours}h</span>
                <span>·</span>
                <span>{race.drivers.length} driver{race.drivers.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Race progress bar */}
              {elapsed > 0 && (
                <div className="mt-2.5">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600 italic">Loading…</p>
          )}
        </div>

        <NavBar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  )
}
