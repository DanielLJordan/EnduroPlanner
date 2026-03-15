import { useState } from 'react'
import { parseIBTFile } from '../utils/ibtParser'
import type { Driver, DriverTelemetry } from '../types'

interface Props {
  driver: Driver
  onSave: (telemetry: DriverTelemetry) => void
  onClose: () => void
}

export default function DriverIBTModal({ driver, onSave, onClose }: Props) {
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState<DriverTelemetry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLaps, setShowLaps] = useState(false)

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.ibt')) {
      setError('Only .ibt files are supported here. Use the Car Setup section for CSV.')
      return
    }
    setError(null)
    setParsed(null)
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const result = parseIBTFile(e.target?.result as ArrayBuffer)
        setParsed({
          avgLapTimeSeconds: result.avgLapTimeSeconds,
          avgFuelPerLap: result.avgFuelPerLap,
          totalLaps: result.totalLaps,
          trackName: result.trackName,
          carName: result.carName,
          uploadedAt: new Date().toISOString(),
          laps: result.laps,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse IBT file')
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => { setError('Failed to read file'); setLoading(false) }
    reader.readAsArrayBuffer(file)
  }

  function formatLapTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = (sec % 60).toFixed(3).padStart(6, '0')
    return `${m}:${s}`
  }

  const bestLap = parsed
    ? [...parsed.laps].sort((a, b) => a.lapTimeSeconds - b.lapTimeSeconds)[0]
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ backgroundColor: driver.color }}
            >
              {driver.initials}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{driver.name}</div>
              <div className="text-gray-500 text-xs">Upload IBT Telemetry</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Existing data notice */}
          {driver.telemetry && !parsed && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 flex items-start gap-2">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5">
                <path d="M8 15A7 7 0 108 1a7 7 0 000 14zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
              <div className="text-xs text-blue-300">
                <span className="font-semibold">Existing data:</span>{' '}
                {driver.telemetry.totalLaps} laps · {driver.telemetry.avgLapTimeSeconds}s avg ·{' '}
                {driver.telemetry.trackName} · uploaded {new Date(driver.telemetry.uploadedAt).toLocaleDateString()}
                <br />
                <span className="text-blue-400/70">Uploading a new file will replace this.</span>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {!parsed && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragging
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              {loading ? (
                <div className="text-gray-400 text-sm">Parsing IBT file…</div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-500">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">
                    Drop <span className="text-blue-400 font-semibold">.ibt</span> file here
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    Found in <code className="bg-gray-800 px-1 rounded">Documents/iRacing/telemetry/</code>
                  </p>
                  <label className="inline-block cursor-pointer px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                    Browse file
                    <input
                      type="file"
                      accept=".ibt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFile(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"><path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.75 8.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm-.75-5a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0V4A.75.75 0 016 3.25z"/></svg>
              {error}
            </div>
          )}

          {/* Parsed result */}
          {parsed && (
            <div className="space-y-3">
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
                    <svg viewBox="0 0 12 12" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z"/></svg>
                    {parsed.totalLaps} laps parsed
                  </p>
                  <button
                    onClick={() => setParsed(null)}
                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    Replace
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  {parsed.trackName}
                  {parsed.carName ? ` · ${parsed.carName}` : ''}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Avg Lap</div>
                  <div className="font-mono text-white text-sm font-bold">{formatLapTime(parsed.avgLapTimeSeconds)}</div>
                </div>
                {bestLap && (
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Best Lap</div>
                    <div className="font-mono text-green-400 text-sm font-bold">{formatLapTime(bestLap.lapTimeSeconds)}</div>
                  </div>
                )}
                {parsed.avgFuelPerLap > 0 && (
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Fuel / Lap</div>
                    <div className="font-mono text-blue-300 text-sm font-bold">{parsed.avgFuelPerLap} L</div>
                  </div>
                )}
              </div>

              {/* Lap table toggle */}
              <button
                onClick={() => setShowLaps((v) => !v)}
                className="text-xs text-gray-500 hover:text-gray-300 underline"
              >
                {showLaps ? 'Hide' : 'Show'} all {parsed.laps.length} laps
              </button>

              {showLaps && (
                <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-700">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-800 text-gray-500">
                      <tr>
                        <th className="text-left px-3 py-1.5">Lap</th>
                        <th className="text-right px-3 py-1.5">Time</th>
                        <th className="text-right px-3 py-1.5">Fuel Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {parsed.laps.map((lap, i) => {
                        const isBest = bestLap && lap.lapTimeSeconds === bestLap.lapTimeSeconds && i === parsed.laps.indexOf(bestLap)
                        return (
                          <tr key={lap.lapNumber} className={`hover:bg-gray-800/40 ${isBest ? 'bg-green-900/20' : ''}`}>
                            <td className="px-3 py-1.5 text-gray-400 font-mono">{lap.lapNumber}</td>
                            <td className={`px-3 py-1.5 text-right font-mono ${isBest ? 'text-green-400 font-semibold' : 'text-white'}`}>
                              {formatLapTime(lap.lapTimeSeconds)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-blue-300">
                              {lap.fuelUsedLiters > 0 ? `${lap.fuelUsedLiters.toFixed(3)} L` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => parsed && onSave(parsed)}
            disabled={!parsed}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Save Telemetry
          </button>
        </div>
      </div>
    </div>
  )
}
