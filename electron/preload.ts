import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, Game, SelectionHistoryEntry, Settings, ScanProgress, ScanResult, MetadataResult } from '../src/types/electron'

const api: ElectronAPI = {
  // Games
  getGames: () => ipcRenderer.invoke('get-games') as Promise<Game[]>,
  getGame: (id) => ipcRenderer.invoke('get-game', id) as Promise<Game | null>,
  addGame: (game) => ipcRenderer.invoke('add-game', game) as Promise<Game>,
  batchAddGames: (games) => ipcRenderer.invoke('batch-add-games', games) as Promise<{ added: number; failed: number }>,
  mergeDuplicateGames: () => ipcRenderer.invoke('merge-duplicate-games') as Promise<{ mergedCount: number; removedCount: number }>,
  updateGame: (id, updates) => ipcRenderer.invoke('update-game', id, updates) as Promise<Game>,
  deleteGame: (id) => ipcRenderer.invoke('delete-game', id) as Promise<void>,
  setGameInRoulette: (id, inRoulette) => ipcRenderer.invoke('set-game-in-roulette', id, inRoulette) as Promise<void>,
  setGameFavorite: (id, isFavorite) => ipcRenderer.invoke('set-game-favorite', id, isFavorite) as Promise<void>,

  // Genres & tags
  getAllGenres: () => ipcRenderer.invoke('get-all-genres') as Promise<string[]>,
  getAllTags: () => ipcRenderer.invoke('get-all-tags') as Promise<string[]>,
  updateGameTags: (id, tags, genres) => ipcRenderer.invoke('update-game-tags', id, tags, genres) as Promise<void>,

  // Scanning
  scanGames: () => ipcRenderer.invoke('scan-games') as Promise<void>,
  cancelScan: () => ipcRenderer.invoke('cancel-scan') as Promise<void>,
  onScanProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress): void => callback(progress)
    ipcRenderer.on('scan-progress', handler)
    return () => ipcRenderer.off('scan-progress', handler)
  },
  onScanComplete: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, result: ScanResult): void => callback(result)
    ipcRenderer.once('scan-complete', handler)
    return () => ipcRenderer.off('scan-complete', handler)
  },
  importScannedGames: (games) => ipcRenderer.invoke('import-scanned-games', games) as Promise<{ added: number; updated: number; skipped: number }>,
  openFolderPicker: (title) => ipcRenderer.invoke('open-folder-picker', title) as Promise<string | null>,
  inspectExecutable: (exePath) => ipcRenderer.invoke('inspect-executable', exePath) as Promise<any>,
  scanFolderForExecutables: (folderPath) => ipcRenderer.invoke('scan-folder-for-executables', folderPath) as Promise<any>,

  // Metadata and Covers
  fetchMetadata: (gameId) => ipcRenderer.invoke('fetch-metadata', gameId) as Promise<MetadataResult | null>,
  downloadCover: (gameId, url) => ipcRenderer.invoke('download-cover', gameId, url) as Promise<string | null>,
  ensureGameCover: (gameId) => ipcRenderer.invoke('ensure-game-cover', gameId) as Promise<string | null>,
  autoFetchCovers: () => ipcRenderer.invoke('auto-fetch-covers') as Promise<{ processed: number; updated: number }>,
  getCoverDataUrl: (coverPath) => ipcRenderer.invoke('get-cover-data-url', coverPath) as Promise<string | null>,

  // Launcher
  launchGame: (gameId) => ipcRenderer.invoke('launch-game', gameId) as Promise<{ success: boolean; error?: string }>,
  openFilePicker: (options) => ipcRenderer.invoke('open-file-picker', options) as Promise<string | null>,

  // History
  getHistory: () => ipcRenderer.invoke('get-history') as Promise<SelectionHistoryEntry[]>,
  addHistoryEntry: (entry) => ipcRenderer.invoke('add-history-entry', entry) as Promise<SelectionHistoryEntry>,
  clearHistory: () => ipcRenderer.invoke('clear-history') as Promise<void>,

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings') as Promise<Settings>,
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings) as Promise<Settings>,

  // App
  getAppVersion: () => ipcRenderer.invoke('get-app-version') as Promise<string>,
  isFirstRun: () => ipcRenderer.invoke('is-first-run') as Promise<boolean>,
  setFirstRunDone: () => ipcRenderer.invoke('set-first-run-done') as Promise<void>,
  getCoversDir: () => ipcRenderer.invoke('get-covers-dir') as Promise<string>,
}

contextBridge.exposeInMainWorld('electronAPI', api)
