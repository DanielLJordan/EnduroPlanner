import { useState } from 'react'
import { useParams } from 'react-router-dom'
import useRaceStore from '../store/useRaceStore'
import {
  maxLapsOnFuel,
  stintDurationMinutes,
  estimatedPitStops,
  lapsFromMinutes,
  fuelUsedInStint,
} from '../utils/fuel'
import { formatLapTime, parseLapTime } from '../utils/time'
import { minutesToHHMM } from '../utils/time'

function StatCard({
  label,
  value,
  sub,
  accent = false,
  color,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  color?: string
}) {
  return (
    <div
      className={`rounded-xl p-4 text-center border ${
        accent
          ? 'bg-blue-950/50 border-blue-800'
          : 'bg-gray-800/60 border-gray-700/50'
      }`}
    >
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div
        className={`text-3xl font-bold font-mono ${color ?? (accent ? 'text-blue-300' : 'text-white')}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

function SliderRow({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  accentClass = 'accent-blue-500',
}: {
  label: string
  value: number
  displayValue: string
  min: number
  max: number
  step: number
  onChange: (v: string) => void
  accentClass?: string
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-white font-mono text-sm bg-gray-800 px-2 py-0.5 rounded">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-1.5 rounded-full appearance-none bg-gray-700 ${accentClass} cursor-pointer`}
      />
      <div className="flex justify-between text-xs text-gray-700 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export default function FuelPlanner() {
  const { raceId } = useParams<{ raceId: string }>()
  const { races } = useRaceStore()
  const race = races.find((r) => r.id === raceId)

  const [tankSizeStr, setTankSizeStr] = useState(String(race?.car.tankSizeLiters ?? 70))
  const [burnRateStr, setBurnRateStr] = useState(String(race?.car.burnRatePerLap ?? 3.0))
  const [lapTimeStr, setLapTimeStr] = useState(() => formatLapTime(race?.car.avgLapTimeSeconds ?? 90))
  const [safetyMarginStr, setSafetyMarginStr] = useState('5')

  const tankSize = parseFloat(tankSizeStr) || 0
  const burnRate = parseFloat(burnRateStr) || 0
  const lapTime = parseLapTime(lapTimeStr) || 0
  const safetyMargin = parseFloat(safetyMarginStr) || 0

  const raceDurationHours = race?.durationHours ?? 6

  const maxLaps = maxLapsOnFuel(tankSize, burnRate, safetyMargin)
  const stintDurMin = stintDurationMinutes(maxLaps, lapTime)
  const totalRaceLaps = lapsFromMinutes(raceDurationHours * 60, lapTime)
  const fuelNeededTotal = fuelUsedInStint(totalRaceLaps, burnRate)
  const pitStopCount = estimatedPitStops(raceDurationHours, stintDurMin)
  const fuelPerStop = pitStopCount > 0 ? fuelNeededTotal / (pitStopCount + 1) : fuelNeededTotal
  const safetyFuel = tankSize * (safetyMargin / 100)

  const handleLoadFromRace = () => {
    if (!race) return
    setTankSizeStr(String(race.car.tankSizeLiters))
    setBurnRateStr(String(race.car.burnRatePerLap))
    setLapTimeStr(formatLapTime(race.car.avgLapTimeSeconds))
  }

  const barLaps = Math.min(maxLaps, 50)
  const barData = Array.from({ length: barLaps }, (_, i) => {
    const fuelLeft = tankSize - (i + 1) * burnRate
    return Math.max(0, fuelLeft)
  })

  if (!race) {
    return <div className="p-8 text-gray-400">Race not found.</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fuel Planner</h1>
          <p className="text-sm text-gray-500 mt-0.5">{race.name} · {raceDurationHours}h race</p>
        </div>
        <button
          onClick={handleLoadFromRace}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd"/>
          </svg>
          Load from Setup
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT: Sliders */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Parameters</h2>

          <SliderRow
            label="Tank Size"
            value={tankSize}
            displayValue={`${tankSize} L`}
            min={10} max={100} step={0.5}
            onChange={setTankSizeStr}
          />
          <SliderRow
            label="Burn Rate"
            value={burnRate}
            displayValue={`${burnRate.toFixed(1)} L/lap`}
            min={0.5} max={5} step={0.1}
            onChange={setBurnRateStr}
          />
          <SliderRow
            label="Avg Lap Time"
            value={lapTime}
            displayValue={formatLapTime(lapTime)}
            min={60} max={300} step={1}
            onChange={(s) => setLapTimeStr(formatLapTime(parseFloat(s) || 90))}
          />
          <SliderRow
            label="Safety Margin"
            value={safetyMargin}
            displayValue={`${safetyMargin}%`}
            min={0} max={20} step={1}
            onChange={setSafetyMarginStr}
            accentClass="accent-yellow-500"
          />

          {/* Manual inputs */}
          <div className="border-t border-gray-800 pt-4 grid grid-cols-2 gap-2.5">
            {[
              { label: 'Tank (L)', val: tankSizeStr, set: setTankSizeStr, step: '0.5' },
              { label: 'Burn (L/lap)', val: burnRateStr, set: setBurnRateStr, step: '0.1' },
              { label: 'Safety (%)', val: safetyMarginStr, set: setSafetyMarginStr, step: '1' },
            ].map(({ label, val, set, step }) => (
              <div key={label}>
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <input
                  type="number"
                  value={val}
                  step={step}
                  onChange={(e) => set(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Lap Time (M:SS)</label>
              <input
                type="text"
                value={lapTimeStr}
                onChange={(e) => {
                  setLapTimeStr(e.target.value)
                }}
                onBlur={() => {
                  const sec = parseLapTime(lapTimeStr)
                  if (sec > 0) setLapTimeStr(formatLapTime(sec))
                }}
                placeholder="1:32.000"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Primary stat */}
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-5 text-center">
            <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Max Laps Per Tank</div>
            <div className="text-6xl font-bold font-mono text-blue-300">{maxLaps}</div>
            <div className="text-sm text-blue-500/70 mt-1">laps · {minutesToHHMM(stintDurMin)} stint</div>
          </div>

          {/* Secondary stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Estimated Pit Stops"
              value={String(pitStopCount)}
              sub={`for ${raceDurationHours}h race`}
            />
            <StatCard
              label="Fuel Per Stop"
              value={`${fuelPerStop.toFixed(1)} L`}
              sub="recommended refuel"
            />
            <StatCard
              label="Total Fuel Needed"
              value={`${fuelNeededTotal.toFixed(1)} L`}
              sub={`${totalRaceLaps} laps total`}
            />
            <StatCard
              label="Safety Reserve"
              value={`${safetyFuel.toFixed(1)} L`}
              sub={`${safetyMargin}% of tank`}
              color="text-yellow-400"
            />
          </div>

          {/* Usable fuel info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">Usable Fuel</span>
              <span className="text-sm font-mono text-white">{(tankSize - safetyFuel).toFixed(1)} L</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${((tankSize - safetyFuel) / tankSize) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-700 mt-1">
              <span>0 L</span>
              <span className="text-yellow-600">{safetyFuel.toFixed(1)} L reserve</span>
              <span>{tankSize} L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fuel bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">Fuel Level Across Stint</h2>
          <span className="text-xs text-gray-600">{barLaps} laps shown</span>
        </div>
        {barLaps > 0 ? (
          <>
            <div className="flex items-end gap-px h-28 overflow-x-auto pb-1">
              <div
                title={`Start: ${tankSize.toFixed(1)} L`}
                style={{
                  height: '100%',
                  minWidth: 6,
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.9,
                }}
              />
              {barData.map((fuel, i) => {
                const pct = (fuel / tankSize) * 100
                const isLow = fuel <= safetyFuel
                const isCritical = fuel <= 0
                return (
                  <div
                    key={i}
                    title={`Lap ${i + 1}: ${fuel.toFixed(1)} L`}
                    style={{
                      height: `${Math.max(isCritical ? 0 : 3, pct)}%`,
                      minWidth: 6,
                      flex: 1,
                      backgroundColor: isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#3b82f6',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.1s',
                      opacity: 0.85,
                    }}
                  />
                )
              })}
            </div>
            <div className="border-t border-gray-800 mt-1 pt-2 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 opacity-85 inline-block" />Normal</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 opacity-85 inline-block" />Below safety ({safetyFuel.toFixed(1)} L)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 opacity-85 inline-block" />Empty</span>
              <span className="ml-auto text-gray-600">Start: {tankSize.toFixed(1)} L → Lap {barLaps}: {barData[barData.length - 1]?.toFixed(1) ?? 0} L</span>
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-sm">Adjust parameters to see fuel chart.</p>
        )}
      </div>
    </div>
  )
}
