import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { Game, MetadataResult } from '../../src/types/electron'

/**
 * Checks if a remote image exists and returns 200 OK.
 */
function checkUrlExists(url: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url)
      const client = parsed.protocol === 'https:' ? https : http

      const req = client.request(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'PlayPick/1.0' },
      }, (res) => {
        if (res.statusCode === 200) {
          resolve(true)
        } else if (res.statusCode === 301 || res.statusCode === 302) {
          const redirect = res.headers.location
          if (redirect) {
            checkUrlExists(redirect, timeoutMs).then(resolve)
          } else {
            resolve(false)
          }
        } else {
          resolve(false)
        }
      })

      req.on('error', () => resolve(false))
      req.setTimeout(timeoutMs, () => {
        req.destroy()
        resolve(false)
      })
      req.end()
    } catch {
      resolve(false)
    }
  })
}

/**
 * Downloads an image from URL and saves it to local disk.
 */
export function downloadImageToFile(url: string, destPath: string, timeoutMs = 12000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url)
      const client = parsed.protocol === 'https:' ? https : http

      const req = client.get(url, {
        headers: { 'User-Agent': 'PlayPick/1.0' },
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirect = res.headers.location
          if (redirect) {
            downloadImageToFile(redirect, destPath, timeoutMs).then(resolve)
            return
          }
        }

        if (res.statusCode !== 200) {
          resolve(false)
          return
        }

        const dir = path.dirname(destPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        const file = fs.createWriteStream(destPath)
        res.pipe(file)

        file.on('finish', () => {
          file.close(() => resolve(true))
        })

        file.on('error', () => {
          file.close()
          fs.unlink(destPath, () => { /* ignore */ })
          resolve(false)
        })
      })

      req.on('error', () => resolve(false))
      req.setTimeout(timeoutMs, () => {
        req.destroy()
        fs.unlink(destPath, () => { /* ignore */ })
        resolve(false)
      })
    } catch {
      resolve(false)
    }
  })
}

/**
 * Clean game title for better search match on SteamGridDB or RAWG.
 * Removes edition suffixes, trademark symbols, etc.
 */
export function cleanGameTitle(title: string): string {
  return title
    .replace(/[™®©]/g, '')
    .replace(/\s*-\s*(Game of the Year|GOTY|Enhanced|Definitive|Remastered|Deluxe|Special|Digital)\s*Edition/gi, '')
    .replace(/\s*\((Game of the Year|GOTY|Enhanced|Definitive|Remastered|Deluxe|Special|Digital)\s*Edition\)/gi, '')
    .replace(/\s*:\s*(Enhanced|Definitive|Remastered)\s*Edition/gi, '')
    .trim()
}

/**
 * Step 1: Steam Store API for covers.
 * Tries 600x900 library capsule first, falls back to header image or appdetails.
 */
export async function fetchSteamCoverUrl(steamAppId: number): Promise<string | null> {
  // Direct CDN capsule (600x900 vertical poster)
  const capsuleUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`
  const capsuleExists = await checkUrlExists(capsuleUrl)
  if (capsuleExists) {
    return capsuleUrl
  }

  // Fallback to Steam Store API
  const meta = await fetchSteamMetadata(steamAppId)
  if (meta?.coverUrl) {
    const metaExists = await checkUrlExists(meta.coverUrl)
    if (metaExists) return meta.coverUrl
  }

  // Fallback to header.jpg (standard horizontal banner)
  const headerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`
  const headerExists = await checkUrlExists(headerUrl)
  if (headerExists) {
    return headerUrl
  }

  return null
}

/**
 * Step 2: SteamGridDB API (free community game artwork database).
 * Supports search by steamAppId or game title.
 */
