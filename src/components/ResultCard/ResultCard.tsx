import React, { useState, useEffect, useRef } from 'react'
import { ImageOff, X, Heart, Timer, Ban, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import type { Game } from '../../types/electron'
import { Button } from '../ui/Button'
import { resolveCoverUrl } from '../../utils/cover'
import styles from './ResultCard.module.css'

interface ResultCardProps {
  game: Game
  onLaunch: () => Promise<{ success: boolean; error?: string } | void> | void
  onPickAnother: () => void
  onClose: () => void
  launching: boolean
  onToggleFavorite?: (id: string, value: boolean) => void
  launchMode?: 'manual' | 'countdown' | 'instant'
  countdownDurationSec?: number
}

function sourceLabel(game: Game): string {
  if (game.sources.length === 0) {
    return game.launchType === 'executable' ? 'Executable' : game.launchType
  }
  const map: Record<string, string> = {
    steam: 'Steam', epic: 'Epic', gog: 'GOG', ea: 'EA',
    ubisoft: 'Ubisoft', executable: 'Executable', manual: 'Executable', shortcut: 'Ярлык',
  }
  return map[game.sources[0].sourceType] ?? game.sources[0].sourceType
}

export const ResultCard: React.FC<ResultCardProps> = ({
  game,
  onLaunch,
  onPickAnother,
  onClose,
  launching,
  onToggleFavorite,
  launchMode = 'manual',
  countdownDurationSec = 5,
}) => {
  const [imgError, setImgError] = useState(false)
  const [currentCover, setCurrentCover] = useState<string | undefined>(game.coverPath)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => resolveCoverUrl(game.coverPath))
  const [isFavorite, setIsFavorite] = useState(Boolean(game.isFavorite))

  // Launch modes state
  const [countdownRemaining, setCountdownRemaining] = useState(countdownDurationSec)
  const [isCountdownCancelled, setIsCountdownCancelled] = useState(false)
  const [launchStatus, setLaunchStatus] = useState<
    'idle' | 'countdown' | 'launching' | 'launched' | 'failed'
  >(() => {
    if (launchMode === 'countdown') return 'countdown'
    if (launchMode === 'instant') return 'launching'
    return 'idle'
  })
  const [launchErrorMessage, setLaunchErrorMessage] = useState<string | null>(null)

  const launchTriggeredRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsFavorite(Boolean(game.isFavorite))
  }, [game.id, game.isFavorite])

  // Execute launch safely once
  const executeLaunch = async () => {
    if (launchTriggeredRef.current) return
    launchTriggeredRef.current = true
    setLaunchStatus('launching')
    setLaunchErrorMessage(null)

    try {
      const res = await onLaunch()
      if (res && res.success === false) {
        setLaunchStatus('failed')
        setLaunchErrorMessage(res.error || 'Не удалось запустить игру')
        launchTriggeredRef.current = false // Allow manual retry
      } else {
        setLaunchStatus('launched')
      }
    } catch (err: unknown) {
      setLaunchStatus('failed')
      setLaunchErrorMessage(err instanceof Error ? err.message : 'Ошибка при запуске')
      launchTriggeredRef.current = false // Allow manual retry
    }
  }

  // Handle countdown mode
  useEffect(() => {
    if (launchMode !== 'countdown' || isCountdownCancelled || launchStatus !== 'countdown') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const startTime = Date.now()
    const totalMs = countdownDurationSec * 1000

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remainingMs = Math.max(0, totalMs - elapsed)
      const remainingSec = Math.round((remainingMs / 1000) * 10) / 10
      setCountdownRemaining(remainingSec)

      if (remainingMs <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        void executeLaunch()
      }
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [launchMode, isCountdownCancelled, countdownDurationSec])

  // Handle instant mode
  useEffect(() => {
    if (launchMode === 'instant' && !launchTriggeredRef.current) {
      void executeLaunch()
    }
  }, [launchMode])

  const handleCancelCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsCountdownCancelled(true)
    setLaunchStatus('idle')
  }

  const handleManualLaunch = () => {
    launchTriggeredRef.current = false
    void executeLaunch()
  }

  useEffect(() => {
    setCurrentCover(game.coverPath)
    setImgError(false)

    if (game.coverPath) {
      setResolvedSrc(resolveCoverUrl(game.coverPath))
    } else {
      setResolvedSrc(null)
      window.electronAPI.ensureGameCover(game.id)
        .then((path) => {
          if (path) {
            setCurrentCover(path)
            setResolvedSrc(resolveCoverUrl(path))
            setImgError(false)
          }
        })
        .catch(() => {})
    }
  }, [game.id, game.coverPath])

  const handleImgError = (): void => {
    if (currentCover && window.electronAPI?.getCoverDataUrl && !resolvedSrc?.startsWith('data:')) {
      window.electronAPI.getCoverDataUrl(currentCover)
        .then((dataUrl) => {
          if (dataUrl) {
            setResolvedSrc(dataUrl)
          } else {
            setImgError(true)
          }
        })
        .catch(() => setImgError(true))
    } else {
      setImgError(true)
    }
  }

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextVal = !isFavorite
    setIsFavorite(nextVal)
    onToggleFavorite?.(game.id, nextVal)
  }

  const showImg = resolvedSrc !== null && !imgError

  const allGenres = [...game.genres, ...game.userGenres]
  const allTags = [...game.tags, ...game.userTags]

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.card}>
        <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Закрыть">
          <X size={16} />
        </button>

        <div
          className={[
            styles.cover,
            isFavorite ? styles.coverFavorite : '',
          ].filter(Boolean).join(' ')}
          role="button"
          tabIndex={0}
          onClick={handleToggleFav}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleToggleFav(e as unknown as React.MouseEvent)
            }
          }}
          title={isFavorite ? 'Удалить из избранного (кликните по обложке)' : 'Добавить в избранное (кликните по обложке)'}
        >
          {showImg && resolvedSrc ? (
            <img
              className={styles.coverImg}
              src={resolvedSrc}
              alt={game.title}
              onError={handleImgError}
            />
          ) : (
            <div className={styles.coverPlaceholder}>
              <ImageOff size={36} />
              <span className={styles.placeholderText}>Нет обложки</span>
            </div>
          )}

          {/* Hover overlay: dims image and displays centered heart */}
          <div className={styles.coverHoverOverlay} aria-hidden="true">
            <Heart
              size={36}
              className={styles.hoverHeart}
              fill={isFavorite ? '#ff4d4f' : 'transparent'}
              stroke={isFavorite ? '#ff4d4f' : '#ffffff'}
            />
          </div>
        </div>

        <div className={styles.info}>
          <div className={styles.headerGroup}>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>{game.title}</h2>
              <button
                type="button"
                className={`${styles.titleFavBtn} ${isFavorite ? styles.titleFavActive : ''}`}
                onClick={handleToggleFav}
                title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                aria-label={isFavorite ? `Удалить «${game.title}» из избранного` : `Добавить «${game.title}» в избранное`}
              >
                <Heart
                  size={20}
                  fill={isFavorite ? '#ff4d4f' : 'transparent'}
                  stroke={isFavorite ? '#ff4d4f' : 'currentColor'}
                  className={styles.titleFavIcon}
                />
              </button>
            </div>
            <span className={styles.sourceBadge}>{sourceLabel(game)}</span>
          </div>

          <div className={styles.metadataBlock}>
            {allGenres.length > 0 && (
              <div className={styles.metaSection}>
                <span className={styles.metaLabel}>Жанры</span>
                <div className={styles.pills}>
                  {allGenres.map((g) => (
                    <span key={g} className={styles.genrePill}>{g}</span>
                  ))}
                </div>
              </div>
            )}

            {allTags.length > 0 && (
              <div className={styles.metaSection}>
                <span className={styles.metaLabel}>Теги</span>
                <div className={styles.pills}>
                  {allTags.slice(0, 10).map((t) => (
                    <span key={t} className={styles.tagPill}>{t}</span>
                  ))}
                  {allTags.length > 10 && (
                    <span className={styles.morePill}>+{allTags.length - 10}</span>
                  )}
                </div>
              </div>
            )}

            {allGenres.length === 0 && allTags.length === 0 && (
              <p className={styles.noMetaHint}>Жанры и теги не указаны</p>
            )}
          </div>

          <div className={styles.spacer} />

          <div className={styles.actions}>
            {/* Status Banners */}
            {launchStatus === 'countdown' && !isCountdownCancelled && (
              <div className={styles.countdownBanner}>
                <div className={styles.countdownInfo}>
                  <Timer size={16} className={styles.timerIcon} />
                  <span>
                    Запуск через <strong>{countdownRemaining.toFixed(1)} сек</strong>...
                  </span>
                </div>
                <div className={styles.countdownProgressTrack}>
                  <div
                    className={styles.countdownProgressBar}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (countdownRemaining / (countdownDurationSec || 5)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {isCountdownCancelled && launchStatus === 'idle' && (
              <div className={styles.cancelledBanner}>
                <Ban size={14} />
                <span>Автозапуск отменён. Вы можете запустить игру вручную.</span>
              </div>
            )}

            {launchStatus === 'launching' && (
              <div className={styles.launchingBanner}>
                <div className={styles.spinner} />
                <span>Запуск исполняемого файла игры...</span>
              </div>
            )}

            {launchStatus === 'launched' && (
              <div className={styles.launchedBanner}>
                <CheckCircle2 size={16} />
                <span>Игра успешно запущена</span>
              </div>
            )}

            {launchStatus === 'failed' && (
              <div className={styles.failedBanner}>
                <AlertCircle size={16} />
                <span>{launchErrorMessage || 'Не удалось запустить игру'}</span>
              </div>
            )}

            {/* Action Buttons */}
            {launchStatus === 'countdown' && !isCountdownCancelled ? (
              <>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleCancelCountdown}
                  type="button"
                >
                  <Ban size={16} />
                  <span>Отменить запуск</span>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onPickAnother}
                  type="button"
                >
                  Выбрать другую
                </Button>
              </>
            ) : launchStatus === 'launched' ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onPickAnother}
                  type="button"
                >
                  Выбрать другую
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleManualLaunch}
                  loading={launching}
                  type="button"
                >
                  <RotateCcw size={15} />
                  <span>Запустить повторно</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleManualLaunch}
                  loading={launching || launchStatus === 'launching'}
                  type="button"
                >
                  {launchStatus === 'failed' ? 'Повторить запуск' : 'Запустить игру'}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onPickAnother}
                  disabled={launching || launchStatus === 'launching'}
                  type="button"
                >
                  Выбрать другую
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
