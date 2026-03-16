export interface DriverTelemetry {
  avgLapTimeSeconds: number
  avgFuelPerLap: number
  totalLaps: number
  trackName: string
  carName: string
  uploadedAt: string   // ISO date string
  laps: {
    lapNumber: number
    lapTimeSeconds: number
    fuelUsedLiters: number
  }[]
}

export interface Driver {
  id: string
  name: string
  initials: string
  iracingId: string
  irating: number
  color: string
  minStintMinutes: number
  maxStintMinutes: number
  rainPreference: 'prefer' | 'neutral' | 'avoid'
  nightPreference: 'prefer' | 'neutral' | 'avoid'
  prefersRaceStart: boolean
  maxConsecutiveStints: number
  availableFromMinute: number
  availableToMinute: number
  notes: string
  timezone: string            // IANA timezone e.g. "America/New_York" (empty = not set)
  telemetry?: DriverTelemetry
}

export interface Stint {
  id: string
  driverId: string
  plannedStartMinute: number
  plannedDurationMinutes: number
  actualStartMinute?: number
  actualDurationMinutes?: number
  fuelLoad: number
  tireSet: string
  notes: string
  status: 'scheduled' | 'active' | 'completed'
}

export interface PitStop {
  id: string
  stintId: string
  minute: number
  fuelAdded: number
  tireChange: boolean
  driverSwap: boolean
  durationSeconds: number
  notes: string
}

export interface Incident {
  id: string
  minute: number
  note: string
}

export interface RaceEvent {
  id: string
  name: string
  track: string
  durationHours: number
  startTime: string
  drivers: Driver[]
  stints: Stint[]
  pitStops: PitStop[]
  teamNotes: string
  car: {
    name: string
    tankSizeLiters: number
    burnRatePerLap: number
    avgLapTimeSeconds: number
    tireStintLimitLaps: number
  }
  raceState: {
    isRunning: boolean
    elapsedSeconds: number
    incidents: Incident[]
  }
}
