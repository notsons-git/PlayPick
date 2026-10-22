/**
 * Parser and formatter for favorite probability weight bonus.
 * Supports integers, decimals, comma/dot separators, +/- signs, and '%' symbol.
 */

export function parsePercentage(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Replace comma with dot
  const normalized = trimmed.replace(',', '.')

  // Match e.g. "+50%", "-25.5%", "12.5", "0%"
  const match = normalized.match(/^([+-]?\d+(?:\.\d+)?)\s*%?$/)
  if (!match) return null

  const val = parseFloat(match[1])
  if (isNaN(val)) return null

  // Clamped at minimum -100% (negative weights below -100% make no physical sense)
  if (val < -100) return null

  // Clean decimal representation up to 1 decimal place
  return Math.round(val * 10) / 10
}

export function formatPercentage(val: number): string {
  if (val === 0) return '0%'
  const formatted = Math.round(val * 10) / 10
  return formatted > 0 ? `+${formatted}%` : `${formatted}%`
}
