import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RaceSetup from './pages/RaceSetup'
import StintScheduler from './pages/StintScheduler'
import LiveDashboard from './pages/LiveDashboard'
import PitStopLog from './pages/PitStopLog'
import FuelPlanner from './pages/FuelPlanner'
import DriverStats from './pages/DriverStats'
import Debrief from './pages/Debrief'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/race/:raceId" element={<Layout />}>
        <Route path="setup" element={<RaceSetup />} />
        <Route path="scheduler" element={<StintScheduler />} />
        <Route path="dashboard" element={<LiveDashboard />} />
        <Route path="pitstops" element={<PitStopLog />} />
        <Route path="fuel" element={<FuelPlanner />} />
        <Route path="drivers" element={<DriverStats />} />
        <Route path="debrief" element={<Debrief />} />
      </Route>
    </Routes>
  )
}
