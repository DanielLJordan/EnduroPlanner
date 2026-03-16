import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App'
import LoginGate from './components/LoginGate'
import './index.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

if (!convexUrl) {
  document.getElementById('root')!.innerHTML = `
    <div style="min-height:100vh;background:#0a0f1e;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#f1f5f9;text-align:center;padding:2rem">
      <div>
        <div style="font-size:2rem;font-weight:700;margin-bottom:0.5rem">EnduroPlanner</div>
        <div style="color:#94a3b8;margin-bottom:1.5rem">Configuration error</div>
        <div style="background:#1e293b;border:1px solid #334155;border-radius:0.75rem;padding:1.25rem;font-size:0.875rem;color:#94a3b8;max-width:420px">
          <code style="color:#3b82f6">VITE_CONVEX_URL</code> is not set.<br/><br/>
          Add it to your Cloudflare Pages environment variables and redeploy.
        </div>
      </div>
    </div>
  `
} else {
  const convex = new ConvexReactClient(convexUrl)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ConvexProvider client={convex}>
        <BrowserRouter>
          <LoginGate>
            <App />
          </LoginGate>
        </BrowserRouter>
      </ConvexProvider>
    </React.StrictMode>
  )
}
