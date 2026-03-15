import { useState } from 'react'
import useRaceStore from '../store/useRaceStore'
import type { Driver } from '../types'

type PrefValue = 'prefer' | 'neutral' | 'avoid'

interface SurveyForm {
  availableFromMinute: string
  availableToMinute: string
  rainPreference: PrefValue
  nightPreference: PrefValue
  prefersRaceStart: boolean
  maxConsecutiveStints: string
  notes: string
}

function SegmentedPref({
  value,
  onChange,
  label,
}: {
  value: PrefValue
  onChange: (v: PrefValue) => void
  label: string
}) {
  const options: { val: PrefValue; icon: string }[] = [
    { val: 'prefer', icon: label === 'Rain' ? '🌧' : '🌙' },
    { val: 'neutral', icon: '' },
    { val: 'avoid', icon: '' },
  ]
  return (
    <div className="flex rounded-md overflow-hidden border border-gray-700">
      {options.map((opt) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
            value === opt.val
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {opt.icon ? `${opt.icon} ` : ''}
          {opt.val.charAt(0).toUpperCase() + opt.val.slice(1)}
        </button>
      ))}
    </div>
  )
}

function PillToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

interface Props {
  driver: Driver
  raceId: string
  onClose: () => void
}

export default function DriverSurveyModal({ driver, raceId, onClose }: Props) {
  const { updateDriver } = useRaceStore()

  const [form, setForm] = useState<SurveyForm>({
    availableFromMinute: String(driver.availableFromMinute ?? 0),
    availableToMinute: String(driver.availableToMinute ?? 9999),
    rainPreference: driver.rainPreference ?? 'neutral',
    nightPreference: driver.nightPreference ?? 'neutral',
    prefersRaceStart: driver.prefersRaceStart ?? false,
    maxConsecutiveStints: String(driver.maxConsecutiveStints ?? 3),
    notes: driver.notes ?? '',
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateDriver(raceId, driver.id, {
      availableFromMinute: parseFloat(form.availableFromMinute) || 0,
      availableToMinute: parseFloat(form.availableToMinute) || 9999,
      rainPreference: form.rainPreference,
      nightPreference: form.nightPreference,
      prefersRaceStart: form.prefersRaceStart,
      maxConsecutiveStints: parseFloat(form.maxConsecutiveStints) || 3,
      notes: form.notes,
    })
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-800"
          style={{ borderTopColor: driver.color, borderTopWidth: 3, borderTopStyle: 'solid' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: driver.color }}
            >
              {driver.initials}
            </div>
            <div>
              <div className="text-white font-semibold">{driver.name}</div>
              <div className="text-xs text-gray-500">Availability &amp; Preferences Survey</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Availability window */}
          <div>
            <label className="block text-sm text-gray-300 font-medium mb-2">Availability Window</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Available From (min)</label>
                <input
                  type="number"
                  min={0}
                  value={form.availableFromMinute}
                  onChange={(e) => setForm((f) => ({ ...f, availableFromMinute: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Available To (min)</label>
                <input
                  type="number"
                  min={0}
                  value={form.availableToMinute}
                  onChange={(e) => setForm((f) => ({ ...f, availableToMinute: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">Use 9999 for end of race</p>
              </div>
            </div>
          </div>

          {/* Rain preference */}
          <div>
            <label className="block text-sm text-gray-300 font-medium mb-2">Rain Preference</label>
            <SegmentedPref
              label="Rain"
              value={form.rainPreference}
              onChange={(v) => setForm((f) => ({ ...f, rainPreference: v }))}
            />
          </div>

          {/* Night preference */}
          <div>
            <label className="block text-sm text-gray-300 font-medium mb-2">Night Preference</label>
            <SegmentedPref
              label="Night"
              value={form.nightPreference}
              onChange={(v) => setForm((f) => ({ ...f, nightPreference: v }))}
            />
          </div>

          {/* Prefers race start */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300 font-medium">Prefers Race Start</label>
            <PillToggle
              checked={form.prefersRaceStart}
              onChange={(v) => setForm((f) => ({ ...f, prefersRaceStart: v }))}
            />
          </div>

          {/* Max consecutive stints */}
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-gray-300 font-medium">Max Consecutive Stints</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.maxConsecutiveStints}
              onChange={(e) => setForm((f) => ({ ...f, maxConsecutiveStints: e.target.value }))}
              className="w-20 bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-right"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-300 font-medium mb-2">Notes / Comments</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes about this driver's availability or preferences..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 flex gap-3">
          <button
            onClick={handleSave}
            className={`flex-1 px-4 py-2 text-white rounded-md text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-600 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saved ? '✓ Saved!' : 'Save Preferences'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
