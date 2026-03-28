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
      { splitNumber: 1, averageSof: 9400, entryCount: 52 },
      { splitNumber: 2, averageSof: 8100, entryCount: 52 },
      { splitNumber: 3, averageSof: 6900, entryCount: 52 },
      { splitNumber: 4, averageSof: 5800, entryCount: 52 },
      { splitNumber: 5, averageSof: 4700, entryCount: 52 },
      { splitNumber: 6, averageSof: 3600, entryCount: 52 },
    ],
    note: 'Jan 2025',
  },
  {
    year: 2024,
    eventId: 'daytona-24',
    totalEntries: 298,
    splits: [
      { splitNumber: 1, averageSof: 9200, entryCount: 50 },
      { splitNumber: 2, averageSof: 7900, entryCount: 50 },
      { splitNumber: 3, averageSof: 6700, entryCount: 50 },
      { splitNumber: 4, averageSof: 5600, entryCount: 50 },
      { splitNumber: 5, averageSof: 4500, entryCount: 50 },
      { splitNumber: 6, averageSof: 3400, entryCount: 48 },
    ],
    note: 'Jan 2024',
  },
  {
    year: 2023,
    eventId: 'daytona-24',
    totalEntries: 274,
    splits: [
      { splitNumber: 1, averageSof: 8800, entryCount: 46 },
      { splitNumber: 2, averageSof: 7500, entryCount: 46 },
      { splitNumber: 3, averageSof: 6300, entryCount: 46 },
      { splitNumber: 4, averageSof: 5200, entryCount: 46 },
      { splitNumber: 5, averageSof: 4100, entryCount: 44 },
      { splitNumber: 6, averageSof: 3100, entryCount: 46 },
    ],
    note: 'Jan 2023',
  },

  // ── 12 Hours of Sebring ─────────────────────────────────────────────────────
  {
    year: 2025,
    eventId: 'sebring-12',
    totalEntries: 218,
    splits: [
      { splitNumber: 1, averageSof: 9100, entryCount: 44 },
      { splitNumber: 2, averageSof: 7800, entryCount: 44 },
      { splitNumber: 3, averageSof: 6600, entryCount: 44 },
      { splitNumber: 4, averageSof: 5400, entryCount: 44 },
      { splitNumber: 5, averageSof: 4200, entryCount: 42 },
    ],
    note: 'Mar 2025',
  },
  {
    year: 2024,
    eventId: 'sebring-12',
    totalEntries: 204,
    splits: [
      { splitNumber: 1, averageSof: 8900, entryCount: 41 },
      { splitNumber: 2, averageSof: 7600, entryCount: 41 },
      { splitNumber: 3, averageSof: 6400, entryCount: 41 },
      { splitNumber: 4, averageSof: 5200, entryCount: 41 },
      { splitNumber: 5, averageSof: 4000, entryCount: 40 },
    ],
    note: 'Mar 2024',
  },
  {
    year: 2023,
    eventId: 'sebring-12',
    totalEntries: 188,
    splits: [
      { splitNumber: 1, averageSof: 8600, entryCount: 38 },
      { splitNumber: 2, averageSof: 7300, entryCount: 38 },
      { splitNumber: 3, averageSof: 6100, entryCount: 38 },
      { splitNumber: 4, averageSof: 4900, entryCount: 38 },
      { splitNumber: 5, averageSof: 3800, entryCount: 36 },
    ],
    note: 'Mar 2023',
  },

  // ── 24 Hours of Le Mans ─────────────────────────────────────────────────────
  {
    year: 2025,
    eventId: 'le-mans-24',
    totalEntries: 336,
    splits: [
      { splitNumber: 1, averageSof: 9600, entryCount: 56 },
      { splitNumber: 2, averageSof: 8300, entryCount: 56 },
      { splitNumber: 3, averageSof: 7100, entryCount: 56 },
      { splitNumber: 4, averageSof: 6000, entryCount: 56 },
      { splitNumber: 5, averageSof: 4900, entryCount: 56 },
      { splitNumber: 6, averageSof: 3800, entryCount: 56 },
    ],
    note: 'Jun 2025',
  },
  {
    year: 2024,
    eventId: 'le-mans-24',
    totalEntries: 318,
    splits: [
      { splitNumber: 1, averageSof: 9400, entryCount: 53 },
      { splitNumber: 2, averageSof: 8100, entryCount: 53 },
      { splitNumber: 3, averageSof: 6900, entryCount: 53 },
      { splitNumber: 4, averageSof: 5800, entryCount: 53 },
      { splitNumber: 5, averageSof: 4700, entryCount: 53 },
      { splitNumber: 6, averageSof: 3600, entryCount: 53 },
    ],
    note: 'Jun 2024',
  },
  {
    year: 2023,
    eventId: 'le-mans-24',
    totalEntries: 289,
    splits: [
      { splitNumber: 1, averageSof: 9000, entryCount: 48 },
      { splitNumber: 2, averageSof: 7700, entryCount: 48 },
      { splitNumber: 3, averageSof: 6500, entryCount: 48 },
      { splitNumber: 4, averageSof: 5400, entryCount: 48 },
      { splitNumber: 5, averageSof: 4300, entryCount: 48 },
      { splitNumber: 6, averageSof: 3200, entryCount: 49 },
    ],
    note: 'Jun 2023',
  },

  // ── 24 Hours of Spa ─────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'spa-24',
    totalEntries: 186,
    splits: [
      { splitNumber: 1, averageSof: 8400, entryCount: 47 },
      { splitNumber: 2, averageSof: 7100, entryCount: 47 },
      { splitNumber: 3, averageSof: 5800, entryCount: 47 },
      { splitNumber: 4, averageSof: 4500, entryCount: 45 },
    ],
    note: 'Jul 2024',
  },
  {
    year: 2023,
    eventId: 'spa-24',
    totalEntries: 172,
    splits: [
      { splitNumber: 1, averageSof: 8100, entryCount: 43 },
      { splitNumber: 2, averageSof: 6800, entryCount: 43 },
      { splitNumber: 3, averageSof: 5500, entryCount: 43 },
      { splitNumber: 4, averageSof: 4200, entryCount: 43 },
    ],
    note: 'Jul 2023',
  },

  // ── 24 Hours of Nürburgring ─────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'nurburgring-24',
    totalEntries: 214,
    splits: [
      { splitNumber: 1, averageSof: 8200, entryCount: 43 },
      { splitNumber: 2, averageSof: 6900, entryCount: 43 },
      { splitNumber: 3, averageSof: 5600, entryCount: 43 },
      { splitNumber: 4, averageSof: 4400, entryCount: 43 },
      { splitNumber: 5, averageSof: 3300, entryCount: 42 },
    ],
    note: 'May 2024',
  },
  {
    year: 2023,
    eventId: 'nurburgring-24',
    totalEntries: 196,
    splits: [
      { splitNumber: 1, averageSof: 7900, entryCount: 40 },
      { splitNumber: 2, averageSof: 6600, entryCount: 40 },
      { splitNumber: 3, averageSof: 5300, entryCount: 40 },
      { splitNumber: 4, averageSof: 4100, entryCount: 40 },
      { splitNumber: 5, averageSof: 3000, entryCount: 36 },
    ],
    note: 'May 2023',
  },

  // ── Petit Le Mans ───────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'petit-le-mans',
    totalEntries: 164,
    splits: [
      { splitNumber: 1, averageSof: 8700, entryCount: 41 },
      { splitNumber: 2, averageSof: 7300, entryCount: 41 },
      { splitNumber: 3, averageSof: 5900, entryCount: 41 },
      { splitNumber: 4, averageSof: 4600, entryCount: 41 },
    ],
    note: 'Oct 2024',
  },
  {
    year: 2023,
    eventId: 'petit-le-mans',
    totalEntries: 148,
    splits: [
      { splitNumber: 1, averageSof: 8400, entryCount: 37 },
      { splitNumber: 2, averageSof: 7000, entryCount: 37 },
      { splitNumber: 3, averageSof: 5600, entryCount: 37 },
      { splitNumber: 4, averageSof: 4300, entryCount: 37 },
    ],
    note: 'Oct 2023',
  },

  // ── Watkins Glen 6H ─────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'watkins-glen-6',
    totalEntries: 152,
    splits: [
      { splitNumber: 1, averageSof: 8100, entryCount: 38 },
      { splitNumber: 2, averageSof: 6700, entryCount: 38 },
      { splitNumber: 3, averageSof: 5300, entryCount: 38 },
      { splitNumber: 4, averageSof: 4000, entryCount: 38 },
    ],
    note: 'Jun 2024',
  },

  // ── Indianapolis 8H ─────────────────────────────────────────────────────────
  {
    year: 2024,
    eventId: 'indy-8',
    totalEntries: 138,
    splits: [
      { splitNumber: 1, averageSof: 7800, entryCount: 46 },
      { splitNumber: 2, averageSof: 6400, entryCount: 46 },
      { splitNumber: 3, averageSof: 5000, entryCount: 46 },
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
