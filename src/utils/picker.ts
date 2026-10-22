import type { Game } from '../types/electron'

export interface WeightedPickerResult {
  winner: Game
  winnerIndex: number
}

/**
 * Calculates the relative selection weight for a given game.
 * Non-favorite games have a base weight of 1.0.
 * Favorite games have a weight of 1.0 + (favoriteWeightBonus / 100), clamped >= 0.
 *
 * Examples:
 * - bonus = 0%   -> favorites weight 1.0 (uniform distribution)
 * - bonus = +50% -> favorites weight 1.5
 * - bonus = -50% -> favorites weight 0.5
 * - bonus = -100% -> favorites weight 0.0 (excluded from random selection when non-favorites exist)
 */
export function getGameWeight(game: Game, favoriteWeightBonus: number): number {
  if (!game.isFavorite) {
    return 1.0
  }
  const bonus = Math.max(-100, Math.min(100, favoriteWeightBonus || 0))
  return Math.max(0, 1.0 + bonus / 100)
}

/**
 * Picks a random winning game from the candidates array using weighted probability.
 * Must be executed before any visual roulette animation begins.
 */
export function pickWeightedWinner(
  candidates: Game[],
  favoriteWeightBonus = 0,
  randomFn: () => number = Math.random
): WeightedPickerResult {
  if (candidates.length === 0) {
    throw new Error('Cannot pick winner from empty candidates list')
  }

  if (candidates.length === 1) {
    return { winner: candidates[0], winnerIndex: 0 }
  }

  // 1. Calculate weights for all candidates
  const weights = candidates.map((c) => getGameWeight(c, favoriteWeightBonus))
  const totalWeight = weights.reduce((acc, w) => acc + w, 0)

  // 2. Edge case: If all candidates have 0 weight (e.g. all are favorites and bonus is -100%),
  // fallback gracefully to uniform selection
  if (totalWeight <= 0) {
    const uniformIndex = Math.min(
      candidates.length - 1,
      Math.floor(randomFn() * candidates.length)
    )
    return {
      winner: candidates[uniformIndex],
      winnerIndex: uniformIndex,
    }
  }

  // 3. Weighted random draw
  const threshold = randomFn() * totalWeight
  let cumulative = 0

  for (let i = 0; i < candidates.length; i++) {
    cumulative += weights[i]
    if (threshold < cumulative || i === candidates.length - 1) {
      return {
        winner: candidates[i],
        winnerIndex: i,
      }
    }
  }

  return {
    winner: candidates[candidates.length - 1],
    winnerIndex: candidates.length - 1,
  }
}
