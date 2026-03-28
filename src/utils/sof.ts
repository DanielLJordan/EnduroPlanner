import type { Driver } from '../types'
import type { HistoricalEventSof } from '../data/sofHistory'

/**
 * Calculate the team SOF (Strength of Field) as the average iRating
 * of all drivers in the team.
 */
export function calcTeamSof(drivers: Driver[]): number {
  const rated = drivers.filter((d) => d.irating > 0)
  if (rated.length === 0) return 0
  const sum = rated.reduce((acc, d) => acc + d.irating, 0)
  return Math.round(sum / rated.length)
}

/**
 * Predict which split a team would land in for a given historical event record.
 *
 * iRacing sorts all registered entries by their team SOF (descending) then
 * divides them into equal-sized splits. This function approximates the likely
 * split by finding where `teamSof` falls relative to historical split averages.
 *
 * Returns the predicted split number (1 = top split).
 */
export function predictSplit(
  teamSof: number,
  history: HistoricalEventSof,
): number {
  const splits = [...history.splits].sort((a, b) => a.splitNumber - b.splitNumber)
  if (splits.length === 0) return 1

  // Find the first split whose average SOF the team SOF is closest to or above.
  // Simple approach: team lands in the split whose average is nearest their SOF.
  let closestSplit = splits[splits.length - 1].splitNumber
  let minDiff = Infinity

  for (const split of splits) {
    const diff = Math.abs(teamSof - split.averageSof)
    if (diff < minDiff) {
      minDiff = diff
      closestSplit = split.splitNumber
    }
  }

  return closestSplit
}

/** Describe the SOF tier label used by iRacing community. */
export function sofTierLabel(sof: number): { label: string; color: string } {
  if (sof >= 9000) return { label: 'World Class', color: 'text-purple-400' }
  if (sof >= 7500) return { label: 'Elite', color: 'text-yellow-400' }
  if (sof >= 6000) return { label: 'Pro', color: 'text-orange-400' }
  if (sof >= 4500) return { label: 'Advanced', color: 'text-blue-400' }
  if (sof >= 3000) return { label: 'Intermediate', color: 'text-cyan-400' }
  if (sof >= 2000) return { label: 'Developing', color: 'text-green-400' }
  if (sof >= 1500) return { label: 'Rookie', color: 'text-lime-400' }
  return { label: 'Novice', color: 'text-gray-400' }
}

/** Format iRating for display, e.g. 4200 → "4,200" */
export function formatIrating(ir: number): string {
  return ir.toLocaleString()
}
