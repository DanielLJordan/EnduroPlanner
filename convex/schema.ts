import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  races: defineTable({
    orgId: v.optional(v.string()), // Clerk organization ID — scopes race to a team
    raceId: v.string(), // app UUID used in URLs
    name: v.string(),
    track: v.string(),
    durationHours: v.number(),
    startTime: v.string(),
    teamNotes: v.string(),
    drivers: v.array(v.any()),
    stints: v.array(v.any()),
    pitStops: v.array(v.any()),
    car: v.any(),
    raceState: v.any(),
  })
    .index('by_raceId', ['raceId'])
    .index('by_orgId', ['orgId']),
})
