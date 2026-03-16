import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

export default function LoginGate({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          {/* Background grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                  <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12z" opacity=".3"/>
                  <path d="M10 4.5a.5.5 0 01.5.5v4.793l2.854 2.853a.5.5 0 01-.708.708l-3-3A.5.5 0 019.5 10V5a.5.5 0 01.5-.5z"/>
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-xl tracking-tight">EnduroPlanner</div>
                <div className="text-gray-500 text-xs">iRacing endurance race management</div>
              </div>
            </div>

            <SignIn
              appearance={{
                variables: {
                  colorPrimary: '#3b82f6',
                  colorBackground: '#111827',
                  colorInputBackground: '#1f2937',
                  colorInputText: '#f1f5f9',
                  colorText: '#f1f5f9',
                  colorTextSecondary: '#94a3b8',
                  colorNeutral: '#374151',
                  borderRadius: '0.75rem',
                },
                elements: {
                  card: 'bg-gray-900 border border-gray-800 shadow-2xl',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-gray-400',
                  socialButtonsBlockButton: 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700',
                  dividerLine: 'bg-gray-700',
                  dividerText: 'text-gray-500',
                  formFieldLabel: 'text-gray-400',
                  formFieldInput: 'bg-gray-800 border-gray-700 text-white',
                  footerActionLink: 'text-blue-400 hover:text-blue-300',
                },
              }}
            />
          </div>
        </div>
      </SignedOut>
    </>
  )
}
