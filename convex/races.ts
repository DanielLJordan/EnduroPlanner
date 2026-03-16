import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// ── Helper ────────────────────────────────────────────────────────────────────
async function findRace(ctx: any, raceId: string) {
  return ctx.db
    .query('races')
    .withIndex('by_raceId', (q: any) => q.eq('raceId', raceId))
    .first()
}

function toRaceEvent(doc: any) {
  return {
    id: doc.raceId,
    name: doc.name,
    track: doc.track,
    durationHours: doc.durationHours,
    startTime: doc.startTime,
    teamNotes: doc.teamNotes,
    drivers: doc.drivers,
    stints: doc.stints,
    pitStops: doc.pitStops,
    car: doc.car,
    raceState: doc.raceState,
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────
export const list = query({
  handler: async (ctx) => {
    const docs = await ctx.db.query('races').collect()
    return docs.map(toRaceEvent)
  },
})

export const get = query({
  args: { raceId: v.string() },
  handler: async (ctx, { raceId }) => {
    const doc = await findRace(ctx, raceId)
    return doc ? toRaceEvent(doc) : null
  },
})

// ── Race CRUD ─────────────────────────────────────────────────────────────────
export const create = mutation({
  args: {
    raceId: v.string(),
    name: v.string(),
    track: v.string(),
    durationHours: v.number(),
    startTime: v.string(),
    teamNotes: v.string(),
    car: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('races', {
      raceId: args.raceId,
      name: args.name,
      track: args.track,
      durationHours: args.durationHours,
      startTime: args.startTime,
      teamNotes: args.teamNotes,
      drivers: [],
      stints: [],
      pitStops: [],
      car: args.car,
      raceState: { isRunning: false, elapsedSeconds: 0, incidents: [] },
    })
  },
})

export const remove = mutation({
  args: { raceId: v.string() },
  handler: async (ctx, { raceId }) => {
    const race = await findRace(ctx, raceId)
    if (race) await ctx.db.delete(race._id)
  },
})

export const updateRace = mutation({
  args: { raceId: v.string(), updates: v.any() },
  handler: async (ctx, { raceId, updates }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    // Strip app-level `id` field — Convex uses `raceId`
    const { id: _omit, ...rest } = updates
    await ctx.db.patch(race._id, rest)
  },
})

// ── Car ───────────────────────────────────────────────────────────────────────
export const updateCar = mutation({
  args: { raceId: v.string(), car: v.any() },
  handler: async (ctx, { raceId, car }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, { car: { ...race.car, ...car } })
  },
})

// ── Drivers ───────────────────────────────────────────────────────────────────
export const addDriver = mutation({
  args: { raceId: v.string(), driver: v.any() },
  handler: async (ctx, { raceId, driver }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, { drivers: [...race.drivers, driver] })
  },
})

export const updateDriver = mutation({
  args: { raceId: v.string(), driverId: v.string(), updates: v.any() },
  handler: async (ctx, { raceId, driverId, updates }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      drivers: race.drivers.map((d: any) =>
        d.id === driverId ? { ...d, ...updates } : d
      ),
    })
  },
})

export const removeDriver = mutation({
  args: { raceId: v.string(), driverId: v.string() },
  handler: async (ctx, { raceId, driverId }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      drivers: race.drivers.filter((d: any) => d.id !== driverId),
    })
  },
})

// ── Stints ────────────────────────────────────────────────────────────────────
export const addStint = mutation({
  args: { raceId: v.string(), stint: v.any() },
  handler: async (ctx, { raceId, stint }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, { stints: [...race.stints, stint] })
  },
})

export const updateStint = mutation({
  args: { raceId: v.string(), stintId: v.string(), updates: v.any() },
  handler: async (ctx, { raceId, stintId, updates }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      stints: race.stints.map((s: any) =>
        s.id === stintId ? { ...s, ...updates } : s
      ),
    })
  },
})

export const deleteStint = mutation({
  args: { raceId: v.string(), stintId: v.string() },
  handler: async (ctx, { raceId, stintId }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      stints: race.stints.filter((s: any) => s.id !== stintId),
    })
  },
})

export const replaceStints = mutation({
  args: { raceId: v.string(), stints: v.array(v.any()) },
  handler: async (ctx, { raceId, stints }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, { stints })
  },
})

// ── Pit Stops ─────────────────────────────────────────────────────────────────
export const addPitStop = mutation({
  args: { raceId: v.string(), pitStop: v.any() },
  handler: async (ctx, { raceId, pitStop }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, { pitStops: [...race.pitStops, pitStop] })
  },
})

export const updatePitStop = mutation({
  args: { raceId: v.string(), pitStopId: v.string(), updates: v.any() },
  handler: async (ctx, { raceId, pitStopId, updates }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      pitStops: race.pitStops.map((p: any) =>
        p.id === pitStopId ? { ...p, ...updates } : p
      ),
    })
  },
})

export const deletePitStop = mutation({
  args: { raceId: v.string(), pitStopId: v.string() },
  handler: async (ctx, { raceId, pitStopId }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      pitStops: race.pitStops.filter((p: any) => p.id !== pitStopId),
    })
  },
})

// ── Incidents ─────────────────────────────────────────────────────────────────
export const addIncident = mutation({
  args: { raceId: v.string(), incident: v.any() },
  handler: async (ctx, { raceId, incident }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      raceState: {
        ...race.raceState,
        incidents: [...race.raceState.incidents, incident],
      },
    })
  },
})

export const deleteIncident = mutation({
  args: { raceId: v.string(), incidentId: v.string() },
  handler: async (ctx, { raceId, incidentId }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      raceState: {
        ...race.raceState,
        incidents: race.raceState.incidents.filter((i: any) => i.id !== incidentId),
      },
    })
  },
})

// ── Race State ────────────────────────────────────────────────────────────────
export const startRace = mutation({
  args: { raceId: v.string() },
  handler: async (ctx, { raceId }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      raceState: { ...race.raceState, isRunning: true },
    })
  },
})

export const pauseRace = mutation({
  args: { raceId: v.string() },
  handler: async (ctx, { raceId }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      raceState: { ...race.raceState, isRunning: false },
    })
  },
})

export const updateElapsed = mutation({
  args: { raceId: v.string(), seconds: v.number() },
  handler: async (ctx, { raceId, seconds }) => {
    const race = await findRace(ctx, raceId)
    if (!race) return
    await ctx.db.patch(race._id, {
      raceState: { ...race.raceState, elapsedSeconds: seconds },
    })
  },
})
