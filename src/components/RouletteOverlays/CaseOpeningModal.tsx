import React, { useEffect, useState, useRef } from 'react'
import { Package, Sparkles, X } from 'lucide-react'
import type { Game } from '../../types/electron'
import { soundService } from '../../services/sound/soundService'
import { resolveCoverUrl } from '../../utils/cover'
import styles from './CaseOpeningModal.module.css'

interface CaseOpeningModalProps {
  winner: Game
  durationMs?: number
  onComplete: () => void
  onCancel: () => void
}

type Stage = 'closed' | 'unlocking' | 'opening' | 'revealed'

export const CaseOpeningModal: React.FC<CaseOpeningModalProps> = ({
  winner,
  durationMs = 4000,
  onComplete,
  onCancel,
}) => {
  const [stage, setStage] = useState<Stage>('closed')
  const [imgError, setImgError] = useState(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (durationMs <= 0) {
      soundService.playWin()
      onComplete()
      return
    }

    // Stage 1: Unlocking after 600ms
    const t1 = setTimeout(() => {
      setStage('unlocking')
      soundService.playTick(1.2)
    }, 600)

    // Stage 2: Opening after 1500ms
    const t2 = setTimeout(() => {
      setStage('opening')
      soundService.playTick(1.6)
    }, 1500)

    // Stage 3: Revealed after 2600ms
    const t3 = setTimeout(() => {
      setStage('revealed')
      soundService.playWin()
    }, 2600)

    // Stage 4: Finished after durationMs
    const t4 = setTimeout(() => {
      onComplete()
    }, Math.max(3200, durationMs))

    timeoutsRef.current = [t1, t2, t3, t4]

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
    }
  }, [durationMs, onComplete])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const coverSrc = resolveCoverUrl(winner.coverPath)
  const allGenres = [...winner.genres, ...winner.userGenres]

  return (
    <div className={styles.overlay}>
      <div className={styles.topActions}>
        <button
          type="button"
          className={styles.skipBtn}
          onClick={onComplete}
          title="Пропустить анимацию"
        >
          <span>Пропустить</span>
        </button>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onCancel}
          title="Отмена"
        >
          <X size={16} />
        </button>
      </div>

      <div className={`${styles.container} ${styles[stage]}`}>
        {/* Glow light rays */}
        <div className={styles.godRays} />

        {/* 3D Crate container */}
        <div className={styles.crateWrapper}>
          <div className={styles.crate}>
            <div className={styles.crateLid}>
              <div className={styles.latch} />
            </div>
            <div className={styles.crateBody}>
              <Package size={48} className={styles.crateIcon} />
              <span className={styles.crateBrand}>PLAYPICK CASE</span>
            </div>
          </div>
        </div>

        {/* Revealed Game Card floating out */}
        <div className={styles.cardReveal}>
          <div className={styles.coverBox}>
            {coverSrc && !imgError ? (
              <img
                src={coverSrc}
                alt={winner.title}
                className={styles.coverImg}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={styles.coverPlaceholder}>
                <Sparkles size={36} />
              </div>
            )}
          </div>

          <div className={styles.cardDetails}>
            <span className={styles.badge}>ВЫПАЛА ИГРА</span>
            <h2 className={styles.gameTitle}>{winner.title}</h2>
            {allGenres.length > 0 && (
              <div className={styles.genres}>
                {allGenres.slice(0, 3).map((g) => (
                  <span key={g} className={styles.genre}>
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
