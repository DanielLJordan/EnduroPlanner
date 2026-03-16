import { useState, useEffect } from 'react'
import type { Stint, Driver } from '../types'

interface StintEditModalProps {
  stint: Stint | null
  drivers: Driver[]
  onSave: (stint: Omit<Stint, 'id'> | Stint) => void
  onDelete?: (stintId: string) => void
  onClose: () => void
  mode: 'create' | 'edit'
}

export default function StintEditModal({
  stint,
  drivers,
  onSave,
  onDelete,
  onClose,
  mode,
}: StintEditModalProps) {
  const [driverId, setDriverId] = useState(stint?.driverId ?? (drivers[0]?.id ?? ''))
  const [plannedStartMinute, setPlannedStartMinute] = useState(stint?.plannedStartMinute ?? 0)
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState(
    stint?.plannedDurationMinutes ?? 60
  )
  const [fuelLoad, setFuelLoad] = useState(stint?.fuelLoad ?? 0)
  const [tireSet, setTireSet] = useState(stint?.tireSet ?? '')
  const [notes, setNotes] = useState(stint?.notes ?? '')

  useEffect(() => {
    if (stint) {
      setDriverId(stint.driverId)
      setPlannedStartMinute(stint.plannedStartMinute)
      setPlannedDurationMinutes(stint.plannedDurationMinutes)
      setFuelLoad(stint.fuelLoad)
      setTireSet(stint.tireSet)
      setNotes(stint.notes)
    }
  }, [stint])

  const selectedDriver = drivers.find((d) => d.id === driverId)

  const warnings: string[] = []
  if (selectedDriver) {
    if (plannedDurationMinutes > selectedDriver.maxStintMinutes) {
      warnings.push(
        `Duration exceeds driver max stint time (${(selectedDriver.maxStintMinutes / 60).toFixed(1)}h)`
      )
    }
    if (plannedDurationMinutes < selectedDriver.minStintMinutes) {
      warnings.push(
        `Duration is below driver min stint time (${(selectedDriver.minStintMinutes / 60).toFixed(1)}h)`
      )
    }
  }

  const handleSave = () => {
    const stintData = {
      driverId,
      plannedStartMinute,
      plannedDurationMinutes,
      fuelLoad,
      tireSet,
      notes,
      status: stint?.status ?? ('scheduled' as const),
      actualStartMinute: stint?.actualStartMinute,
      actualDurationMinutes: stint?.actualDurationMinutes,
    }
    if (mode === 'edit' && stint) {
      onSave({ ...stintData, id: stint.id })
    } else {
      onSave(stintData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'create' ? 'Add Stint' : 'Edit Stint'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Driver select */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Driver</label>
            <div className="relative">
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-blue-500 appearance-none"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.initials})
                  </option>
                ))}
              </select>
              {selectedDriver && (
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
                  style={{ backgroundColor: selectedDriver.color }}
                />
              )}
            </div>
            {selectedDriver && (
              <p className="text-xs text-gray-500 mt-1">
                Stint range: {(selectedDriver.minStintMinutes / 60).toFixed(1)}h – {(selectedDriver.maxStintMinutes / 60).toFixed(1)}h
              </p>
            )}
          </div>

          {/* Planned Start */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Planned Start (min into race)
              </label>
              <input
                type="number"
                min={0}
                value={plannedStartMinute}
                onChange={(e) => setPlannedStartMinute(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min={1}
                value={plannedDurationMinutes}
                onChange={(e) => setPlannedDurationMinutes(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Fuel + Tire */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fuel Load (L)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={fuelLoad}
                onChange={(e) => setFuelLoad(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tire Set</label>
              <input
                type="text"
                value={tireSet}
                onChange={(e) => setTireSet(e.target.value)}
                placeholder="e.g. Set 1"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
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

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-md p-3 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-yellow-400 text-sm">
                  ⚠️ {w}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div>
            {mode === 'edit' && onDelete && stint && (
              <button
                onClick={() => {
                  onDelete(stint.id)
                  onClose()
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
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
    </div>
  )
}