export async function fetchSteamGridDbCoverUrl(
  title: string,
  steamAppId?: number,
  apiKey?: string
): Promise<string | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'PlayPick/1.0',
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  }

  // Helper for JSON GET
  const getJson = (url: string): Promise<Record<string, unknown> | null> => {
    return new Promise((resolve) => {
      const req = https.get(url, { headers }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null)
          return
        }
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as Record<string, unknown>)
          } catch {
            resolve(null)
          }
        })
      })

      req.on('error', () => resolve(null))
      req.setTimeout(8000, () => {
        req.destroy()
        resolve(null)
      })
    })
  }

  try {
    // 2a. If Steam AppId is available and API key is set, query grids directly by steam id
    if (steamAppId && apiKey) {
      const gridData = await getJson(
        `https://www.steamgriddb.com/api/v2/grids/steam/${steamAppId}?dimensions=600x900,460x215,920x430`
      ) as { success?: boolean; data?: Array<{ url?: string; thumb?: string }> } | null

      if (gridData?.success && gridData.data && gridData.data.length > 0) {
        const cover = gridData.data[0].url || gridData.data[0].thumb
        if (cover) return cover
      }
    }

    // 2b. Search by title
    const cleaned = cleanGameTitle(title)
    if (!cleaned) return null

    const searchUrl = `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(cleaned)}`
    const searchData = await getJson(searchUrl) as {
      success?: boolean
      data?: Array<{ id: number; name: string }>
    } | null

    if (searchData?.success && searchData.data && searchData.data.length > 0) {
      const gameId = searchData.data[0].id

      const gridsUrl = `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900,460x215,920x430`
      const gridsData = await getJson(gridsUrl) as {
        success?: boolean
        data?: Array<{ url?: string; thumb?: string }>
      } | null

      if (gridsData?.success && gridsData.data && gridsData.data.length > 0) {
        const cover = gridsData.data[0].url || gridsData.data[0].thumb
        if (cover) return cover
      }
    }
  } catch {
    // Non-critical, fall through to next step
  }

  return null
}

/**
 * Step 3: Extract native icon from .lnk shortcut or .exe on Windows.
 * Uses Electron's built-in native app.getFileIcon API.
 */
export async function extractIconFromExecutable(
  targetPath: string,
  destPath: string
): Promise<string | null> {
  try {
    if (!targetPath) return null

    let fileToExtract: string | null = null

    // Direct executable or shortcut
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath)
      if (stat.isFile() && (targetPath.endsWith('.exe') || targetPath.endsWith('.lnk') || targetPath.endsWith('.url'))) {
        fileToExtract = targetPath
      } else if (stat.isDirectory()) {
        // Search directory for candidate .exe
        const files = fs.readdirSync(targetPath)
        const ignoredNames = ['unins', 'crash', 'setup', 'helper', 'unitycrash', 'patcher', 'update']
        const exeFiles = files.filter(f => {
          const lower = f.toLowerCase()
          return lower.endsWith('.exe') && !ignoredNames.some(ign => lower.includes(ign))
        })

        if (exeFiles.length > 0) {
          fileToExtract = path.join(targetPath, exeFiles[0])
        }
      }
    }

    if (!fileToExtract) return null

    const icon = await app.getFileIcon(fileToExtract, { size: 'large' })
    if (icon.isEmpty()) return null

    const pngBuffer = icon.toPNG()
    if (!pngBuffer || pngBuffer.length === 0) return null

    const dir = path.dirname(destPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(destPath, pngBuffer)
    return destPath
  } catch {
    return null
  }
}

/**
 * Orchestrates the full cover resolution chain:
 * 1. Check local cache (already downloaded)
 * 2. Steam Store API (free, official)
 * 3. SteamGridDB API (free community grids)
 * 4. Windows .lnk / .exe icon extraction
 * 5. Return null for fallback placeholder (never throws, never breaks)
 */
