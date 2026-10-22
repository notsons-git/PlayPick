/**
 * Dictionary mapping for standardizing game genres and tags in Russian.
 */

// Mapping of input / device tags
const DEVICE_MAPPINGS: Record<string, string> = {
  'full controller support': 'Геймпад',
  'partial controller support': 'Геймпад',
  'controller support': 'Геймпад',
  'dualshock 4': 'Геймпад',
  'dualsense': 'Геймпад',
  'xbox controller': 'Геймпад',
  'контроллер': 'Геймпад',
  'геймпад': 'Геймпад',
  'keyboard & mouse': 'Клавиатура и мышь',
  'keyboard and mouse': 'Клавиатура и мышь',
  'клавиатура и мышь': 'Клавиатура и мышь',
}

// Technical tags and metadata characteristics that should NEVER appear in gameplay tags
const TECHNICAL_TAG_PATTERNS: RegExp[] = [
  /valve anti-cheat/i,
  /\bvac\b/i,
  /anti-cheat/i,
  /easy anti-cheat/i,
  /battleye/i,
  /denuvo/i,
  /punkbuster/i,
  /steam cloud/i,
  /steam achievements/i,
  /steam trading cards/i,
  /steam workshop/i,
  /steam leaderboards/i,
  /steam turn notifications/i,
  /steamvr collectibles/i,
  /captions available/i,
  /commentary available/i,
  /\bstats\b/i,
  /includes level editor/i,
  /in-app purchases/i,
  /hdr available/i,
  /remote play/i,
  /tracker/i,
  /includes source sdk/i,
  /downloadable content/i,
  /steam timeline/i,
  /family sharing/i,
]

// Common synonym / translation mapping for tags
const TAG_SYNONYMS: Record<string, string> = {
  'single-player': 'Одиночная игра',
  'singleplayer': 'Одиночная игра',
  'для одного игрока': 'Одиночная игра',
  'multi-player': 'Многопользовательская игра',
  'multiplayer': 'Многопользовательская игра',
  'для нескольких игроков': 'Многопользовательская игра',
  'многопользовательские игры': 'Многопользовательская игра',
  'co-op': 'Кооператив',
  'cooperative': 'Кооператив',
  'совместная игра': 'Кооператив',
  'online co-op': 'Сетевой кооператив',
  'сетевой кооператив': 'Сетевой кооператив',
  'local co-op': 'Локальный кооператив',
  'локальный кооператив': 'Локальный кооператив',
  'pvp': 'PvP',
  'online pvp': 'Сетевое PvP',
  'сетевое pvp': 'Сетевое PvP',
  'shared/split screen': 'Разделенный экран',
  'shared / split screen': 'Разделенный экран',
  'разделенный экран': 'Разделенный экран',
  'cross-platform multiplayer': 'Кроссплатформа',
  'кроссплатформенная игра': 'Кроссплатформа',
  'open world': 'Открытый мир',
  'открытый мир': 'Открытый мир',
  'survival': 'Выживание',
  'выживание': 'Выживание',
  'crafting': 'Крафт',
  'крафтинг': 'Крафт',
  'крафт': 'Крафт',
  'building': 'Строительство',
  'строительство': 'Строительство',
  'first-person': 'От первого лица',
  'от первого лица': 'От первого лица',
  'third-person': 'От третьего лица',
  'от третьего лица': 'От третьего лица',
  'stealth': 'Стелс',
  'стелс': 'Стелс',
  'horror': 'Хоррор',
  'хоррор': 'Хоррор',
  'sci-fi': 'Научная фантастика',
  'научная фантастика': 'Научная фантастика',
  'post-apocalyptic': 'Постапокалипсис',
  'постапокалипсис': 'Постапокалипсис',
  'sandbox': 'Песочница',
  'песочница': 'Песочница',
  'story rich': 'Сюжетная',
  'глубокий сюжет': 'Сюжетная',
  'exploration': 'Исследования',
  'исследования': 'Исследования',
  'atmospheric': 'Атмосфера',
  'атмосферная': 'Атмосфера',
  'zombies': 'Зомби',
  'зомби': 'Зомби',
  'tactical': 'Тактика',
  'тактика': 'Тактика',
  'fps': 'Шутер',
  'shooter': 'Шутер',
  'шутер': 'Шутер',
}

