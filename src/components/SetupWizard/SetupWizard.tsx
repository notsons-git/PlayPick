import { useState, useEffect } from 'react'
import { Sparkles, CheckCircle, ArrowRight, Dices } from 'lucide-react'
import { Button } from '../ui/Button'
import { useGames } from '../../context/GamesContext'
import type { ScanProgress, ScanResult } from '../../types/electron'
import styles from './SetupWizard.module.css'

interface SetupWizardProps {
  onComplete: () => void
}

type WizardStep = 'welcome' | 'scanning' | 'results' | 'importing' | 'done'

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const { reload } = useGames()
  const [step, setStep] = useState<WizardStep>('welcome')
  const [progressText, setProgressText] = useState('Подготовка...')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [importSummary, setImportSummary] = useState<{ added: number } | null>(null)

  useEffect(() => {
    const unsubProg = window.electronAPI.onScanProgress((p: ScanProgress) => {
      setProgressText(`${p.source}: ${p.stage}`)
    })

    const unsubComp = window.electronAPI.onScanComplete((res: ScanResult) => {
      setScanResult(res)
      setSelectedIndices(new Set(res.games.map((_, i) => i)))
      setStep('results')
    })

    return () => {
      unsubProg()
      unsubComp()
    }
  }, [])

  const handleStartScan = async () => {
    setStep('scanning')
    setProgressText('Поиск поддерживаемых игровых библиотек...')
    await window.electronAPI.scanGames()
  }

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleImport = async () => {
    if (!scanResult) return
    setStep('importing')
    const toImport = scanResult.games.filter((_, i) => selectedIndices.has(i))
    const res = await window.electronAPI.importScannedGames(toImport)
    setImportSummary({ added: res.added })
    await window.electronAPI.setFirstRunDone()
    await reload()
    setStep('done')
  }

  const handleSkip = async () => {
    await window.electronAPI.setFirstRunDone()
    onComplete()
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoBadge}>
            <Dices size={28} className={styles.logoIcon} />
          </div>
          <h1 className={styles.title}>PlayPick</h1>
          <p className={styles.tagline}>«Меньше выбирай. Больше играй»</p>
        </div>

        {step === 'welcome' && (
          <div className={styles.body}>
            <p className={styles.desc}>
              Добро пожаловать! PlayPick поможет быстро определить, во что поиграть сегодня.
              Мы можем автоматически найти установленные игры из Steam, Epic Games Store и GOG Galaxy.
            </p>
            <div className={styles.welcomeActions}>
              <Button variant="primary" size="lg" onClick={handleStartScan}>
                <Sparkles size={18} />
                <span>Найти установленные игры</span>
              </Button>
              <Button variant="ghost" size="md" onClick={handleSkip}>
                Пропустить и настроить вручную
              </Button>
            </div>
          </div>
        )}

        {step === 'scanning' && (
          <div className={styles.bodyCenter}>
            <div className={styles.spinner} />
            <h2 className={styles.stepTitle}>Сканирование системы...</h2>
            <p className={styles.progressStatus}>{progressText}</p>
          </div>
        )}

        {step === 'results' && scanResult && (
          <div className={styles.body}>
            <h2 className={styles.stepTitle}>
              Найдено игр: {scanResult.games.length}
            </h2>
            <p className={styles.desc}>
              Проверьте список и снимите галочки с игр, которые вы не хотите добавлять в PlayPick:
            </p>

            <div className={styles.resultsList}>
              {scanResult.games.length === 0 ? (
                <div className={styles.noGames}>
                  Игр в лаунчерах не обнаружено. Вы сможете добавить свои игры вручную в библиотеке.
                </div>
              ) : (
                scanResult.games.map((g, idx) => (
                  <div
                    key={idx}
                    className={`${styles.itemRow} ${selectedIndices.has(idx) ? styles.itemSelected : ''}`}
                    onClick={() => toggleSelect(idx)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(idx)}
                      onChange={() => toggleSelect(idx)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={styles.gameTitle}>{g.title}</span>
                    <span className={styles.gameSource}>{g.sourceType.toUpperCase()}</span>
                  </div>
                ))
              )}
            </div>

            <div className={styles.resultsActions}>
              <Button variant="ghost" onClick={handleSkip}>
                Пропустить
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={selectedIndices.size === 0 && scanResult.games.length > 0}
              >
                <span>Импортировать ({selectedIndices.size})</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className={styles.bodyCenter}>
            <div className={styles.spinner} />
            <h2 className={styles.stepTitle}>Сохранение в библиотеку...</h2>
          </div>
        )}

        {step === 'done' && (
          <div className={styles.bodyCenter}>
            <CheckCircle size={48} className={styles.doneIcon} />
            <h2 className={styles.stepTitle}>Библиотека готова!</h2>
            <p className={styles.desc}>
              Добавлено игр: {importSummary?.added || 0}. Теперь вы можете фильтровать игры и запускать рулетку выбора.
            </p>
            <Button variant="primary" size="lg" onClick={onComplete}>
              <span>Перейти на главную</span>
              <ArrowRight size={18} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
