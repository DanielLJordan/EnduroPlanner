export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function secondsToMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format lap time as M:SS.mmm  e.g. 92.456 → "1:32.456" */
export function formatLapTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

/** Parse lap time input: accepts "92", "1:32", "1:32.5" → seconds */
export function parseLapTime(str: string): number {
  const s = str.trim()
  if (s.includes(':')) {
    const [mStr, sStr] = s.split(':')
    return (parseInt(mStr) || 0) * 60 + (parseFloat(sStr) || 0)
  }
  return parseFloat(s) || 0
}
