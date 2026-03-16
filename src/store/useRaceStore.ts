import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { RaceEvent, Driver, Stint, PitStop, Incident } from '../types'

interface RaceStore {
  races: RaceEvent[]
  activeRaceId: string | null

  // Race actions
  createRace: (race: Omit<RaceEvent, 'id' | 'drivers' | 'stints' | 'pitStops' | 'raceState'>) => string
  updateRace: (id: string, updates: Partial<RaceEvent>) => void
  deleteRace: (id: string) => void
  setActiveRace: (id: string | null) => void

  // Driver actions
  addDriver: (raceId: string, driver: Omit<Driver, 'id'>) => void
  updateDriver: (raceId: string, driverId: string, updates: Partial<Driver>) => void
  removeDriver: (raceId: string, driverId: string) => void

  // Stint actions
  addStint: (raceId: string, stint: Omit<Stint, 'id'>) => void
  updateStint: (raceId: string, stintId: string, updates: Partial<Stint>) => void
  deleteStint: (raceId: string, stintId: string) => void

  // PitStop actions
  addPitStop: (raceId: string, pitStop: Omit<PitStop, 'id'>) => void
  updatePitStop: (raceId: string, pitStopId: string, updates: Partial<PitStop>) => void
  deletePitStop: (raceId: string, pitStopId: string) => void

  // Incident actions
  addIncident: (raceId: string, incident: Omit<Incident, 'id'>) => void
  deleteIncident: (raceId: string, incidentId: string) => void

  // Race state actions
  startRace: (raceId: string) => void
  pauseRace: (raceId: string) => void
  updateElapsed: (raceId: string, seconds: number) => void

  // Car actions
  updateCar: (raceId: string, car: Partial<RaceEvent['car']>) => void

  // Selector
  getActiveRace: () => RaceEvent | null
}

const useRaceStore = create<RaceStore>()(
  persist(
    (set, get) => ({
      races: [],
      activeRaceId: null,

      createRace: (raceData) => {
        const id = uuidv4()
        const newRace: RaceEvent = {
          ...raceData,
          id,
          drivers: [],
          stints: [],
          pitStops: [],
          teamNotes: '',
          raceState: {
            isRunning: false,
            elapsedSeconds: 0,
            incidents: [],
          },
        }
        set((state) => ({ races: [...state.races, newRace] }))
        return id
      },

      updateRace: (id, updates) => {
        set((state) => ({
          races: state.races.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }))
      },

      deleteRace: (id) => {
        set((state) => ({
          races: state.races.filter((r) => r.id !== id),
          activeRaceId: state.activeRaceId === id ? null : state.activeRaceId,
        }))
      },

      setActiveRace: (id) => {
        set({ activeRaceId: id })
      },

      addDriver: (raceId, driverData) => {
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
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId ? { ...r, drivers: [...r.drivers, driver] } : r
          ),
        }))
      },

      updateDriver: (raceId, driverId, updates) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? {
                  ...r,
                  drivers: r.drivers.map((d) =>
                    d.id === driverId ? { ...d, ...updates } : d
                  ),
                }
              : r
          ),
        }))
      },

      removeDriver: (raceId, driverId) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? { ...r, drivers: r.drivers.filter((d) => d.id !== driverId) }
              : r
          ),
        }))
      },

      addStint: (raceId, stintData) => {
        const stint: Stint = { ...stintData, id: uuidv4() }
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId ? { ...r, stints: [...r.stints, stint] } : r
          ),
        }))
      },

      updateStint: (raceId, stintId, updates) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? {
                  ...r,
                  stints: r.stints.map((s) =>
                    s.id === stintId ? { ...s, ...updates } : s
                  ),
                }
              : r
          ),
        }))
      },

      deleteStint: (raceId, stintId) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? { ...r, stints: r.stints.filter((s) => s.id !== stintId) }
              : r
          ),
        }))
      },

      addPitStop: (raceId, pitStopData) => {
        const pitStop: PitStop = { ...pitStopData, id: uuidv4() }
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId ? { ...r, pitStops: [...r.pitStops, pitStop] } : r
          ),
        }))
      },

      updatePitStop: (raceId, pitStopId, updates) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? {
                  ...r,
                  pitStops: r.pitStops.map((p) =>
                    p.id === pitStopId ? { ...p, ...updates } : p
                  ),
                }
              : r
          ),
        }))
      },

      deletePitStop: (raceId, pitStopId) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? { ...r, pitStops: r.pitStops.filter((p) => p.id !== pitStopId) }
              : r
          ),
        }))
      },

      addIncident: (raceId, incidentData) => {
        const incident: Incident = { ...incidentData, id: uuidv4() }
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? {
                  ...r,
                  raceState: {
                    ...r.raceState,
                    incidents: [...r.raceState.incidents, incident],
                  },
                }
              : r
          ),
        }))
      },

      deleteIncident: (raceId, incidentId) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? {
                  ...r,
                  raceState: {
                    ...r.raceState,
                    incidents: r.raceState.incidents.filter((i) => i.id !== incidentId),
                  },
                }
              : r
          ),
        }))
      },

      startRace: (raceId) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? { ...r, raceState: { ...r.raceState, isRunning: true } }
              : r
          ),
        }))
      },

      pauseRace: (raceId) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? { ...r, raceState: { ...r.raceState, isRunning: false } }
              : r
          ),
        }))
      },

      updateElapsed: (raceId, seconds) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId
              ? { ...r, raceState: { ...r.raceState, elapsedSeconds: seconds } }
              : r
          ),
        }))
      },

      updateCar: (raceId, carUpdates) => {
        set((state) => ({
          races: state.races.map((r) =>
            r.id === raceId ? { ...r, car: { ...r.car, ...carUpdates } } : r
          ),
        }))
      },

      getActiveRace: () => {
        const { races, activeRaceId } = get()
        if (!activeRaceId) return null
        return races.find((r) => r.id === activeRaceId) ?? null
      },
    }),
    {
      name: 'stint-manager-races',
    }
  )
)

export default useRaceStore
