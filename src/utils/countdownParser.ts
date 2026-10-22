/**
 * Parser and formatter for launch countdown delay.
 * Supports numbers, decimals (both dot and comma), and optional units ('сек', 'с', 's', 'sec').
 * Clamped between 1 and 30 seconds.
 */

export function parseCountdownSeconds(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const normalized = trimmed.replace(',', '.')

  // Check seconds e.g. "5", "3.5", "2,5 сек", "5с", "5s"
  const secMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:сек|с|s|sec|seconds)?$/i)
  if (secMatch) {
    const val = parseFloat(secMatch[1])
    if (isNaN(val) || val < 1 || val > 30) return null
    return Math.round(val * 10) / 10
  }

  // Accept milliseconds if user explicitly typed e.g. "5000 мс"
  const msMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:мс|ms)$/i)
  if (msMatch) {
    const val = parseFloat(msMatch[1])
    if (isNaN(val) || val < 1000 || val > 30000) return null
    return Math.round((val / 1000) * 10) / 10
  }

  return null
}

export function formatCountdownDisplay(sec: number): string {
  if (sec <= 0) return '0 сек'
  const rounded = Math.round(sec * 10) / 10
  return `${rounded} сек`
}
