import React, { useEffect, useState, useMemo, useRef } from 'react'
import { X, Trophy } from 'lucide-react'
import type { Game } from '../../types/electron'
import { soundService } from '../../services/sound/soundService'
import { resolveCoverUrl } from '../../utils/cover'
import styles from './HorizontalRouletteModal.module.css'

interface HorizontalRouletteModalProps {
  candidates: Game[]
  winner: Game
  durationMs?: number
  onComplete: () => void
  onCancel: () => void
}

const ITEM_WIDTH = 140
const ITEM_GAP = 12
const TOTAL_ITEMS = 50
const WINNER_INDEX = 38

export const HorizontalRouletteModal: React.FC<HorizontalRouletteModalProps> = ({
  candidates,
  winner,
  durationMs = 4000,
  onComplete,
  onCancel,
}) => {
  const [translateX, setTranslateX] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [hasFinished, setHasFinished] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)

  // Generate tape of cards with winner strictly placed at WINNER_INDEX
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
      // Single candidate - short 700ms centered highlight
      const t = setTimeout(() => {
        soundService.playWin()
        onComplete()
      }, 700)
      return () => clearTimeout(t)
    }

    // Start spin after small mounting tick
    const startTimer = setTimeout(() => {
      setIsSpinning(true)

      // In container with width ~800px, center is 400px
      const centerViewport = 400
      const cardCenter = WINNER_INDEX * (ITEM_WIDTH + ITEM_GAP) + ITEM_WIDTH / 2
      const targetX = cardCenter - centerViewport

      setTranslateX(targetX)

      // Synchronize sound ticks with actual DOM card positions crossing the center
      const initialLeft = trackRef.current ? trackRef.current.getBoundingClientRect().left : 0
      const stepStride = ITEM_WIDTH + ITEM_GAP
      let lastCrossedIndex = 0

      const checkTick = () => {
        if (!trackRef.current) return
        const currentLeft = trackRef.current.getBoundingClientRect().left
        const moved = initialLeft - currentLeft
        const currentCardIndex = Math.floor((moved + 70) / stepStride)

        if (currentCardIndex > lastCrossedIndex && currentCardIndex <= WINNER_INDEX) {
          const progress = currentCardIndex / WINNER_INDEX
          // Clean tick sound slowing down with the real movement
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
          <span>РУЛЕТКА ВЫБОРА</span>
        </div>

        <div className={styles.viewport}>
          {/* Central Aim indicator */}
          <div className={styles.indicatorTop} />
          <div className={styles.indicatorBottom} />
          <div className={styles.centerAimGlow} />

          {/* Cards Track */}
          <div
            ref={trackRef}
            className={styles.track}
            style={{
              transform: `translateX(-${translateX}px)`,
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
                  <span className={styles.cardTitle}>{game.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
