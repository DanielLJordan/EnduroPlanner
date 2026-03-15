export function maxLapsOnFuel(tankSize: number, burnRate: number, safetyMarginPct: number): number {
  if (burnRate <= 0) return 0
  const usableFuel = tankSize * (1 - safetyMarginPct / 100)
  return Math.floor(usableFuel / burnRate)
}

export function stintDurationMinutes(maxLaps: number, lapTimeSeconds: number): number {
  return (maxLaps * lapTimeSeconds) / 60
}

export function fuelUsedInStint(laps: number, burnRate: number): number {
  return laps * burnRate
}

export function lapsFromMinutes(minutes: number, lapTimeSeconds: number): number {
  if (lapTimeSeconds <= 0) return 0
  return Math.floor((minutes * 60) / lapTimeSeconds)
}

export function estimatedPitStops(raceDurationHours: number, stintDurMinutes: number): number {
  if (stintDurMinutes <= 0) return 0
  const totalMinutes = raceDurationHours * 60
  return Math.max(0, Math.ceil(totalMinutes / stintDurMinutes) - 1)
}
