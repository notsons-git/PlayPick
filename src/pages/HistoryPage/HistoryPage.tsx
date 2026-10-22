import { useState, useEffect, useCallback } from 'react'
import { Trash2, Play, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { SelectionHistoryEntry } from '../../types/electron'
import { resolveCoverUrl } from '../../utils/cover'
import styles from './HistoryPage.module.css'

export default function HistoryPage() {
  const [history, setHistory] = useState<SelectionHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [launchingId, setLaunchingId] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const data = await window.electronAPI.getHistory()
      setHistory(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleClear = async () => {
    if (window.confirm('Очистить всю историю выбора игр?')) {
      await window.electronAPI.clearHistory()
      await loadHistory()
    }
  }

  const handleLaunch = async (entry: SelectionHistoryEntry) => {
    if (!entry.gameId) return
    setLaunchingId(entry.id)
    try {
      const res = await window.electronAPI.launchGame(entry.gameId)
      if (!res.success) {
        alert(`Не удалось запустить игру: ${res.error || 'Ошибка запуска'}`)
      }
    } finally {
      setLaunchingId(null)
    }
  }

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>История выбора</h1>
          <span className={styles.countBadge}>{history.length} записей</span>
        </div>

        {history.length > 0 && (
          <Button variant="danger" size="sm" onClick={handleClear}>
            <Trash2 size={15} />
            <span>Очистить историю</span>
          </Button>
        )}
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.centerMessage}>Загрузка истории...</div>
        ) : history.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>История пока пуста</p>
            <p className={styles.emptySubtitle}>
              Здесь будут сохраняться результаты запусков рулетки и фильтры, с которыми они были сделаны
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {history.map((entry) => (
              <div key={entry.id} className={styles.item}>
                <div className={styles.cover}>
                  {entry.gameCoverPath && resolveCoverUrl(entry.gameCoverPath) ? (
                    <img
                      src={resolveCoverUrl(entry.gameCoverPath)!}
                      alt={entry.gameTitle}
                      className={styles.coverImg}
                      onError={(e) => {
                        // Fallback to data URL if available
                        if (window.electronAPI?.getCoverDataUrl && entry.gameCoverPath) {
                          window.electronAPI.getCoverDataUrl(entry.gameCoverPath).then(dataUrl => {
                            if (dataUrl) {
                              ;(e.target as HTMLImageElement).src = dataUrl
                            } else {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }
                          }).catch(() => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          })
                        } else {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }
                      }}
                    />
                  ) : (
                    <div className={styles.coverPlaceholder}>?</div>
                  )}
                </div>

                <div className={styles.details}>
                  <div className={styles.rowTop}>
                    <span className={styles.gameTitle}>{entry.gameTitle}</span>
                    <span className={styles.date}>
                      <Calendar size={13} className={styles.dateIcon} />
                      {formatDate(entry.selectedAt)}
                    </span>
                  </div>

                  <div className={styles.metaRow}>
                    <div className={styles.statusBadge}>
                      {entry.launched ? (
                        <span className={styles.launchedSuccess}>
                          <CheckCircle2 size={13} />
                          Запущена
                        </span>
                      ) : entry.launchAttempted ? (
                        <span className={styles.launchedFailed}>
                          <XCircle size={13} />
                          Попытка запуска
                        </span>
                      ) : (
                        <span className={styles.launchedNone}>Только выбор</span>
                      )}
                    </div>

                    {entry.filters && (
                      <div className={styles.filterSummary}>
                        {entry.filters.genres?.length > 0 && (
                          <span className={styles.filterTag}>
                            Жанры: {entry.filters.genres.join(', ')}
                          </span>
                        )}
                        {entry.filters.tags?.length > 0 && (
                          <span className={styles.filterTag}>
                            Теги ({entry.filters.tagMode === 'all' ? 'И' : 'ИЛИ'}): {entry.filters.tags.join(', ')}
                          </span>
                        )}
                        {entry.filters.onlyInstalled && (
                          <span className={styles.filterTag}>Только установленные</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {entry.gameId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={launchingId === entry.id}
                    onClick={() => handleLaunch(entry)}
                  >
                    <Play size={14} />
                    <span>Запустить</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
