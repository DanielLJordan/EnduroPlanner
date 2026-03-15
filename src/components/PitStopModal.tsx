import { useState } from 'react'
import type { PitStop } from '../types'

interface PitStopModalProps {
  stintId?: string
  pitStop?: PitStop | null
  currentMinute?: number
  onSave: (pitStop: Omit<PitStop, 'id'>) => void
  onClose: () => void
}

export default function PitStopModal({
  stintId,
  pitStop,
  currentMinute = 0,
  onSave,
  onClose,
}: PitStopModalProps) {
  const [localStintId] = useState(pitStop?.stintId ?? stintId ?? '')
  const [minute, setMinute] = useState(pitStop?.minute ?? currentMinute)
  const [fuelAdded, setFuelAdded] = useState(pitStop?.fuelAdded ?? 0)
  const [tireChange, setTireChange] = useState(pitStop?.tireChange ?? false)
  const [driverSwap, setDriverSwap] = useState(pitStop?.driverSwap ?? false)
  const [durationSeconds, setDurationSeconds] = useState(pitStop?.durationSeconds ?? 0)
  const [notes, setNotes] = useState(pitStop?.notes ?? '')

  const handleSave = () => {
    onSave({
      stintId: localStintId,
      minute,
      fuelAdded,
      tireChange,
      driverSwap,
      durationSeconds,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Log Pit Stop</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stint ID (readonly) */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stint ID</label>
            <input
              type="text"
              value={localStintId}
              readOnly
              className="w-full bg-gray-800/50 border border-gray-700 text-gray-500 rounded-md px-3 py-2 cursor-not-allowed text-sm font-mono"
            />
          </div>

          {/* Minute */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Minute into Race</label>
            <input
              type="number"
              min={0}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Fuel Added */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fuel Added (L)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={fuelAdded}
              onChange={(e) => setFuelAdded(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tireChange}
                onChange={(e) => setTireChange(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-300">Tire Change</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={driverSwap}
                onChange={(e) => setDriverSwap(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-300">Driver Swap</span>
            </label>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stop Duration (seconds)</label>
            <input
              type="number"
              min={0}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