// Canonical genre mappings
const GENRE_SYNONYMS: Record<string, string> = {
  'action': 'Экшен',
  'экшены': 'Экшен',
  'экшн': 'Экшен',
  'экшен': 'Экшен',
  'adventure': 'Приключения',
  'приключенческие игры': 'Приключения',
  'приключения': 'Приключения',
  'rpg': 'RPG',
  'ролевые игры': 'RPG',
  'strategy': 'Стратегия',
  'стратегии': 'Стратегия',
  'simulation': 'Симулятор',
  'симуляторы': 'Симулятор',
  'sports': 'Спорт',
  'спортивные игры': 'Спорт',
  'racing': 'Гонки',
  'гонки': 'Гонки',
  'indie': 'Инди',
  'инди': 'Инди',
  'casual': 'Казуальная игра',
  'казуальные игры': 'Казуальная игра',
  'massively multiplayer': 'ММО',
  'ммо': 'ММО',
  'бесплатные': 'Free-to-Play',
  'free to play': 'Free-to-Play',
}

/**
 * Checks whether a given raw tag is a technical/service feature that should be omitted.
 */
export function isTechnicalTag(tag: string): boolean {
  const trimmed = tag.trim()
  if (!trimmed) return true
  return TECHNICAL_TAG_PATTERNS.some((pattern) => pattern.test(trimmed))
}

/**
 * Normalizes a single tag or device descriptor.
 * Returns null if the tag should be discarded (e.g. technical anti-cheat).
 */
export function normalizeTag(rawTag: string): string | null {
  const trimmed = rawTag.trim()
  if (!trimmed || isTechnicalTag(trimmed)) {
    return null
  }

  const lower = trimmed.toLowerCase()

  // 1. Device support check
  if (DEVICE_MAPPINGS[lower]) {
    return DEVICE_MAPPINGS[lower]
  }

  // 2. Synonyms mapping
  if (TAG_SYNONYMS[lower]) {
    return TAG_SYNONYMS[lower]
  }

  // 3. Fallback: capitalize first letter, keep meaningful Russian or English tag
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Normalizes a single genre.
 */
export function normalizeGenre(rawGenre: string): string | null {
  const trimmed = rawGenre.trim()
  if (!trimmed || isTechnicalTag(trimmed)) {
    return null
  }

  const lower = trimmed.toLowerCase()
  if (GENRE_SYNONYMS[lower]) {
    return GENRE_SYNONYMS[lower]
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Cleans and deduplicates a list of raw genres and tags:
 * - Eliminates technical / anti-cheat metadata.
 * - Normalizes synonyms (e.g. "DualShock 4" -> "Геймпад").
 * - Disallows redundant duplicate meanings across genres and tags.
 */
export function cleanAndNormalizeMetadata(
  rawGenres: string[],
  rawTags: string[]
): { genres: string[]; tags: string[] } {
  const genresSet = new Set<string>()
  for (const g of rawGenres) {
    const normalized = normalizeGenre(g)
    if (normalized) {
      genresSet.add(normalized)
    }
  }

  const tagsSet = new Set<string>()
  for (const t of rawTags) {
    const normalized = normalizeTag(t)
    if (normalized) {
      // Avoid duplicate meaning in tags if already present in genres
      const isDuplicateOfGenre = Array.from(genresSet).some(
        (genre) => genre.toLowerCase() === normalized.toLowerCase()
      )
      if (!isDuplicateOfGenre) {
        tagsSet.add(normalized)
      }
    }
  }

  return {
    genres: Array.from(genresSet),
    tags: Array.from(tagsSet),
  }
}
