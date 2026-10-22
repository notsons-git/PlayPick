/**
 * Parser and formatter for animation duration.
 * Supports integers, decimals, comma/dot separators, and units ('сек', 'с', 's', 'мс', 'ms').
 */

export function parseDurationToMs(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Replace comma with dot
  const normalized = trimmed.replace(',', '.')

  // Check for milliseconds: e.g. "2500 мс", "2500ms"
  const msMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:мс|ms)$/i)
  if (msMatch) {
    const val = parseFloat(msMatch[1])
    if (isNaN(val) || val < 0) return null
    return Math.round(val)
  }

  // Check for seconds with unit: e.g. "5.5 сек", "5с", "5s"
  const secMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:сек|с|s|sec|seconds)?$/i)
  if (secMatch) {
    const val = parseFloat(secMatch[1])
    if (isNaN(val) || val < 0) return null
    return Math.round(val * 1000)
  }

  return null
}

export function formatMsToDisplay(ms: number): string {
  if (ms <= 0) return '0 сек'
  if (ms % 1000 === 0) {
    return `${ms / 1000} сек`
  }
  const seconds = ms / 1000
  // Clean decimal representation (up to 2 decimals, trim trailing zeros)
  const formatted = parseFloat(seconds.toFixed(2)).toString()
  return `${formatted} сек`
}
