import React, { useEffect, useState, useMemo, useRef } from 'react'
import { X, Trophy } from 'lucide-react'
import type { Game } from '../../types/electron'
import { soundService } from '../../services/sound/soundService'
import { resolveCoverUrl } from '../../utils/cover'
import styles from './VerticalRouletteModal.module.css'

interface VerticalRouletteModalProps {
  candidates: Game[]
  winner: Game
  durationMs?: number
  onComplete: () => void
  onCancel: () => void
}

const ITEM_HEIGHT = 76
const ITEM_GAP = 10
const TOTAL_ITEMS = 46
const WINNER_INDEX = 34

export const VerticalRouletteModal: React.FC<VerticalRouletteModalProps> = ({
  candidates,
  winner,
  durationMs = 4000,
  onComplete,
  onCancel,
}) => {
  const [translateY, setTranslateY] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)

  const tape = useMemo(() => {
    if (candidates.length === 1) {
      return [winner]
    }
    const items: Game[] = []
    let candIdx = 0
    for (let i = 0; i < TOTAL_ITEMS; i++) {
      if (i === WINNER_INDEX) {
        items.push(winner)
      } else {
        items.push(candidates[candIdx % candidates.length])
        candIdx++
      }
    }
    return items
  }, [candidates, winner])

  useEffect(() => {
    if (durationMs <= 0) {
      soundService.playWin()
      onComplete()
      return
    }

    if (candidates.length === 1) {
      const t = setTimeout(() => {
        soundService.playWin()
        onComplete()
      }, 700)
      return () => clearTimeout(t)
    }

    const startTimer = setTimeout(() => {
      setIsSpinning(true)

      // In container with height ~420px, center is 210px
      const centerViewport = 210
      const cardCenter = WINNER_INDEX * (ITEM_HEIGHT + ITEM_GAP) + ITEM_HEIGHT / 2
      const targetY = cardCenter - centerViewport

      setTranslateY(targetY)

      // Synchronize clicks with actual DOM vertical movement
      const initialTop = trackRef.current ? trackRef.current.getBoundingClientRect().top : 0
      const stepStride = ITEM_HEIGHT + ITEM_GAP
      let lastCrossedIndex = 0

      const checkTick = () => {
        if (!trackRef.current) return
        const currentTop = trackRef.current.getBoundingClientRect().top
        const moved = initialTop - currentTop
        const currentCardIndex = Math.floor((moved + 38) / stepStride)

        if (currentCardIndex > lastCrossedIndex && currentCardIndex <= WINNER_INDEX) {
          const progress = currentCardIndex / WINNER_INDEX
          soundService.playTick(0.85 + progress * 0.4)
          lastCrossedIndex = currentCardIndex
        }

        if (currentCardIndex < WINNER_INDEX) {
          animFrameRef.current = requestAnimationFrame(checkTick)
        }
      }

      animFrameRef.current = requestAnimationFrame(checkTick)
    }, 60)

    const finishTimer = setTimeout(() => {
      setHasFinished(true)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      soundService.playWin()

      const modalCloseTimer = setTimeout(() => {
        onComplete()
      }, 750)
      return () => clearTimeout(modalCloseTimer)
    }, durationMs + 100)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(finishTimer)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [candidates.length, durationMs, onComplete])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.skipBtn}
        onClick={onCancel}
        title="Отмена"
      >
        <X size={16} />
      </button>

      <div className={styles.rouletteBox}>
        <div className={styles.headerTitle}>
          <Trophy size={16} className={styles.headerIcon} />
          <span>ВЕРТИКАЛЬНАЯ РУЛЕТКА</span>
        </div>

        <div className={styles.viewport}>
          {/* Aim indicators on left and right */}
          <div className={styles.indicatorLeft} />
          <div className={styles.indicatorRight} />
          <div className={styles.centerAimGlow} />

          {/* Cards Vertical Track */}
          <div
            ref={trackRef}
            className={styles.track}
            style={{
              transform: `translateY(-${translateY}px)`,
              transition: isSpinning
                ? `transform ${durationMs}ms cubic-bezier(0.12, 0.88, 0.22, 1)`
                : 'none',
            }}
          >
            {tape.map((game, idx) => {
              const cover = resolveCoverUrl(game.coverPath)
              const isWinnerCard = idx === WINNER_INDEX
              const isFav = Boolean(game.isFavorite)

              return (
                <div
                  key={`${game.id}-${idx}`}
                  className={[
                    styles.card,
                    isFav ? styles.isFavoriteCard : '',
                    isWinnerCard && hasFinished ? styles.winnerHighlight : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className={styles.cardCover}>
                    {cover ? (
                      <img src={cover} alt={game.title} className={styles.img} />
                    ) : (
                      <div className={styles.cardPlaceholder}>
                        {game.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardTitle}>{game.title}</span>
                    <span className={styles.cardGenre}>
                      {[...game.genres, ...game.userGenres][0] || 'Игра'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
