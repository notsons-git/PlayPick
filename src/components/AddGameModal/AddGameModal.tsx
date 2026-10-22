import React, { useState, useEffect, useMemo } from 'react'
import { FolderSearch, FolderOpen } from 'lucide-react'
import type { Game, ScannedExecutableItem } from '../../types/electron'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { AddGameCard } from './AddGameCard'
import { useNotifications } from '../../context/NotificationContext'
import { useGames } from '../../context/GamesContext'
import styles from './AddGameModal.module.css'

interface AddGameModalProps {
  onClose: () => void
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ onClose }) => {
  const { reload } = useGames()
  const { notifyError, notifyFeature, notifyTip } = useNotifications()

  const [manualExeInput, setManualExeInput] = useState('')
  const [isInspecting, setIsInspecting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanningProgress, setScanningProgress] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [cards, setCards] = useState<ScannedExecutableItem[]>([])
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  useEffect(() => {
    window.electronAPI.getAllGenres().then(setAvailableGenres).catch(() => {})
    window.electronAPI.getAllTags().then(setAvailableTags).catch(() => {})
  }, [])

  // Inspect and add single EXE path
  const handleAddFromPath = async (filePath: string) => {
    if (!filePath.trim()) return
    setIsInspecting(true)
    try {
      const inspected = await window.electronAPI.inspectExecutable(filePath.trim())
      if (!inspected) {
        notifyError(
          'Файл не распознан',
          'Указанный файл не найден, повреждён или не является исполняемым (.exe, .bat, .cmd)'
        )
        return
      }

      setCards((prev) => {
        const exists = prev.some(
          (c) => c.exePath.toLowerCase() === inspected.exePath.toLowerCase()
        )
        if (exists) {
          notifyTip('Уже в списке', `Игра «${inspected.title}» уже находится в списке добавления`)
          return prev
        }
        return [inspected, ...prev]
      })
      setManualExeInput('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось проанализировать файл'
      notifyError('Ошибка анализа EXE', msg)
    } finally {
      setIsInspecting(false)
    }
  }

  // Browse single EXE dialog
  const handleBrowseExe = async () => {
    try {
      const result = await window.electronAPI.openFilePicker({
        title: 'Выбрать исполняемый файл игры (.exe)',
        filters: [{ name: 'Исполняемые файлы', extensions: ['exe', 'bat', 'cmd'] }],
      })
      if (result) {
        setManualExeInput(result)
        await handleAddFromPath(result)
      }
    } catch {
      notifyError('Ошибка диалога', 'Не удалось открыть системный диалог выбора файла')
    }
  }

  // Scan entire folder dialog
  const handleScanFolder = async () => {
    try {
      const folderPath = await window.electronAPI.openFolderPicker(
        'Выберите папку с играми для сканирования'
      )
      if (!folderPath) return

      setIsScanning(true)
      setScanningProgress('Поиск исполняемых файлов...')

      const foundItems = await window.electronAPI.scanFolderForExecutables(folderPath)

      if (foundItems.length === 0) {
        notifyTip(
          'Игры не найдены',
          'В выбранной папке и её подпапках не найдено подходящих игровых .exe-файлов'
        )
        return
      }

      setCards((prev) => {
        const existingPaths = new Set(prev.map((c) => c.exePath.toLowerCase()))
        const newUnique = foundItems.filter((item) => !existingPaths.has(item.exePath.toLowerCase()))
        return [...prev, ...newUnique]
      })

      const validCount = foundItems.filter((i) => !i.isDuplicate).length
      notifyFeature(
        'Сканирование завершено',
        `Найдено исполняемых файлов: ${foundItems.length} (доступно для добавления: ${validCount})`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла ошибка при сканировании папки'
      notifyError('Ошибка сканирования', msg)
    } finally {
      setIsScanning(false)
      setScanningProgress('')
    }
  }

  const handleUpdateCard = (id: string, updates: Partial<ScannedExecutableItem>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const handleRemoveCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  const handleSelectAll = (select: boolean) => {
    setCards((prev) =>
      prev.map((c) => (c.isDuplicate ? c : { ...c, selected: select }))
    )
  }

  // Valid selectable candidates (must be selected, not duplicate, and have valid title/exe)
  const validCandidates = useMemo(() => {
    return cards.filter((c) => c.selected && !c.isDuplicate && c.exePath.trim())
  }, [cards])

  const addableCount = validCandidates.length

  // Save all selected valid games
  const handleAddGames = async () => {
    if (addableCount === 0 || isSaving) return

    setIsSaving(true)
    try {
      const gamesToSave: Array<Omit<Game, 'id' | 'addedAt' | 'updatedAt'>> = validCandidates.map(
        (c) => ({
          title: c.title.trim() || 'Без названия',
          installPath: c.installPath?.trim() || undefined,
          launchCommand: c.exePath.trim(),
          launchArgs: [],
          launchType: 'executable',
          coverPath: c.coverPath?.trim() || undefined,
          genres: [],
          tags: [],
          sources: [
            {
              id: '',
              gameId: '',
              sourceType: 'executable',
              sourceId: c.exePath.trim(),
              sourceName: 'Executable',
              installPath: c.installPath?.trim() || undefined,
              launchCommand: c.exePath.trim(),
              launchArgs: [],
              isInstalled: true,
            },
          ],
          inRoulette: c.inRoulette,
          isInstalled: true,
          lastPlayedAt: undefined,
          playCount: 0,
          totalPlayTime: 0,
          userGenres: c.userGenres,
          userTags: c.userTags,
        })
      )

      const result = await window.electronAPI.batchAddGames(gamesToSave)
      await reload(true)

      if (result.added > 0) {
        notifyFeature(
          'Игры добавлены в библиотеку',
          `Успешно добавлено игр: ${result.added}${result.failed > 0 ? `, не удалось добавить: ${result.failed}` : ''}`
        )
      } else if (result.failed > 0) {
        notifyError(
          'Ошибка добавления',
          `Не удалось сохранить игры (${result.failed} ошибок)`
        )
      }

      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла непредвиденная ошибка при сохранении'
      notifyError('Ошибка сохранения', msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Добавить игры в библиотеку" onClose={onClose} width="740px">
      <div className={styles.modalContent}>
        {/* Pinned Top: File picker & Folder scan */}
        <div className={styles.topSection}>
          <div className={styles.filePickerRow}>
            <label className={styles.fieldLabel}>Выбор исполняемого файла (.exe):</label>
            <div className={styles.inputGroup}>
              <input
                type="text"
                className={styles.exeInput}
                placeholder="Путь к файлу .exe (или нажмите «Обзор…»)"
                value={manualExeInput}
                onChange={(e) => setManualExeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAddFromPath(manualExeInput)
                  }
                }}
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleBrowseExe}
                loading={isInspecting}
                type="button"
              >
                <FolderOpen size={15} />
                <span>Обзор…</span>
              </Button>
            </div>
          </div>

          <div className={styles.actionRow}>
            <div className={styles.scanBtnWrapper}>
              <Button
                variant="secondary"
                size="md"
                onClick={handleScanFolder}
                loading={isScanning}
                disabled={isScanning}
                type="button"
              >
                <FolderSearch size={15} />
                <span>Сканировать папку</span>
              </Button>

              {isScanning && (
                <div className={styles.scanningIndicator}>
                  <div className={styles.spinner} />
                  <span>{scanningProgress}</span>
                </div>
              )}
            </div>

            {cards.length > 0 && (
              <div className={styles.batchToggles}>
                <button
                  type="button"
                  className={styles.textBtn}
                  onClick={() => handleSelectAll(true)}
                >
                  Выбрать все
                </button>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>•</span>
                <button
                  type="button"
                  className={styles.textBtn}
                  onClick={() => handleSelectAll(false)}
                >
                  Снять все
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable list of game cards */}
        <div className={styles.listContainer}>
          {cards.length === 0 ? (
            <div className={styles.emptyState}>
              <FolderSearch size={42} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Список игр для добавления пуст</p>
              <p className={styles.emptySubtitle}>
                Выберите исполняемый файл через кнопку «Обзор…» или нажмите «Сканировать папку» для
                автоматического поиска всех установленных игр.
              </p>
            </div>
          ) : (
            cards.map((item) => (
              <AddGameCard
                key={item.id}
                item={item}
                availableGenres={availableGenres}
                availableTags={availableTags}
                onUpdate={(updates) => handleUpdateCard(item.id, updates)}
                onRemove={() => handleRemoveCard(item.id)}
              />
            ))
          )}
        </div>

        {/* Pinned Bottom action bar */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={styles.selectedCountText}>
              К добавлению:{' '}
              <span className={styles.selectedCountHighlight}>{addableCount}</span>{' '}
              {addableCount === 1 ? 'игра' : addableCount >= 2 && addableCount <= 4 ? 'игры' : 'игр'}
            </span>
            {cards.some((c) => c.isDuplicate) && (
              <span className={styles.footerSubText}>
                (дубликаты и невыбранные файлы будут пропущены)
              </span>
            )}
          </div>

          <div className={styles.footerButtons}>
            <Button variant="ghost" onClick={onClose} disabled={isSaving} type="button">
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleAddGames}
              disabled={addableCount === 0 || isSaving}
              loading={isSaving}
              type="button"
            >
              Добавить игры ({addableCount})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
