import { useState, type FormEvent } from 'react'

const TEAM_PASSWORD = import.meta.env.VITE_TEAM_PASSWORD ?? 'arete'
const STORAGE_KEY = 'stint-manager-auth'

function isAuthenticated(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === 'true'
}

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(isAuthenticated)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)

  if (authed) return <>{children}</>

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (password === TEAM_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      setAuthed(true)
    } else {
      setError(true)
      setShaking(true)
      setPassword('')
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-white">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12z" opacity=".3"/>
              <path d="M10 4.5a.5.5 0 01.5.5v4.793l2.854 2.853a.5.5 0 01-.708.708l-3-3A.5.5 0 019.5 10V5a.5.5 0 01.5-.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Stint Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Team access only</p>
        </div>

        {/* Card */}
        <div
          className={`bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl transition-transform ${
            shaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
          }`}
          style={shaking ? { animation: 'shake 0.4s ease-in-out' } : {}}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">
                Team Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false) }}
                placeholder="Enter team password"
                autoFocus
                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors ${
                  error
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-700 focus:border-blue-500'
                }`}
              />
              {error && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                    <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.75 8.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm-.75-5a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0V4A.75.75 0 016 3.25z"/>
                  </svg>
                  Incorrect password. Try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!password}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Enter
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          iRacing Endurance Race Management
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}
