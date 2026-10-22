import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from '../utils/uuid'
import { getCoversDirectory } from './launcher'
import { extractIconFromExecutable } from './metadata'
import { isGameDuplicate } from '../database/games'
import type { ScannedExecutableItem } from '../../src/types/electron'

const BINARY_DIR_NAMES = new Set([
  'bin',
  'binaries',
  'x64',
  'x86',
  'win64',
  'win32',
  'shipping',
  'release',
  'retail',
  'game',
  'app',
  'system',
  'build',
  'client',
])

const GENERIC_EXE_NAMES = new Set([
  'game',
  'launcher',
  'start',
  'play',
  'main',
  'client',
  'app',
  'run',
  'shipping',
])

const IGNORED_DIR_NAMES = new Set([
  '$recycle.bin',
  'system volume information',
  'windows',
  'programdata',
  'node_modules',
  '.git',
  'appdata',
  'common files',
  'microsoft',
  'recovery',
])

const IGNORED_EXE_PATTERNS = [
  'unins',
  'uninstall',
  'crash',
  'reporter',
  'helper',
  'patcher',
  'updater',
  'update',
  'easyanticheat',
  'battleye',
  'cef',
  'unitycrash',
  'dxsetup',
  'vcredist',
  'dotnet',
  'directx',
  'config',
  'tool',
  'setup',
  'install',
  'support',
  'diagnostics',
  'benchmark',
  'prereq',
]

/**
 * Derives a human-friendly game title from executable path and directory structure.
 */
export function inferGameTitle(exePath: string): string {
  const parsed = path.parse(exePath)
  const rawFileName = parsed.name
  const parentDir = path.basename(parsed.dir)
  const grandParentDir = path.basename(path.dirname(parsed.dir))

  const lowerRawFile = rawFileName.toLowerCase()
  const lowerParent = parentDir.toLowerCase()

  // If the parent is a generic binary folder (e.g. Games/Witcher 3/bin/x64/witcher3.exe)
  if (BINARY_DIR_NAMES.has(lowerParent)) {
    if (BINARY_DIR_NAMES.has(grandParentDir.toLowerCase())) {
      const greatGrandParent = path.basename(path.dirname(path.dirname(parsed.dir)))
      if (greatGrandParent && greatGrandParent.length > 2 && !greatGrandParent.includes(':')) {
        return cleanTitleString(greatGrandParent)
      }
    }
    if (grandParentDir && grandParentDir.length > 2 && !grandParentDir.includes(':')) {
      return cleanTitleString(grandParentDir)
    }
  }

  // If the exe file name is generic (e.g. Games/Hades/game.exe)
  if (GENERIC_EXE_NAMES.has(lowerRawFile) || lowerRawFile.length <= 3) {
    if (parentDir && parentDir.length > 2 && !parentDir.includes(':')) {
      return cleanTitleString(parentDir)
    }
  }

  // Otherwise prefer parent directory if it has multiple words or spaces (e.g. "Dead Cells/deadcells.exe")
  if (parentDir && parentDir.length > 2 && !parentDir.includes(':')) {
    if (parentDir.includes(' ') || parentDir.length > rawFileName.length) {
      return cleanTitleString(parentDir)
    }
  }

  return cleanTitleString(rawFileName)
}

function cleanTitleString(name: string): string {
  let cleaned = name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Strip trailing tags like "Shipping", "Win64", "x64", "Release"
  cleaned = cleaned.replace(/\b(Shipping|Win64|x64|x86|Release|Retail|Client)\b/gi, '').trim()

  // Insert space before uppercase letters in CamelCase if no spaces exist (e.g. "Cyberpunk2077" -> "Cyberpunk 2077")
  if (!cleaned.includes(' ') && /^[A-Z][a-z0-9]+[A-Z]/.test(cleaned)) {
    cleaned = cleaned.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  }

  return cleaned || name
}

/**
 * Determines root game install folder from executable path.
 */
