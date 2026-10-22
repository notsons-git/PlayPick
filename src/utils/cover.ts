/**
 * Resolves a cover path into a URL that Chromium / Electron renderer can safely load.
 *
 * Direct `file://` URLs are blocked by Chromium web security when renderer runs from
 * http:// (dev mode) or sandboxed contexts.
 * We convert local file paths to our custom privileged `cover://` scheme.
 */
export function resolveCoverUrl(coverPath?: string | null): string | null {
  if (!coverPath || !coverPath.trim()) return null
  const trimmed = coverPath.trim()

  // Remote URLs or data URLs can be used directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed
  }

  // Local filesystem path or relative cache name:
  // Use custom cover:// scheme with query parameter
  return `cover://image?path=${encodeURIComponent(trimmed)}`
}
