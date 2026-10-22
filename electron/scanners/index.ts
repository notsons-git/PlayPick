import { EventEmitter } from 'events'
import { scanSteamGames } from './steam'
import { scanEpicGames } from './epic'
import { scanGogGames } from './gog'
import type { ScanProgress, ScanResult, ScannedGame, ScanError } from '../../src/types/electron'

export const scannerEvents = new EventEmitter()

let scanCancelled = false
let scanRunning = false

export function isScanRunning(): boolean {
  return scanRunning
}

export function cancelScan(): void {
  scanCancelled = true
}

export async function runFullScan(): Promise<ScanResult> {
  if (scanRunning) {
    throw new Error('Сканирование уже выполняется')
  }

  scanRunning = true
  scanCancelled = false

  const startTime = Date.now()
  const games: ScannedGame[] = []
  const errors: ScanError[] = []

  function emitProgress(progress: ScanProgress): void {
    scannerEvents.emit('progress', progress)
  }

  const scanners: Array<{
    name: string
    sourceType: ScannedGame['sourceType']
    fn: () => Promise<unknown[]>
  }> = [
    {
      name: 'Steam',
      sourceType: 'steam',
      fn: () => scanSteamGames((found, stage) => {
        emitProgress({ source: 'Steam', stage, found, done: false })
      }),
    },
    {
      name: 'Epic Games Store',
      sourceType: 'epic',
      fn: () => scanEpicGames((found, stage) => {
        emitProgress({ source: 'Epic Games Store', stage, found, done: false })
      }),
    },
    {
      name: 'GOG Galaxy',
      sourceType: 'gog',
      fn: () => scanGogGames((found, stage) => {
        emitProgress({ source: 'GOG Galaxy', stage, found, done: false })
      }),
    },
  ]

  try {
    for (const scanner of scanners) {
      if (scanCancelled) break

      emitProgress({ source: scanner.name, stage: `Сканирование ${scanner.name}...`, found: 0, done: false })

      try {
        const results = await scanner.fn()

        interface SteamResult { appId: number; title: string; installPath: string; isInstalled: boolean }
        interface EpicResult { appId: string; title: string; installPath: string; launchCommand: string; isInstalled: boolean }
        interface GogResult { gameId: string; title: string; installPath: string; launchCommand: string; isInstalled: boolean }

        for (const result of results) {
          if (scanCancelled) break

          if (scanner.sourceType === 'steam') {
            const r = result as SteamResult
            games.push({
              title: r.title,
              sourceType: 'steam',
              sourceId: String(r.appId),
              installPath: r.installPath,
              launchCommand: `steam://run/${r.appId}`,
              launchArgs: [],
              isInstalled: r.isInstalled,
              steamAppId: r.appId,
            })
          } else if (scanner.sourceType === 'epic') {
            const r = result as EpicResult
            games.push({
              title: r.title,
              sourceType: 'epic',
              sourceId: r.appId,
              installPath: r.installPath,
              launchCommand: r.launchCommand,
              launchArgs: [],
              isInstalled: r.isInstalled,
              epicAppId: r.appId,
            })
          } else if (scanner.sourceType === 'gog') {
            const r = result as GogResult
            games.push({
              title: r.title,
              sourceType: 'gog',
              sourceId: r.gameId,
              installPath: r.installPath,
              launchCommand: r.launchCommand,
              launchArgs: [],
              isInstalled: r.isInstalled,
              gogGameId: r.gameId,
            })
          }
        }

        emitProgress({
          source: scanner.name,
          stage: `${scanner.name}: найдено ${results.length} игр`,
          found: results.length,
          done: true,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push({ source: scanner.name, message: `Ошибка сканирования ${scanner.name}: ${message}` })
        emitProgress({
          source: scanner.name,
          stage: `Ошибка ${scanner.name}`,
          found: 0,
          done: true,
          error: message,
        })
      }
    }
  } finally {
    scanRunning = false
  }

  const duration = Date.now() - startTime

  const result: ScanResult = { games, errors, duration }
  scannerEvents.emit('complete', result)

  return result
}
