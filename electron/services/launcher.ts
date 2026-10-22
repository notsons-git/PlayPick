import { shell, app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { Game } from '../../src/types/electron'

export interface LaunchResult {
  success: boolean
  error?: string
}

/**
 * Validates that a path is safe and exists.
 * Prevents path traversal attacks.
 */
function validatePath(filePath: string): boolean {
  if (!filePath) return false
  try {
    const resolved = path.resolve(filePath)
    return fs.existsSync(resolved)
  } catch {
    return false
  }
}

/**
 * Launches a game using the appropriate method.
 * Never uses shell: true with user-provided strings.
 */
export async function launchGame(game: Game): Promise<LaunchResult> {
  try {
    if (game.launchType === 'steam' && game.steamAppId) {
      const url = `steam://run/${game.steamAppId}`
      await shell.openExternal(url)
      return { success: true }
    }

    if (game.launchType === 'epic' && game.epicAppId) {
      const url = game.launchCommand || `com.epicgames.launcher://apps/${game.epicAppId}?action=launch&silent=true`
      await shell.openExternal(url)
      return { success: true }
    }

    if (game.launchType === 'gog' && game.gogGameId) {
      const url = game.launchCommand || `goggalaxy://openGame/${game.gogGameId}`
      await shell.openExternal(url)
      return { success: true }
    }

    if (game.launchType === 'url' && game.launchCommand) {
      // Only allow known safe protocol URLs
      const safeProtocols = ['steam://', 'com.epicgames.launcher://', 'goggalaxy://', 'uplay://']
      const isSafe = safeProtocols.some(p => game.launchCommand!.startsWith(p))
      if (!isSafe) {
        return { success: false, error: 'Небезопасный протокол запуска' }
      }
      await shell.openExternal(game.launchCommand)
      return { success: true }
    }

    if (game.launchType === 'executable' || game.launchType === 'shortcut') {
      const execPath = game.launchCommand || game.installPath

      if (!execPath) {
        return { success: false, error: 'Путь к файлу запуска не указан' }
      }

      if (!validatePath(execPath)) {
        return { success: false, error: `Файл не найден: ${execPath}` }
      }

      // Use shell.openPath for executables - no shell: true
      const result = await shell.openPath(execPath)
      if (result) {
        return { success: false, error: result }
      }
      return { success: true }
    }

    return { success: false, error: 'Неизвестный тип запуска' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

/**
 * Downloads and saves a cover image locally.
 */
export async function downloadCoverImage(gameId: string, url: string, coversDir: string): Promise<string | null> {
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return null
  }

  try {
    const https = url.startsWith('https://') ? await import('https') : await import('http')
    const ext = path.extname(new URL(url).pathname) || '.jpg'
    const coverPath = path.join(coversDir, `${gameId}${ext}`)

    return new Promise((resolve) => {
      const file = fs.createWriteStream(coverPath)
      https.default.get(url, (response) => {
        if (response.statusCode !== 200) {
          file.close()
          fs.unlink(coverPath, () => { /* ignore */ })
          resolve(null)
          return
        }
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve(coverPath)
        })
        file.on('error', () => {
          fs.unlink(coverPath, () => { /* ignore */ })
          resolve(null)
        })
      }).on('error', () => {
        fs.unlink(coverPath, () => { /* ignore */ })
        resolve(null)
      })
    })
  } catch {
    return null
  }
}

export function getCoversDirectory(): string {
  const userDataPath = app.getPath('userData')
  const coversDir = path.join(userDataPath, 'covers')
  if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true })
  }
  return coversDir
}