export async function resolveAndCacheGameCover(
  game: Game,
  coversDir: string,
  steamGridDbApiKey?: string
): Promise<string | null> {
  // Step 0: Check if local cover already exists on disk
  if (game.coverPath && fs.existsSync(game.coverPath)) {
    return game.coverPath
  }

  const cachedJpg = path.join(coversDir, `${game.id}.jpg`)
  if (fs.existsSync(cachedJpg)) {
    return cachedJpg
  }

  const cachedPng = path.join(coversDir, `${game.id}.png`)
  if (fs.existsSync(cachedPng)) {
    return cachedPng
  }

  // Step 1: Steam Store API
  if (game.steamAppId) {
    try {
      const steamUrl = await fetchSteamCoverUrl(game.steamAppId)
      if (steamUrl) {
        const success = await downloadImageToFile(steamUrl, cachedJpg)
        if (success && fs.existsSync(cachedJpg)) {
          return cachedJpg
        }
      }
    } catch {
      // Continue to next step
    }
  }

  // Step 2: SteamGridDB API
  try {
    const gridUrl = await fetchSteamGridDbCoverUrl(game.title, game.steamAppId, steamGridDbApiKey)
    if (gridUrl) {
      const success = await downloadImageToFile(gridUrl, cachedJpg)
      if (success && fs.existsSync(cachedJpg)) {
        return cachedJpg
      }
    }
  } catch {
    // Continue to next step
  }

  // Step 3: Windows .lnk / .exe icon extraction
  try {
    const execCandidates = [
      game.launchCommand,
      game.installPath,
    ].filter((p): p is string => Boolean(p && !p.includes('://')))

    for (const candidate of execCandidates) {
      const extracted = await extractIconFromExecutable(candidate, cachedPng)
      if (extracted && fs.existsSync(extracted)) {
        return extracted
      }
    }
  } catch {
    // Continue to fallback
  }

  // Step 4: Standard fallback placeholder
  return null
}

/**
 * Fetches game metadata from Steam Store API.
 */
export async function fetchSteamMetadata(steamAppId: number): Promise<MetadataResult | null> {
  return new Promise((resolve) => {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&l=russian`

    const req = https.get(url, {
      headers: { 'User-Agent': 'PlayPick/1.0' },
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as Record<string, { success: boolean; data: SteamAppData }>
          const appData = parsed[String(steamAppId)]

          if (!appData?.success || !appData.data) {
            resolve(null)
            return
          }

          const d = appData.data
          resolve({
            title: d.name,
            coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`,
            genres: d.genres?.map((g: { description: string }) => g.description) || [],
            tags: d.categories?.map((c: { description: string }) => c.description) || [],
            description: d.short_description,
            developer: d.developers?.[0],
            publisher: d.publishers?.[0],
            releaseDate: d.release_date?.date,
            source: 'steam',
          })
        } catch {
          resolve(null)
        }
      })
    })

    req.on('error', () => resolve(null))
    req.setTimeout(10000, () => {
      req.destroy()
      resolve(null)
    })
  })
}

interface SteamAppData {
  name: string
  short_description?: string
  genres?: Array<{ description: string }>
  categories?: Array<{ description: string }>
  developers?: string[]
  publishers?: string[]
  release_date?: { date: string }
}

/**
 * Fetches metadata from RAWG API if key is configured.
 */
export async function fetchRawgMetadata(
  title: string,
  apiKey: string
): Promise<MetadataResult | null> {
  if (!apiKey) return null

  return new Promise((resolve) => {
    const encodedTitle = encodeURIComponent(title)
    const url = `https://api.rawg.io/api/games?search=${encodedTitle}&key=${apiKey}&page_size=1`

    const req = https.get(url, {
      headers: { 'User-Agent': 'PlayPick/1.0' },
    }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as { results?: RawgGame[] }
          const game = parsed.results?.[0]

          if (!game) {
            resolve(null)
            return
          }

          resolve({
            title: game.name,
            coverUrl: game.background_image || undefined,
            genres: game.genres?.map(g => g.name) || [],
            tags: game.tags?.map(t => t.name) || [],
            releaseDate: game.released,
            source: 'rawg',
          })
        } catch {
          resolve(null)
        }
      })
    })

    req.on('error', () => resolve(null))
    req.setTimeout(10000, () => {
      req.destroy()
      resolve(null)
    })
  })
}

interface RawgGame {
  name: string
  background_image?: string
  genres?: Array<{ name: string }>
  tags?: Array<{ name: string }>
  released?: string
}
