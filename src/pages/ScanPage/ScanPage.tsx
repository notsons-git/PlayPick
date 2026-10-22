import { useState, useEffect } from 'react'
import { Search, Plus, CheckCircle, AlertCircle, RefreshCw, StopCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { AddGameModal } from '../../components/AddGameModal/AddGameModal'
import { useGames } from '../../context/GamesContext'
import type { ScanProgress, ScanResult } from '../../types/electron'
import styles from './ScanPage.module.css'

export default function ScanPage() {
  const { reload } = useGames()
  const [isScanning, setIsScanning] = useState(false)
  const [progressList, setProgressList] = useState<Record<string, ScanProgress>>({})
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<{ added: number; updated: number; skipped: number } | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  useEffect(() => {
    const unsubProgress = window.electronAPI.onScanProgress((prog) => {
      setProgressList((prev) => ({ ...prev, [prog.source]: prog }))
    })

    const unsubComplete = window.electronAPI.onScanComplete((res) => {
      setIsScanning(false)
      setScanResult(res)
      // By default select all scanned games
      setSelectedIndices(new Set(res.games.map((_, i) => i)))
    })

    return () => {
      unsubProgress()
      unsubComplete()
    }
  }, [])

  const handleStartScan = async () => {
    setIsScanning(true)
    setScanResult(null)
    setImportSummary(null)
    setProgressList({})
    setSelectedIndices(new Set())
    await window.electronAPI.scanGames()
  }

  const handleCancelScan = async () => {
    await window.electronAPI.cancelScan()
    setIsScanning(false)
  }

  const toggleSelectGame = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!scanResult) return
    if (selectedIndices.size === scanResult.games.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(scanResult.games.map((_, i) => i)))
    }
  }

  const handleImport = async () => {
    if (!scanResult) return
    setIsImporting(true)
    try {
      const gamesToImport = scanResult.games.filter((_, i) => selectedIndices.has(i))
      const res = await window.electronAPI.importScannedGames(gamesToImport)
      setImportSummary(res)
      await reload()
    } finally {
      setIsImporting(false)
    }
  }

  const sourcesInfo = [
    { name: 'Steam', desc: 'Чтение реестра Windows, libraryfolders.vdf и appmanifest файлов всех дисков' },
    { name: 'Epic Games Store', desc: 'Чтение локальных манифестов .item в ProgramData' },
    { name: 'GOG Galaxy', desc: 'Чтение реестра Windows и локальных манифестов goggame-*.info' },
    { name: 'EA app / Ubisoft Connect', desc: 'Сканирование ограничено (добавляются вручную через исполняемый файл)' },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Поиск установленных игр</h1>
          <p className={styles.subtitle}>
            PlayPick сканирует конфигурации лаунчеров без рекурсивного перебора дисков
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} />
            <span>Добавить вручную</span>
          </Button>

          {isScanning ? (
            <Button variant="danger" onClick={handleCancelScan}>
              <StopCircle size={16} />
              <span>Остановить</span>
            </Button>
          ) : (
            <Button variant="primary" onClick={handleStartScan}>
              <Search size={16} />
              <span>Начать сканирование</span>
            </Button>
          )}
        </div>
      </header>

      <div className={styles.sourcesGrid}>
        {sourcesInfo.map((s) => {
          const prog = progressList[s.name]
          return (
            <div key={s.name} className={styles.sourceCard}>
              <div className={styles.sourceCardTop}>
                <span className={styles.sourceName}>{s.name}</span>
                {prog && (
                  <span className={styles.sourceStatus}>
                    {prog.done ? (
                      prog.error ? (
                        <span className={styles.errorText} title={prog.error}>Ошибка</span>
                      ) : (
                        <span className={styles.doneText}>Найдено: {prog.found}</span>
                      )
                    ) : (
                      <span className={styles.runningText}>Сканирование...</span>
                    )}
                  </span>
                )}
              </div>
              <p className={styles.sourceDesc}>{prog?.stage || s.desc}</p>
            </div>
          )
        })}
      </div>

      {importSummary && (
        <div className={styles.summaryAlert}>
          <CheckCircle size={18} className={styles.summaryIcon} />
          <div>
            <strong>Импорт завершён:</strong> добавлено {importSummary.added}, обновлено {importSummary.updated}, пропущено {importSummary.skipped} игр.
          </div>
        </div>
      )}

      {scanResult && scanResult.errors.length > 0 && (
        <div className={styles.errorAlert}>
          <AlertCircle size={18} />
          <div>
            {scanResult.errors.map((e, idx) => (
              <div key={idx}><strong>{e.source}:</strong> {e.message}</div>
            ))}
          </div>
        </div>
      )}

      {scanResult && (
        <div className={styles.resultsContainer}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsTitle}>
              Найдено игр: {scanResult.games.length}
            </div>

            <div className={styles.resultsActions}>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedIndices.size === scanResult.games.length ? 'Снять выделение' : 'Выбрать все'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedIndices.size === 0 || isImporting}
                loading={isImporting}
                onClick={handleImport}
              >
                <RefreshCw size={14} />
                <span>Импортировать выбранные ({selectedIndices.size})</span>
              </Button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            {scanResult.games.length === 0 ? (
              <div className={styles.emptyResults}>
                Установленных игр в поддерживаемых лаунчерах не обнаружено.
                Вы можете добавить игры вручную через кнопку «Добавить вручную».
              </div>
            ) : (
              <div className={styles.scannedList}>
                {scanResult.games.map((game, i) => (
                  <div
                    key={`${game.sourceType}-${game.sourceId}-${i}`}
                    className={`${styles.scannedRow} ${selectedIndices.has(i) ? styles.selectedRow : ''}`}
                    onClick={() => toggleSelectGame(i)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(i)}
                      onChange={() => toggleSelectGame(i)}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.checkbox}
                    />
                    <div className={styles.scannedDetails}>
                      <span className={styles.scannedTitle}>{game.title}</span>
                      <span className={styles.scannedPath}>{game.installPath || 'Путь не указан'}</span>
                    </div>
                    <span className={styles.scannedSource}>{game.sourceType.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isAddOpen && (
        <AddGameModal
          onClose={() => setIsAddOpen(false)}
        />
      )}
    </div>
  )
}