export function inferInstallPath(exePath: string): string {
  const dir = path.dirname(exePath)
  const parentName = path.basename(dir).toLowerCase()

  if (BINARY_DIR_NAMES.has(parentName)) {
    const grandParent = path.dirname(dir)
    const grandParentName = path.basename(grandParent).toLowerCase()
    if (BINARY_DIR_NAMES.has(grandParentName)) {
      return path.dirname(grandParent)
    }
    return grandParent
  }

  return dir
}

/**
 * Inspects a single executable file and returns a prefilled ScannedExecutableItem.
 */
export async function inspectExecutable(exePath: string): Promise<ScannedExecutableItem | null> {
  try {
    if (!fs.existsSync(exePath)) return null
    const stat = fs.statSync(exePath)
    if (!stat.isFile()) return null

    const ext = path.extname(exePath).toLowerCase()
    if (ext !== '.exe' && ext !== '.bat' && ext !== '.cmd') return null

    const title = inferGameTitle(exePath)
    const installPath = inferInstallPath(exePath)

    // Extract icon if possible
    let coverPath: string | undefined
    try {
      const coversDir = getCoversDirectory()
      const iconDest = path.join(coversDir, `icon_${uuidv4()}.png`)
      const extracted = await extractIconFromExecutable(exePath, iconDest)
      if (extracted && fs.existsSync(extracted)) {
        coverPath = extracted
      }
    } catch {
      // Icon extraction fallback
    }

    const dup = isGameDuplicate(title, exePath)

    return {
      id: uuidv4(),
      title,
      exePath,
      installPath,
      coverPath,
      userGenres: [],
      userTags: [],
      inRoulette: true,
      isDuplicate: dup.isDuplicate,
      duplicateReason: dup.reason,
      selected: !dup.isDuplicate,
    }
  } catch (err) {
    console.warn('Error inspecting executable:', exePath, err)
    return null
  }
}

/**
 * Recursively scans a chosen directory for game executables.
 */
export async function scanFolderForExecutables(
  folderPath: string,
  onProgress?: (scannedCount: number, currentDir: string) => void
): Promise<ScannedExecutableItem[]> {
  const normalized = path.normalize(folderPath).trim()
  if (!fs.existsSync(normalized)) {
    throw new Error('Указанная папка не существует')
  }

  const stat = fs.statSync(normalized)
  if (!stat.isDirectory()) {
    throw new Error('Выбранный путь не является папкой')
  }

  // Guard against scanning entire disk root without consent
  const isDriveRoot = /^[a-zA-Z]:[/\\]?$/.test(normalized)
  if (isDriveRoot) {
    throw new Error(
      'Сканирование всего корневого диска не рекомендуется во избежание зависаний. Пожалуйста, выберите конкретную папку с играми (например, D:\\Games).'
    )
  }

  const foundExePaths: string[] = []
  const maxDepth = 5

  function walk(currentDir: string, currentDepth: number): void {
    if (currentDepth > maxDepth) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch {
      // Permission denied or unreadable directory - skip silently
      return
    }

    if (onProgress && foundExePaths.length % 5 === 0) {
      onProgress(foundExePaths.length, currentDir)
    }

    for (const entry of entries) {
      const name = entry.name
      const lowerName = name.toLowerCase()

      if (entry.isDirectory()) {
        if (!IGNORED_DIR_NAMES.has(lowerName) && !lowerName.startsWith('.')) {
          walk(path.join(currentDir, name), currentDepth + 1)
        }
      } else if (entry.isFile()) {
        if (lowerName.endsWith('.exe')) {
          // Check if it's an ignored helper/updater/installer
          const isIgnored = IGNORED_EXE_PATTERNS.some((pattern) => lowerName.includes(pattern))
          if (!isIgnored) {
            foundExePaths.push(path.join(currentDir, name))
          }
        }
      }
    }
  }

  walk(normalized, 0)

  // Deduplicate and process found EXEs
  const results: ScannedExecutableItem[] = []
  for (const exePath of foundExePaths) {
    const item = await inspectExecutable(exePath)
    if (item) {
      results.push(item)
    }
  }

  return results
}
