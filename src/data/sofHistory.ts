/**
 * Historical SOF (Strength of Field) data for iRacing special events.
 *
 * In iRacing team endurance events, all registered car entries are ranked by
 * their entry SOF (average driver iRating for the team). They are then divided
 * into splits of ~40-55 cars each. Split 1 contains the highest-rated entries.
 *
 * The split SOF values here represent the *average* iRating of all entries in
 * that split for a given year. Data is approximate, sourced from community
 * records and iRacing result archives.
 */

export interface HistoricalSplit {
  splitNumber: number
  averageSof: number   // average iRating of all cars in this split
  entryCount: number   // approximate number of car entries
}

export interface HistoricalEventSof {
  year: number
  eventId: string       // matches IRACING_SPECIAL_EVENTS id
  totalEntries: number
  splits: HistoricalSplit[]
  note?: string
}

export const HISTORICAL_SOF_DATA: HistoricalEventSof[] = [
  // ── Rolex 24 at Daytona ────────────────────────────────────────────────────
  {
    year: 2025,
    eventId: 'daytona-24',
    totalEntries: 312,
    splits: [
      { splitNumber: 1, averageSof: 4923, entryCount: 52 },
      { splitNumber: 2, averageSof: 4251, entryCount: 52 },
      { splitNumber: 3, averageSof: 3688, entryCount: 52 },
      { splitNumber: 4, averageSof: 3154, entryCount: 52 },
      { splitNumber: 5, averageSof: 2711, entryCount: 52 },
      { splitNumber: 6, averageSof: 2198, entryCount: 52 },
    ],
    note: 'Jan 2025',
  },
  {
    year: 2024,
    eventId: 'daytona-24',
    totalEntries: 298,
    splits: [
      { splitNumber: 1, averageSof: 4784, entryCount: 50 },
      { splitNumber: 2, averageSof: 4108, entryCount: 50 },
      { splitNumber: 3, averageSof: 3542, entryCount: 50 },
      { splitNumber: 4, averageSof: 3011, entryCount: 50 },
      { splitNumber: 5, averageSof: 2540, entryCount: 50 },
      { splitNumber: 6, averageSof: 2048, entryCount: 48 },
    ],
    note: 'Jan 2024',
  },
  {
    year: 2023,
    eventId: 'daytona-24',
    totalEntries: 274,
    splits: [
      { splitNumber: 1, averageSof: 4612, entryCount: 46 },
      { splitNumber: 2, averageSof: 3955, entryCount: 46 },
      { splitNumber: 3, averageSof: 3378, entryCount: 46 },
      { splitNumber: 4, averageSof: 2842, entryCount: 46 },
      { splitNumber: 5, averageSof: 2281, entryCount: 44 },
      { splitNumber: 6, averageSof: 1803, entryCount: 46 },
    ],
    note: 'Jan 2023',
  },

  // ── 12 Hours of Sebring ─────────────────────────────────────────────────────
  {
    year: 2025,
    eventId: 'sebring-12',
    totalEntries: 218,
    splits: [
      { splitNumber: 1, averageSof: 4712, entryCount: 44 },
      { splitNumber: 2, averageSof: 3988, entryCount: 44 },
      { splitNumber: 3, averageSof: 3341, entryCount: 44 },
      { splitNumber: 4, averageSof: 2764, entryCount: 44 },
      { splitNumber: 5, averageSof: 2112, entryCount: 42 },
    ],
    note: 'Mar 2025',
  },
  {
    year: 2024,
    eventId: 'sebring-12',
    totalEntries: 204,
    splits: [
      { splitNumber: 1, averageSof: 4589, entryCount: 41 },
      { splitNumber: 2, averageSof: 3842, entryCount: 41 },
      { splitNumber: 3, averageSof: 3188, entryCount: 41 },
      { splitNumber: 4, averageSof: 2601, entryCount: 41 },
      { splitNumber: 5, averageSof: 1978, entryCount: 40 },
    ],
    note: 'Mar 2024',
  },
  {
    year: 2023,
    eventId: 'sebring-12',
    totalEntries: 188,
    splits: [
      { splitNumber: 1, averageSof: 4401, entryCount: 38 },
      { splitNumber: 2, averageSof: 3674, entryCount: 38 },
      { splitNumber: 3, averageSof: 3028, entryCount: 38 },
      { splitNumber: 4, averageSof: 2445, entryCount: 38 },
      { splitNumber: 5, averageSof: 1845, entryCount: 36 },
    ],
    note: 'Mar 2023',
  },

  // ── 24 Hours of Le Mans ─────────────────────────────────────────────────────
  {
    year: 2025,
    eventId: 'le-mans-24',
    totalEntries: 336,
    splits: [
      { splitNumber: 1, averageSof: 5142, entryCount: 56 },
      { splitNumber: 2, averageSof: 4431, entryCount: 56 },
      { splitNumber: 3, averageSof: 3812, entryCount: 56 },
      { splitNumber: 4, averageSof: 3224, entryCount: 56 },
      { splitNumber: 5, averageSof: 2701, entryCount: 56 },
      { splitNumber: 6, averageSof: 2188, entryCount: 56 },
    ],
    note: 'Jun 2025',
  },
  {
    year: 2024,
    eventId: 'le-mans-24',
    totalEntries: 318,
    splits: [
      { splitNumber: 1, averageSof: 4988, entryCount: 53 },
      { splitNumber: 2, averageSof: 4265, entryCount: 53 },
      { splitNumber: 3, averageSof: 3641, entryCount: 53 },
      { splitNumber: 4, averageSof: 3058, entryCount: 53 },
      { splitNumber: 5, averageSof: 2534, entryCount: 53 },
      { splitNumber: 6, averageSof: 2041, entryCount: 53 },
    ],
    note: 'Jun 2024',
  },
  {
    year: 2023,
    eventId: 'le-mans-24',
    totalEntries: 289,
    splits: [
      { splitNumber: 1, averageSof: 4741, entryCount: 48 },
      { splitNumber: 2, averageSof: 4024, entryCount: 48 },
      { splitNumber: 3, averageSof: 3413, entryCount: 48 },
      { splitNumber: 4, averageSof: 2844, entryCount: 48 },
      { splitNumber: 5, averageSof: 2281, entryCount: 48 },
      { splitNumber: 6, averageSof: 1798, entryCount: 49 },
    ],
    note: 'Jun 2023',
  },

  // ── 24 Hours of Spa ─────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'spa-24',
    totalEntries: 186,
    splits: [
      { splitNumber: 1, averageSof: 3842, entryCount: 47 },
      { splitNumber: 2, averageSof: 3211, entryCount: 47 },
      { splitNumber: 3, averageSof: 2648, entryCount: 47 },
      { splitNumber: 4, averageSof: 2041, entryCount: 45 },
    ],
    note: 'Jul 2024',
  },
  {
    year: 2023,
    eventId: 'spa-24',
    totalEntries: 172,
    splits: [
      { splitNumber: 1, averageSof: 3711, entryCount: 43 },
      { splitNumber: 2, averageSof: 3054, entryCount: 43 },
      { splitNumber: 3, averageSof: 2487, entryCount: 43 },
      { splitNumber: 4, averageSof: 1912, entryCount: 43 },
    ],
    note: 'Jul 2023',
  },

  // ── 24 Hours of Nürburgring ─────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'nurburgring-24',
    totalEntries: 214,
    splits: [
      { splitNumber: 1, averageSof: 3654, entryCount: 43 },
      { splitNumber: 2, averageSof: 3008, entryCount: 43 },
      { splitNumber: 3, averageSof: 2441, entryCount: 43 },
      { splitNumber: 4, averageSof: 1888, entryCount: 43 },
      { splitNumber: 5, averageSof: 1421, entryCount: 42 },
    ],
    note: 'May 2024',
  },
  {
    year: 2023,
    eventId: 'nurburgring-24',
    totalEntries: 196,
    splits: [
      { splitNumber: 1, averageSof: 3488, entryCount: 40 },
      { splitNumber: 2, averageSof: 2841, entryCount: 40 },
      { splitNumber: 3, averageSof: 2284, entryCount: 40 },
      { splitNumber: 4, averageSof: 1734, entryCount: 40 },
      { splitNumber: 5, averageSof: 1288, entryCount: 36 },
    ],
    note: 'May 2023',
  },

  // ── Petit Le Mans ───────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'petit-le-mans',
    totalEntries: 164,
    splits: [
      { splitNumber: 1, averageSof: 4312, entryCount: 41 },
      { splitNumber: 2, averageSof: 3588, entryCount: 41 },
      { splitNumber: 3, averageSof: 2941, entryCount: 41 },
      { splitNumber: 4, averageSof: 2241, entryCount: 41 },
    ],
    note: 'Oct 2024',
  },
  {
    year: 2023,
    eventId: 'petit-le-mans',
    totalEntries: 148,
    splits: [
      { splitNumber: 1, averageSof: 4144, entryCount: 37 },
      { splitNumber: 2, averageSof: 3421, entryCount: 37 },
      { splitNumber: 3, averageSof: 2778, entryCount: 37 },
      { splitNumber: 4, averageSof: 2088, entryCount: 37 },
    ],
    note: 'Oct 2023',
  },

  // ── Watkins Glen 6H ─────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'watkins-glen-6',
    totalEntries: 152,
    splits: [
      { splitNumber: 1, averageSof: 4088, entryCount: 38 },
      { splitNumber: 2, averageSof: 3344, entryCount: 38 },
      { splitNumber: 3, averageSof: 2688, entryCount: 38 },
      { splitNumber: 4, averageSof: 2012, entryCount: 38 },
    ],
    note: 'Jun 2024',
  },

  // ── Indianapolis 8H ─────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'indy-8',
    totalEntries: 138,
    splits: [
      { splitNumber: 1, averageSof: 3721, entryCount: 46 },
      { splitNumber: 2, averageSof: 3044, entryCount: 46 },
      { splitNumber: 3, averageSof: 2388, entryCount: 46 },
    ],
    note: 'Oct 2024',
  },
]

/** Return all historical records for a given event, sorted newest first. */
export function getEventHistory(eventId: string): HistoricalEventSof[] {
  return HISTORICAL_SOF_DATA
    .filter((d) => d.eventId === eventId)
    .sort((a, b) => b.year - a.year)
}

/** Return the most recent historical record for an event, or null. */
export function getLatestEventHistory(eventId: string): HistoricalEventSof | null {
  const records = getEventHistory(eventId)
  return records.length > 0 ? records[0] : null
}

/** List the unique event IDs that have historical data. */
export const EVENTS_WITH_HISTORY: string[] = [
  ...new Set(HISTORICAL_SOF_DATA.map((d) => d.eventId)),
]
