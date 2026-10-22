import fs from 'fs'
import path from 'path'

export interface EpicGame {
  appId: string
  title: string
  installPath: string
  launchCommand: string
  isInstalled: boolean
}

/**
 * Finds Epic Games Store manifests directory.
 * Epic stores installation manifests in a known location.
 */
function findEpicManifestsPath(): string | null {
  const candidates = [
    path.join(process.env['ProgramData'] || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'),
  ]

  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }

  return null
}

interface EpicManifest {
  AppName?: string
  DisplayName?: string
  InstallLocation?: string
  LaunchExecutable?: string
  bIsIncompleteInstall?: boolean
  InstallationGuid?: string
}

function parseEpicManifest(manifestPath: string): EpicGame | null {
  try {
    const content = fs.readFileSync(manifestPath, 'utf8')
    const data = JSON.parse(content) as EpicManifest

    if (!data.AppName || !data.DisplayName || !data.InstallLocation) return null
    if (data.bIsIncompleteInstall) return null

    const installPath = data.InstallLocation
    if (!fs.existsSync(installPath)) return null

    const launchCommand = `com.epicgames.launcher://apps/${data.AppName}?action=launch&silent=true`

    return {
      appId: data.AppName,
      title: data.DisplayName,
      installPath,
      launchCommand,
      isInstalled: true,
    }
  } catch {
    return null
  }
}

export async function scanEpicGames(
  onProgress?: (found: number, stage: string) => void
): Promise<EpicGame[]> {
  onProgress?.(0, 'Поиск Epic Games Store...')

  const manifestsPath = findEpicManifestsPath()
  if (!manifestsPath) {
    return []
  }

  let files: string[] = []
  try {
    files = fs.readdirSync(manifestsPath).filter(f => f.endsWith('.item'))
  } catch {
    return []
  }

  onProgress?.(0, `Чтение манифестов Epic (${files.length})...`)

  const games: EpicGame[] = []
  for (const file of files) {
    const game = parseEpicManifest(path.join(manifestsPath, file))
    if (game) {
      games.push(game)
      onProgress?.(games.length, `Найдено игр Epic: ${games.length}`)
    }
  }

  return games
}
