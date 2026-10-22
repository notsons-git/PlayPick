import { useState, useEffect } from 'react'
import { Clock, Key, Info, Save, ShieldCheck, Volume2, Rocket } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { parseDurationToMs, formatMsToDisplay } from '../../utils/durationParser'
import { parsePercentage, formatPercentage } from '../../utils/percentageParser'
import { parseCountdownSeconds, formatCountdownDisplay } from '../../utils/countdownParser'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()
  const [appVersion, setAppVersion] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true)
  const [animationDuration, setAnimationDuration] = useState(5000)
  const [durationInputText, setDurationInputText] = useState('5 сек')
  const [durationError, setDurationError] = useState<string | null>(null)

  const [animationType, setAnimationType] = useState<
    'sequential' | 'random' | 'cases' | 'horizontal_wheel' | 'vertical_wheel'
  >('sequential')

  // Launch after selection modes
  const [launchMode, setLaunchMode] = useState<'manual' | 'countdown' | 'instant'>('manual')
  const [launchCountdownSeconds, setLaunchCountdownSeconds] = useState(5)
  const [countdownInputText, setCountdownInputText] = useState('5 сек')
  const [countdownError, setCountdownError] = useState<string | null>(null)

  const [excludeRecentDays, setExcludeRecentDays] = useState(0)

  const [favoriteWeightBonus, setFavoriteWeightBonus] = useState(0)
  const [weightInputText, setWeightInputText] = useState('0%')
  const [weightError, setWeightError] = useState<string | null>(null)

  const [rawgApiKey, setRawgApiKey] = useState('')
  const [steamApiKey, setSteamApiKey] = useState('')
  const [steamGridDbApiKey, setSteamGridDbApiKey] = useState('')
  const [isFetchingCovers, setIsFetchingCovers] = useState(false)
  const [coversResult, setCoversResult] = useState<string | null>(null)

  useEffect(() => {
    void window.electronAPI.getAppVersion().then(setAppVersion)
  }, [])

  useEffect(() => {
    if (settings) {
      setSoundEnabled(settings.soundEnabled)
      setNotificationSoundEnabled(settings.notificationSoundEnabled ?? true)

      const dur = typeof settings.animationDuration === 'number' ? settings.animationDuration : 5000
      setAnimationDuration(dur)
      setDurationInputText(formatMsToDisplay(dur))
      setDurationError(null)

      setAnimationType(settings.animationType || 'sequential')

      const mode = settings.launchMode || 'manual'
      setLaunchMode(mode)
      const countdownSec = typeof settings.launchCountdownSeconds === 'number' ? settings.launchCountdownSeconds : 5
      setLaunchCountdownSeconds(countdownSec)
      setCountdownInputText(formatCountdownDisplay(countdownSec))
      setCountdownError(null)

      setExcludeRecentDays(settings.excludeRecentDays)

      const weight = typeof settings.favoriteWeightBonus === 'number' ? settings.favoriteWeightBonus : 0
      setFavoriteWeightBonus(weight)
      setWeightInputText(formatPercentage(weight))
      setWeightError(null)

      setRawgApiKey(settings.rawgApiKey || '')
      setSteamApiKey(settings.steamApiKey || '')
      setSteamGridDbApiKey(settings.steamGridDbApiKey || '')
    }
  }, [settings])

  const handleSave = async () => {
    // If text fields have pending valid values, ensure they are applied
    let durToSave = animationDuration
    const parsedDur = parseDurationToMs(durationInputText)
    if (parsedDur !== null && parsedDur <= 60000) {
      durToSave = parsedDur
      setAnimationDuration(durToSave)
    }

    let weightToSave = favoriteWeightBonus
    const parsedWeight = parsePercentage(weightInputText)
    if (parsedWeight !== null) {
      weightToSave = parsedWeight
      setFavoriteWeightBonus(weightToSave)
    }

    let countdownToSave = launchCountdownSeconds
    const parsedCountdown = parseCountdownSeconds(countdownInputText)
    if (parsedCountdown !== null) {
      countdownToSave = parsedCountdown
      setLaunchCountdownSeconds(countdownToSave)
    }

    await updateSettings({
      soundEnabled,
      notificationSoundEnabled,
      animationDuration: durToSave,
      animationType,
      launchMode,
      launchCountdownSeconds: countdownToSave,
      excludeRecentDays,
      favoriteWeightBonus: weightToSave,
      rawgApiKey: rawgApiKey.trim() || undefined,
      steamApiKey: steamApiKey.trim() || undefined,
      steamGridDbApiKey: steamGridDbApiKey.trim() || undefined,
    })
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  const handleDurationSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ms = Number(e.target.value)
    setAnimationDuration(ms)
    setDurationInputText(formatMsToDisplay(ms))
    setDurationError(null)
  }

  const handleDurationTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDurationInputText(val)
    const parsed = parseDurationToMs(val)
    if (parsed === null) {
      setDurationError('Пример: 5 сек, 2.5с или 500 мс (от 0 сек)')
    } else if (parsed > 60000) {
      setDurationError('Максимальная длительность — 60 сек')
    } else {
      setDurationError(null)
      setAnimationDuration(parsed)
    }
  }

  const handleDurationTextBlur = () => {
    const parsed = parseDurationToMs(durationInputText)
    if (parsed !== null && parsed <= 60000) {
      setAnimationDuration(parsed)
      setDurationInputText(formatMsToDisplay(parsed))
      setDurationError(null)
    } else {
      setDurationInputText(formatMsToDisplay(animationDuration))
      setDurationError(null)
    }
  }

  const handleWeightSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const weight = Number(e.target.value)
    setFavoriteWeightBonus(weight)
    setWeightInputText(formatPercentage(weight))
    setWeightError(null)
  }

  const handleWeightTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setWeightInputText(val)
    const parsed = parsePercentage(val)
    if (parsed === null) {
      setWeightError('Пример: 50%, +25%, -20% или 0% (мин. -100%)')
    } else {
      setWeightError(null)
      setFavoriteWeightBonus(parsed)
    }
  }

  const handleWeightTextBlur = () => {
    const parsed = parsePercentage(weightInputText)
    if (parsed !== null) {
      setFavoriteWeightBonus(parsed)
      setWeightInputText(formatPercentage(parsed))
      setWeightError(null)
    } else {
      setWeightInputText(formatPercentage(favoriteWeightBonus))
      setWeightError(null)
    }
  }

  const handleCountdownSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sec = Number(e.target.value)
    setLaunchCountdownSeconds(sec)
    setCountdownInputText(formatCountdownDisplay(sec))
    setCountdownError(null)
  }

  const handleCountdownTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCountdownInputText(val)
    const parsed = parseCountdownSeconds(val)
    if (parsed === null) {
      setCountdownError('Пример: 5 сек, 3.5 или 2,5 сек (от 1 до 30 сек)')
    } else {
      setCountdownError(null)
      setLaunchCountdownSeconds(parsed)
    }
  }

  const handleCountdownTextBlur = () => {
    const parsed = parseCountdownSeconds(countdownInputText)
    if (parsed !== null) {
      setLaunchCountdownSeconds(parsed)
      setCountdownInputText(formatCountdownDisplay(parsed))
      setCountdownError(null)
    } else {
      setCountdownInputText(formatCountdownDisplay(launchCountdownSeconds))
      setCountdownError(null)
    }
  }

  const handleBatchFetchCovers = async () => {
    setIsFetchingCovers(true)
    setCoversResult(null)
    try {
      const res = await window.electronAPI.autoFetchCovers()
      setCoversResult(`Обработано: ${res.processed}, обновлено обложек: ${res.updated}`)
    } catch (err) {
      setCoversResult('Ошибка при загрузке обложек')
    } finally {
      setIsFetchingCovers(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Настройки</h1>
          <p className={styles.subtitle}>Параметры выбора, рулетки и интеграций</p>
        </div>

        <Button variant="primary" onClick={handleSave}>
          <Save size={16} />
          <span>Сохранить изменения</span>
        </Button>
      </header>

      {savedSuccess && (
        <div className={styles.alertSuccess}>
          <ShieldCheck size={18} />
          <span>Настройки успешно сохранены!</span>
        </div>
      )}

      <div className={styles.sectionsGrid}>
        {/* Рулетка */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Clock size={16} />
            Рулетка и анимация
          </h2>

          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <span className={styles.fieldLabel}>Звуковые эффекты рулетки</span>
              <span className={styles.fieldDesc}>Воспроизведение звука щелчков и победного аккорда во время рулетки</span>
            </div>
            <Toggle
              checked={soundEnabled}
              onChange={setSoundEnabled}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldInfo}>
              <span className={styles.fieldLabel}>Звук уведомлений об ошибках</span>
              <span className={styles.fieldDesc}>Ненавязчивый мягкий звуковой сигнал при возникновении критических ошибок</span>
            </div>
            <Toggle
              checked={notificationSoundEnabled}
              onChange={setNotificationSoundEnabled}
            />
          </div>

          <div className={styles.fieldCol}>
            <div className={styles.fieldInfo}>
              <span className={styles.fieldLabel}>Режим анимации</span>
              <span className={styles.fieldDesc}>Способ визуального перебора игр при выборе</span>
            </div>
            <div className={styles.animSelector}>
              <button
                type="button"
                className={`${styles.animBtn} ${animationType === 'sequential' ? styles.animBtnActive : ''}`}
                onClick={() => setAnimationType('sequential')}
              >
                <span className={styles.animTitle}>Последовательная</span>
                <span className={styles.animDesc}>Подсветка сверху вниз с замедлением</span>
              </button>

              <button
                type="button"
                className={`${styles.animBtn} ${animationType === 'random' ? styles.animBtnActive : ''}`}
                onClick={() => setAnimationType('random')}
              >
                <span className={styles.animTitle}>Случайная</span>
                <span className={styles.animDesc}>Случайные прыжки по списку с замедлением</span>
              </button>

              <button
                type="button"
                className={`${styles.animBtn} ${animationType === 'cases' ? styles.animBtnActive : ''}`}
                onClick={() => setAnimationType('cases')}
              >
                <span className={styles.animTitle}>Кейсы</span>
                <span className={styles.animDesc}>Открытие кейса с эффектным появлением игры</span>
              </button>

              <button
                type="button"
                className={`${styles.animBtn} ${animationType === 'horizontal_wheel' ? styles.animBtnActive : ''}`}
                onClick={() => setAnimationType('horizontal_wheel')}
              >
                <span className={styles.animTitle}>Горизонтальная рулетка</span>
                <span className={styles.animDesc}>Прокрутка горизонтальной ленты карточек</span>
              </button>

              <button
                type="button"
                className={`${styles.animBtn} ${animationType === 'vertical_wheel' ? styles.animBtnActive : ''}`}
                onClick={() => setAnimationType('vertical_wheel')}
              >
                <span className={styles.animTitle}>Вертикальная рулетка</span>
                <span className={styles.animDesc}>Движение вертикальной ленты со стрелками</span>
              </button>
            </div>
          </div>

          {/* Длительность анимации */}
          <div className={styles.fieldCol}>
            <div className={styles.fieldInfo}>
              <div className={styles.labelRow}>
                <span className={styles.fieldLabel}>Длительность анимации</span>
                <span className={styles.valueHighlight}>
                  {animationDuration === 0 ? '0 сек (мгновенно)' : formatMsToDisplay(animationDuration)}
                  {animationDuration > 10000 && (
                    <span className={styles.manualNote}> (ручной ввод)</span>
                  )}
                </span>
              </div>
              <span className={styles.fieldDesc}>
                Время перебора игр перед определением победителя (0 сек — мгновенный выбор без задержки)
              </span>
            </div>
            <div className={styles.sliderWithInput}>
              <input
                type="range"
                min="0"
                max="10000"
                step="250"
                value={Math.min(10000, Math.max(0, animationDuration))}
                onChange={handleDurationSliderChange}
                className={styles.rangeInput}
              />
              <input
                type="text"
                value={durationInputText}
                onChange={handleDurationTextChange}
                onBlur={handleDurationTextBlur}
                className={`${styles.syncInput} ${durationError ? styles.inputError : ''}`}
                placeholder="5 сек"
                title="Введите длительность (например, 5 сек, 2.5с или 500 мс)"
              />
            </div>
            {durationError && (
              <span className={styles.validationMsg}>{durationError}</span>
            )}
          </div>

          {/* Вес избранных игр */}
          <div className={styles.fieldCol}>
            <div className={styles.fieldInfo}>
              <div className={styles.labelRow}>
                <span className={styles.fieldLabel}>Влияние избранного на вероятность выбора</span>
                <span className={styles.valueHighlight}>
                  {formatPercentage(favoriteWeightBonus)}
                  {favoriteWeightBonus > 100 && (
                    <span className={styles.manualNote}> (ручной ввод)</span>
                  )}
                </span>
              </div>
              <span className={styles.fieldDesc}>
                {favoriteWeightBonus === 0
                  ? '0% — избранные игры имеют равный шанс с остальными'
                  : favoriteWeightBonus === -100
                  ? '-100% — избранные игры полностью исключены из рулетки'
                  : favoriteWeightBonus > 0
                  ? `+${favoriteWeightBonus}% — относительный шанс избранных игр умножается на ${(1 + favoriteWeightBonus / 100).toFixed(2)}x`
                  : `${favoriteWeightBonus}% — относительный шанс избранных игр снижен до ${(1 + favoriteWeightBonus / 100).toFixed(2)}x`}
              </span>
            </div>
            <div className={styles.sliderWithInput}>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={Math.min(100, Math.max(-100, favoriteWeightBonus))}
                onChange={handleWeightSliderChange}
                className={styles.rangeInput}
              />
              <input
                type="text"
                value={weightInputText}
                onChange={handleWeightTextChange}
                onBlur={handleWeightTextBlur}
                className={`${styles.syncInput} ${weightError ? styles.inputError : ''}`}
                placeholder="0%"
                title="Введите процент от -100% (например, +50% или -25%)"
              />
            </div>
            {weightError && (
              <span className={styles.validationMsg}>{weightError}</span>
            )}
          </div>
        </section>

        {/* Способ запуска игры после выбора */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Rocket size={16} />
            Запуск игры после выбора
          </h2>

          <div className={styles.fieldCol}>
            <div className={styles.fieldInfo}>
              <span className={styles.fieldLabel}>Способ запуска игры после выбора</span>
              <span className={styles.fieldDesc}>
                Как приложение запускает победившую в рулетке игру
              </span>
            </div>

            <div className={styles.animSelector}>
              <button
                type="button"
                className={`${styles.animBtn} ${launchMode === 'manual' ? styles.animBtnActive : ''}`}
                onClick={() => setLaunchMode('manual')}
              >
                <span className={styles.animTitle}>Подтверждение</span>
                <span className={styles.animDesc}>
                  Показывается карточка с игрой. Запуск происходит только по нажатию кнопки вручную.
                </span>
              </button>

              <button
                type="button"
                className={`${styles.animBtn} ${launchMode === 'countdown' ? styles.animBtnActive : ''}`}
                onClick={() => setLaunchMode('countdown')}
              >
                <span className={styles.animTitle}>Обратный отсчёт</span>
                <span className={styles.animDesc}>
                  Карточка с таймером и заметной кнопкой отмены перед автоматическим запуском.
                </span>
              </button>

              <button
                type="button"
                className={`${styles.animBtn} ${launchMode === 'instant' ? styles.animBtnActive : ''}`}
                onClick={() => setLaunchMode('instant')}
              >
                <span className={styles.animTitle}>Автоматический</span>
                <span className={styles.animDesc}>
                  Мгновенный запуск выбранной игры сразу после завершения рулетки.
                </span>
              </button>
            </div>
          </div>

          {/* Countdown delay slider and input - shown ONLY when countdown mode is active */}
          {launchMode === 'countdown' && (
            <div className={styles.fieldCol}>
              <div className={styles.fieldInfo}>
                <div className={styles.labelRow}>
                  <span className={styles.fieldLabel}>Время задержки обратного отсчёта</span>
                  <span className={styles.valueHighlight}>
                    {launchCountdownSeconds} сек
                  </span>
                </div>
                <span className={styles.fieldDesc}>
                  Количество секунд до автоматического запуска игры (с возможностью отмены)
                </span>
              </div>
              <div className={styles.sliderWithInput}>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={launchCountdownSeconds}
                  onChange={handleCountdownSliderChange}
                  className={styles.rangeInput}
                />
                <input
                  type="text"
                  value={countdownInputText}
                  onChange={handleCountdownTextChange}
                  onBlur={handleCountdownTextBlur}
                  className={`${styles.syncInput} ${countdownError ? styles.inputError : ''}`}
                  placeholder="5 сек"
                  title="Введите задержку (например, 5 сек, 3.5 или 2,5 сек)"
                />
              </div>
              {countdownError && (
                <span className={styles.validationMsg}>{countdownError}</span>
              )}
            </div>
          )}
        </section>

        {/* Фильтры по умолчанию */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Volume2 size={16} />
            История и недавние игры
          </h2>

          <div className={styles.fieldCol}>
            <div className={styles.fieldInfo}>
              <span className={styles.fieldLabel}>Период исключения недавно сыгранных игр</span>
              <span className={styles.fieldDesc}>
                Если в фильтре активна опция «Исключить недавние», игры не будут выпадать указанное число дней (0 = выключено)
              </span>
            </div>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                min="0"
                max="90"
                value={excludeRecentDays}
                onChange={(e) => setExcludeRecentDays(Math.max(0, Number(e.target.value)))}
                className={styles.numberInput}
              />
              <span className={styles.unitText}>дней</span>
            </div>
          </div>
        </section>

        {/* Провайдеры метаданных */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Key size={16} />
            Внешние API и метаданные
          </h2>
          <p className={styles.sectionDesc}>
            PlayPick работает автономно. Для Steam метаданные и жанры получаются автоматически из открытого API.
            Ключи сторонних сервисов сохраняются только локально в зашифрованной SQLite-базе.
          </p>

          <div className={styles.fieldCol}>
            <span className={styles.fieldLabel}>SteamGridDB API Key (бесплатный запасной источник)</span>
            <span className={styles.fieldDesc}>
              Используется для качественных постеров и обложек любых игр (steamgriddb.com/profile/preferences/api)
            </span>
            <input
              type="password"
              placeholder="Введите ключ SteamGridDB API"
              value={steamGridDbApiKey}
              onChange={(e) => setSteamGridDbApiKey(e.target.value)}
              className={styles.textInput}
            />
          </div>

          <div className={styles.fieldCol}>
            <span className={styles.fieldLabel}>RAWG API Key (опционально)</span>
            <span className={styles.fieldDesc}>
              Используется для поиска метаданных и тегов нестандартных игр (rawg.io)
            </span>
            <input
              type="password"
              placeholder="Введите ключ RAWG"
              value={rawgApiKey}
              onChange={(e) => setRawgApiKey(e.target.value)}
              className={styles.textInput}
            />
          </div>

          <div className={styles.fieldCol}>
            <span className={styles.fieldLabel}>Steam Web API Key (опционально)</span>
            <span className={styles.fieldDesc}>
              Для расширенного доступа к Steam Web API (steamcommunity.com/dev/apikey)
            </span>
            <input
              type="password"
              placeholder="Введите ключ Steam API"
              value={steamApiKey}
              onChange={(e) => setSteamApiKey(e.target.value)}
              className={styles.textInput}
            />
          </div>

          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button
              variant="secondary"
              loading={isFetchingCovers}
              onClick={handleBatchFetchCovers}
            >
              Загрузить недостающие обложки и жанры
            </Button>
            {coversResult && (
              <span style={{ fontSize: 13, color: 'var(--color-accent)' }}>{coversResult}</span>
            )}
          </div>
        </section>

        {/* Информация */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Info size={16} />
            О приложении
          </h2>

          <div className={styles.infoRow}>
            <span className={styles.infoKey}>Версия PlayPick</span>
            <span className={styles.infoVal}>{appVersion ? `${appVersion} (Beta)` : '0.1.1 (Beta)'}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoKey}>Платформа</span>
            <span className={styles.infoVal}>Windows x64</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoKey}>Локальная база данных</span>
            <span className={styles.infoVal}>SQLite (WAL-режим)</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoKey}>Безопасность</span>
            <span className={styles.infoVal}>Context Isolation, Node Integration Off, Safe IPC</span>
          </div>
        </section>
      </div>
    </div>
  )
}
