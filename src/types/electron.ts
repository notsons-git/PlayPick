// Shared types for IPC between main and renderer

export interface Game {
  id: string
  title: string
  installPath?: string
  launchCommand?: string
  launchArgs?: string[]
  launchType: 'executable' | 'steam' | 'epic' | 'gog' | 'ea' | 'ubisoft' | 'shortcut' | 'url'
  steamAppId?: number
  epicAppId?: string
  gogGameId?: string
  coverPath?: string
  genres: string[]
  tags: string[]
  sources: GameSource[]
  inRoulette: boolean
  isFavorite?: boolean
  isInstalled: boolean
  addedAt: string
  updatedAt: string
  lastPlayedAt?: string
  playCount: number
  totalPlayTime: number
  userGenres: string[]
  userTags: string[]
}

export interface GameSource {
  id: string
  gameId: string
  sourceType: 'steam' | 'epic' | 'gog' | 'ea' | 'ubisoft' | 'manual' | 'shortcut' | 'executable'
  sourceId: string
  sourceName: string
  installPath?: string
  launchCommand?: string
  launchArgs?: string[]
  isInstalled: boolean
}

export interface SelectionHistoryEntry {
  id: string
  gameId: string
  gameTitle: string
  gameCoverPath?: string
  selectedAt: string
  filters: FilterState
  launched: boolean
  launchAttempted: boolean
}

export interface FilterState {
  genres: string[]
  tags: string[]
  tagMode: 'any' | 'all'
  onlyInstalled: boolean
  excludeRecent: boolean
  recentDays: number
  favoritesFirst?: boolean
}

export interface Settings {
  soundEnabled: boolean
  animationDuration: number
  animationType?: 'sequential' | 'random' | 'cases' | 'horizontal_wheel' | 'vertical_wheel'
  launchMode?: 'manual' | 'countdown' | 'instant'
  launchCountdownSeconds?: number
  excludeRecentDays: number
  favoriteWeightBonus?: number
  steamApiKey?: string
  steamGridDbApiKey?: string
  igdbClientId?: string
  igdbClientSecret?: string
  rawgApiKey?: string
  autoScan: boolean
  lastScanAt?: string
  theme: 'dark'
  language: 'ru'
  notificationSoundEnabled?: boolean
  notificationVolume?: number
  librarySortBy?: 'title' | 'state' | 'platform' | 'date'
  librarySortOrder?: 'asc' | 'desc'
}

export interface ScanProgress {
  source: string
  stage: string
  found: number
  total?: number
  done: boolean
  error?: string
}

export interface ScanResult {
  games: ScannedGame[]
  errors: ScanError[]
  duration: number
}

export interface ScannedGame {
  title: string
  sourceType: GameSource['sourceType']
  sourceId: string
  installPath?: string
  launchCommand?: string
  launchArgs?: string[]
  isInstalled: boolean
  steamAppId?: number
  epicAppId?: string
  gogGameId?: string
}

export interface ScanError {
  source: string
  message: string
  details?: string
}

export interface MetadataResult {
  title?: string
  coverUrl?: string
  coverPath?: string
  genres?: string[]
  tags?: string[]
  description?: string
  developer?: string
  publisher?: string
  releaseDate?: string
  source: string
}

export interface ScannedExecutableItem {
  id: string
  title: string
  exePath: string
  installPath?: string
  coverPath?: string
  userGenres: string[]
  userTags: string[]
  inRoulette: boolean
  isDuplicate: boolean
  duplicateReason?: string
  selected: boolean
}

export interface ElectronAPI {
  // Database
  getGames: () => Promise<Game[]>
  getGame: (id: string) => Promise<Game | null>
  addGame: (game: Omit<Game, 'id' | 'addedAt' | 'updatedAt'>) => Promise<Game>
  batchAddGames: (games: Array<Omit<Game, 'id' | 'addedAt' | 'updatedAt'>>) => Promise<{ added: number; failed: number }>
  mergeDuplicateGames: () => Promise<{ mergedCount: number; removedCount: number }>
  updateGame: (id: string, updates: Partial<Game>) => Promise<Game>
  deleteGame: (id: string) => Promise<void>
  setGameInRoulette: (id: string, inRoulette: boolean) => Promise<void>
  setGameFavorite: (id: string, isFavorite: boolean) => Promise<void>

  // Tags and genres
  getAllGenres: () => Promise<string[]>
  getAllTags: () => Promise<string[]>
  updateGameTags: (id: string, tags: string[], genres: string[]) => Promise<void>

  // Scanning
  scanGames: () => Promise<void>
  cancelScan: () => Promise<void>
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
  onScanComplete: (callback: (result: ScanResult) => void) => () => void
  importScannedGames: (games: ScannedGame[]) => Promise<{ added: number; updated: number; skipped: number }>
  openFolderPicker: (title?: string) => Promise<string | null>
  inspectExecutable: (exePath: string) => Promise<ScannedExecutableItem | null>
  scanFolderForExecutables: (folderPath: string) => Promise<ScannedExecutableItem[]>

  // Metadata and Covers
  fetchMetadata: (gameId: string) => Promise<MetadataResult | null>
  downloadCover: (gameId: string, url: string) => Promise<string | null>
  ensureGameCover: (gameId: string) => Promise<string | null>
  autoFetchCovers: () => Promise<{ processed: number; updated: number }>
  getCoverDataUrl: (coverPath: string) => Promise<string | null>

  // Launching
  launchGame: (gameId: string) => Promise<{ success: boolean; error?: string }>
  openFilePicker: (options: { title: string; filters: { name: string; extensions: string[] }[] }) => Promise<string | null>

  // History
  getHistory: () => Promise<SelectionHistoryEntry[]>
  addHistoryEntry: (entry: Omit<SelectionHistoryEntry, 'id'>) => Promise<SelectionHistoryEntry>
  clearHistory: () => Promise<void>

  // Settings
  getSettings: () => Promise<Settings>
  updateSettings: (settings: Partial<Settings>) => Promise<Settings>

  // App
  getAppVersion: () => Promise<string>
  isFirstRun: () => Promise<boolean>
  setFirstRunDone: () => Promise<void>
  getCoversDir: () => Promise<string>
}
