import { NavLink, useParams, Link } from 'react-router-dom'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
}

const ScheduleIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
  </svg>
)
const DashboardIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
  </svg>
)
const PitIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
)
const FuelIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h6a2 2 0 012 2v3h1a2 2 0 012 2v5a1 1 0 01-1 1H4a2 2 0 01-2-2V5zm8 8V8H5v5h6zm2-5v5h1V8h-1z" clipRule="evenodd"/>
  </svg>
)
const DriversIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
  </svg>
)
const SettingsIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
)
const DebriefIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd"/>
  </svg>
)

export default function NavBar() {
  const { raceId } = useParams<{ raceId: string }>()

  const navItems: NavItem[] = [
    { label: 'Schedule', icon: <ScheduleIcon />, path: `/race/${raceId}/scheduler` },
    { label: 'Dashboard', icon: <DashboardIcon />, path: `/race/${raceId}/dashboard` },
    { label: 'Pit Stops', icon: <PitIcon />, path: `/race/${raceId}/pitstops` },
    { label: 'Fuel', icon: <FuelIcon />, path: `/race/${raceId}/fuel` },
    { label: 'Drivers', icon: <DriversIcon />, path: `/race/${raceId}/drivers` },
    { label: 'Debrief', icon: <DebriefIcon />, path: `/race/${raceId}/debrief` },
    { label: 'Setup', icon: <SettingsIcon />, path: `/race/${raceId}/setup` },
  ]

  return (
    <nav className="flex flex-col flex-1 px-2 py-3 gap-0.5">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
              isActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
              )}
              <span className={isActive ? 'text-blue-400' : 'text-gray-500'}>{item.icon}</span>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}

      <div className="flex-1" />

      <div className="border-t border-gray-800 pt-2 mt-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
          </svg>
          <span>All Races</span>
        </Link>
      </div>
    </nav>
  )
}
