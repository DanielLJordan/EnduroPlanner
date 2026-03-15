import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import LoginGate from './components/LoginGate'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LoginGate>
        <App />
      </LoginGate>
    </BrowserRouter>
  </React.StrictMode>
)
