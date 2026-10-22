import fs from 'fs'
import path from 'path'

export interface GogGame {
  gameId: string
  title: string
  installPath: string
  launchCommand: string
  isInstalled: boolean
}

interface GogGameInfo {
  gameId?: string
  rootGameId?: string
  gameTitle?: string
  installationPath?: string
  playTasks?: Array<{
    isPrimary?: boolean
    path?: string
    arguments?: string
    workingDir?: string
    type?: string
    name?: string
  }>
}

function findGogManifestsPath(): string | null {
  // GOG stores game info in the game's install directory as gameinfo or goggame-*.info files
  // Also checks Program Files for GOG Galaxy
  const candidates = [
    'C:\\Program Files (x86)\\GOG Galaxy\\Games',
    'C:\\Program Files\\GOG Galaxy\\Games',
    'D:\\GOG Games',
    'D:\\Games\\GOG',
  ]

  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }

  return null
}

function parseGogGameInfo(infoPath: string, gamePath: string): GogGame | null {
  try {
    const content = fs.readFileSync(infoPath, 'utf8')
    const data = JSON.parse(content) as GogGameInfo

    const gameId = data.gameId || data.rootGameId
    const title = data.gameTitle
    const installPath = data.installationPath || gamePath

    if (!gameId || !title) return null
    if (!fs.existsSync(installPath)) return null

    const launchCommand = `goggalaxy://openGame/${gameId}`

    return {
      gameId,
      title,
      installPath,
      launchCommand,
      isInstalled: true,
    }
  } catch {
    return null
  }
}

export async function scanGogGames(
  onProgress?: (found: number, stage: string) => void
): Promise<GogGame[]> {
  onProgress?.(0, 'Поиск GOG Galaxy...')

  const games: GogGame[] = []
  const seenIds = new Set<string>()

  // Try to find installed GOG games by looking for goggame-*.info files in registry
  // GOG also writes to HKEY_LOCAL_MACHINE\SOFTWARE\GOG.com\Games
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process') as typeof import('child_process')

    const regOutput = execSync(
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\Games" /s',
      { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }
    )

    // Parse registry output for game entries
    const lines = regOutput.split('\n')
    let currentGameId = ''
    let currentPath = ''
    let currentTitle = ''

    for (const line of lines) {
      const keyMatch = /HKEY_LOCAL_MACHINE.*\\Games\\(\d+)$/.exec(line.trim())
      if (keyMatch) {
        if (currentGameId && currentPath && currentTitle && !seenIds.has(currentGameId)) {
          seenIds.add(currentGameId)
          const launchCommand = `goggalaxy://openGame/${currentGameId}`
          games.push({ gameId: currentGameId, title: currentTitle, installPath: currentPath, launchCommand, isInstalled: true })
          onProgress?.(games.length, `Найдено игр GOG: ${games.length}`)
        }
        currentGameId = keyMatch[1]
        currentPath = ''
        currentTitle = ''
        continue
      }

      const pathMatch = /GAMEPATH\s+REG_SZ\s+(.+)/.exec(line)
      if (pathMatch) currentPath = pathMatch[1].trim()

      const titleMatch = /GAMENAME\s+REG_SZ\s+(.+)/.exec(line)
      if (titleMatch) currentTitle = titleMatch[1].trim()
    }

    if (currentGameId && currentPath && currentTitle && !seenIds.has(currentGameId)) {
      seenIds.add(currentGameId)
      games.push({ gameId: currentGameId, title: currentTitle, installPath: currentPath, launchCommand: `goggalaxy://openGame/${currentGameId}`, isInstalled: true })
    }

  } catch {
    // Registry not found or empty - try file-based detection
    const gamesBase = findGogManifestsPath()
    if (!gamesBase) return []

    try {
      const gameDirs = fs.readdirSync(gamesBase)
      for (const dir of gameDirs) {
        const gamePath = path.join(gamesBase, dir)
        const stat = fs.statSync(gamePath)
        if (!stat.isDirectory()) continue

        // Look for goggame-*.info file
        const files = fs.readdirSync(gamePath)
        const infoFile = files.find(f => f.startsWith('goggame-') && f.endsWith('.info'))
        if (infoFile) {
          const game = parseGogGameInfo(path.join(gamePath, infoFile), gamePath)
          if (game && !seenIds.has(game.gameId)) {
            seenIds.add(game.gameId)
            games.push(game)
            onProgress?.(games.length, `Найдено игр GOG: ${games.length}`)
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return games
}
