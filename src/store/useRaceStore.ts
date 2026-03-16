import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { RaceEvent, Driver, Stint, PitStop, Incident } from '../types'

// ── Local store for UI state only ─────────────────────────────────────────────
const useLocalStore = create<{
  activeRaceId: string | null
  setActiveRace: (id: string | null) => void
}>()(
  persist(
    (set) => ({
      activeRaceId: null,
      setActiveRace: (id) => set({ activeRaceId: id }),
    }),
    { name: 'ep-active-race' }
  )
)

// ── Main hook — same interface as before ──────────────────────────────────────
export default function useRaceStore() {
  const { activeRaceId, setActiveRace } = useLocalStore()
  const races: RaceEvent[] = useQuery(api.races.list) ?? []

  const _create       = useMutation(api.races.create)
  const _remove       = useMutation(api.races.remove)
  const _updateRace   = useMutation(api.races.updateRace)
  const _updateCar    = useMutation(api.races.updateCar)
  const _addDriver    = useMutation(api.races.addDriver)
  const _updateDriver = useMutation(api.races.updateDriver)
  const _removeDriver = useMutation(api.races.removeDriver)
  const _addStint     = useMutation(api.races.addStint)
  const _updateStint  = useMutation(api.races.updateStint)
  const _deleteStint  = useMutation(api.races.deleteStint)
  const _replaceStints = useMutation(api.races.replaceStints)
  const _addPitStop   = useMutation(api.races.addPitStop)
  const _updatePitStop = useMutation(api.races.updatePitStop)
  const _deletePitStop = useMutation(api.races.deletePitStop)
  const _addIncident  = useMutation(api.races.addIncident)
  const _deleteIncident = useMutation(api.races.deleteIncident)
  const _startRace    = useMutation(api.races.startRace)
  const _pauseRace    = useMutation(api.races.pauseRace)
  const _updateElapsed = useMutation(api.races.updateElapsed)

  return {
    races,
    activeRaceId,
    setActiveRace,

    // Returns a Promise<string> — callers that navigate after creating must await
    createRace: async (
      raceData: Omit<RaceEvent, 'id' | 'drivers' | 'stints' | 'pitStops' | 'raceState'>
    ): Promise<string> => {
      const id = uuidv4()
      await _create({ raceId: id, ...raceData })
      return id
    },

    updateRace: (id: string, updates: Partial<RaceEvent>) => {
      _updateRace({ raceId: id, updates })
    },

    deleteRace: (id: string) => {
      _remove({ raceId: id })
    },

    updateCar: (raceId: string, car: Partial<RaceEvent['car']>) => {
      _updateCar({ raceId, car })
    },

    addDriver: (raceId: string, driverData: Omit<Driver, 'id'>) => {
      const driver: Driver = {
        ...driverData,
        id: uuidv4(),
        rainPreference: driverData.rainPreference ?? 'neutral',
        nightPreference: driverData.nightPreference ?? 'neutral',
        prefersRaceStart: driverData.prefersRaceStart ?? false,
        maxConsecutiveStints: driverData.maxConsecutiveStints ?? 3,
        timezoneOffset: driverData.timezoneOffset ?? 0,
        availableHours: driverData.availableHours ?? [],
        notes: driverData.notes ?? '',
      }
      _addDriver({ raceId, driver })
    },

    updateDriver: (raceId: string, driverId: string, updates: Partial<Driver>) => {
      _updateDriver({ raceId, driverId, updates })
    },

    removeDriver: (raceId: string, driverId: string) => {
      _removeDriver({ raceId, driverId })
    },

    addStint: (raceId: string, stintData: Omit<Stint, 'id'>) => {
      const stint: Stint = { ...stintData, id: uuidv4() }
      _addStint({ raceId, stint })
    },

    updateStint: (raceId: string, stintId: string, updates: Partial<Stint>) => {
      _updateStint({ raceId, stintId, updates })
    },

    deleteStint: (raceId: string, stintId: string) => {
      _deleteStint({ raceId, stintId })
    },

    replaceStints: (raceId: string, stints: Stint[]) => {
      _replaceStints({ raceId, stints })
    },

    addPitStop: (raceId: string, pitStopData: Omit<PitStop, 'id'>) => {
      const pitStop: PitStop = { ...pitStopData, id: uuidv4() }
      _addPitStop({ raceId, pitStop })
    },

    updatePitStop: (raceId: string, pitStopId: string, updates: Partial<PitStop>) => {
      _updatePitStop({ raceId, pitStopId, updates })
    },

    deletePitStop: (raceId: string, pitStopId: string) => {
      _deletePitStop({ raceId, pitStopId })
    },

    addIncident: (raceId: string, incidentData: Omit<Incident, 'id'>) => {
      const incident: Incident = { ...incidentData, id: uuidv4() }
      _addIncident({ raceId, incident })
    },

    deleteIncident: (raceId: string, incidentId: string) => {
      _deleteIncident({ raceId, incidentId })
    },

    startRace: (raceId: string) => { _startRace({ raceId }) },
    pauseRace: (raceId: string) => { _pauseRace({ raceId }) },
    updateElapsed: (raceId: string, seconds: number) => {
      _updateElapsed({ raceId, seconds })
    },

    getActiveRace: (): RaceEvent | null => {
      if (!activeRaceId) return null
      return races.find((r) => r.id === activeRaceId) ?? null
    },
  }
}
