import fs from 'fs'
import path from 'path'

export interface SteamGame {
  appId: number
  title: string
  installPath: string
  isInstalled: boolean
}

/**
 * Finds Steam installation by reading Windows Registry and common paths.
 * Does not assume a default install path.
 */
export async function findSteamInstallPath(): Promise<string | null> {
  // Common Steam install paths on Windows
  const candidatePaths = [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\Games\\Steam',
  ]

  // Try to read from registry (Windows)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process') as typeof import('child_process')
    const regOutput = execSync(
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath',
      { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }
    )
    const match = regOutput.match(/InstallPath\s+REG_SZ\s+(.+)/)
    if (match?.[1]) {
      const regPath = match[1].trim()
      if (fs.existsSync(regPath)) {
        return regPath
      }
    }
  } catch {
    // Registry read failed, try common paths
  }

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'steam.exe'))) {
      return p
    }
  }

  return null
}

/**
 * Parses libraryfolders.vdf to find all Steam library paths.
 */
function parseLibraryFolders(steamPath: string): string[] {
  const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')

  const libraryPaths: string[] = [path.join(steamPath, 'steamapps')]

  if (!fs.existsSync(vdfPath)) {
    return libraryPaths
  }

  try {
    const content = fs.readFileSync(vdfPath, 'utf8')

    // Parse VDF format - look for "path" keys
    const pathRegex = /"path"\s+"([^"]+)"/gi
    let match
    while ((match = pathRegex.exec(content)) !== null) {
      const libPath = match[1].replace(/\\\\/g, '\\')
      const steamappsPath = path.join(libPath, 'steamapps')
      if (fs.existsSync(steamappsPath) && !libraryPaths.includes(steamappsPath)) {
        libraryPaths.push(steamappsPath)
      }
    }

    // Also try the older format with numbered keys
    // "1" { "path" "..." }
    const folderRegex = /"(\d+)"\s*\{[^}]*"path"\s+"([^"]+)"/gi
    while ((match = folderRegex.exec(content)) !== null) {
      const libPath = match[2].replace(/\\\\/g, '\\')
      const steamappsPath = path.join(libPath, 'steamapps')
      if (fs.existsSync(steamappsPath) && !libraryPaths.includes(steamappsPath)) {
        libraryPaths.push(steamappsPath)
      }
    }
  } catch (err) {
    console.warn('Failed to parse libraryfolders.vdf:', err)
  }

  return libraryPaths
}

/**
 * Parses a single appmanifest_*.acf file.
 */
function parseAppManifest(manifestPath: string): SteamGame | null {
  try {
    const content = fs.readFileSync(manifestPath, 'utf8')

    const getField = (key: string): string | null => {
      const match = new RegExp(`"${key}"\\s+"([^"]*)"`, 'i').exec(content)
      return match?.[1] ?? null
    }

    const appIdStr = getField('appid')
    const name = getField('name')
    const installDir = getField('installdir')
    const stateFlags = getField('StateFlags')

    if (!appIdStr || !name || !installDir) return null

    const appId = parseInt(appIdStr, 10)
    if (isNaN(appId)) return null

    // StateFlags: 4 = fully installed, 6 = needs update but playable
    const flags = parseInt(stateFlags || '0', 10)
    const isInstalled = (flags & 4) !== 0 || flags === 6

    if (!isInstalled) return null

    const steamappsDir = path.dirname(manifestPath)
    const installPath = path.join(steamappsDir, 'common', installDir)

    return {
      appId,
      title: name,
      installPath,
      isInstalled: true,
    }
  } catch {
    return null
  }
}

/**
 * Scans all Steam libraries and returns installed games.
 */
export async function scanSteamGames(
  onProgress?: (found: number, stage: string) => void
): Promise<SteamGame[]> {
  onProgress?.(0, 'Поиск Steam...')

  const steamPath = await findSteamInstallPath()
  if (!steamPath) {
    return []
  }

  onProgress?.(0, 'Поиск библиотек Steam...')
  const libraryPaths = parseLibraryFolders(steamPath)

  const games: SteamGame[] = []
  const seenAppIds = new Set<number>()

  for (const libPath of libraryPaths) {
    onProgress?.(games.length, `Сканирование: ${libPath}`)

    let manifests: string[] = []
    try {
      manifests = fs.readdirSync(libPath)
        .filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'))
        .map(f => path.join(libPath, f))
    } catch {
      continue
    }

    for (const manifestPath of manifests) {
      const game = parseAppManifest(manifestPath)
      if (game && !seenAppIds.has(game.appId)) {
        seenAppIds.add(game.appId)
        games.push(game)
        onProgress?.(games.length, `Найдено игр Steam: ${games.length}`)
      }
    }
  }

  return games
}
