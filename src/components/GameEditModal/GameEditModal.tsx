import React, { useState, useEffect } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import type { Game } from '../../types/electron'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TagInput } from '../ui/TagInput'
import styles from './GameEditModal.module.css'

interface GameEditModalProps {
  game: Game
  onSave: (updates: Partial<Game>) => void
  onDelete?: (gameId: string) => void
  onClose: () => void
}

export const GameEditModal: React.FC<GameEditModalProps> = ({
  game,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState(game.title)
  const [userGenres, setUserGenres] = useState<string[]>(game.userGenres || [])
  const [userTags, setUserTags] = useState<string[]>(game.userTags || [])
  const [inRoulette, setInRoulette] = useState(game.inRoulette)
  const [coverPath, setCoverPath] = useState(game.coverPath ?? '')
  const [launchCommand, setLaunchCommand] = useState(game.launchCommand ?? '')

  // Available suggestions for autocomplete
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Confirmation state for deleting game
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    window.electronAPI.getAllGenres()
      .then(setAvailableGenres)
      .catch(() => {})
    window.electronAPI.getAllTags()
      .then(setAvailableTags)
      .catch(() => {})
  }, [])

  const handlePickCover = async () => {
    const result = await window.electronAPI.openFilePicker({
      title: 'Выбрать обложку',
      filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    })
    if (result) setCoverPath(result)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      title: title.trim() || game.title,
      userGenres,
      userTags,
      inRoulette,
      coverPath: coverPath.trim() || undefined,
      launchCommand: launchCommand.trim() || undefined,
    })
  }

  const handleDeleteConfirmed = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(game.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal title="Редактировать игру" onClose={onClose} width="520px">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Название</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название игры"
            type="text"
            required
          />
        </div>

        {/* Жанры с выпадающим списком и чипами */}
        <TagInput
          label="Пользовательские жанры"
          placeholder="Введите жанр или выберите из списка..."
          value={userGenres}
          onChange={setUserGenres}
          suggestions={availableGenres}
        />

        {game.genres.length > 0 && (
          <div className={styles.autoNote}>
            <span className={styles.autoNoteLabel}>Автоматические жанры:</span>{' '}
            {game.genres.join(', ')}
          </div>
        )}

        {/* Теги с выпадающим списком и чипами */}
        <TagInput
          label="Пользовательские теги"
          placeholder="Введите тег или выберите из списка..."
          value={userTags}
          onChange={setUserTags}
          suggestions={availableTags}
        />

        {game.tags.length > 0 && (
          <div className={styles.autoNote}>
            <span className={styles.autoNoteLabel}>Автоматические теги:</span>{' '}
            {game.tags.slice(0, 10).join(', ')}{game.tags.length > 10 ? '...' : ''}
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Обложка</label>
          <div className={styles.fileRow}>
            <input
              className={styles.input}
              value={coverPath}
              onChange={(e) => setCoverPath(e.target.value)}
              placeholder="Путь к файлу обложки"
              type="text"
            />
            <Button variant="secondary" size="sm" onClick={handlePickCover} type="button">
              Обзор
            </Button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Команда запуска / путь к файлу</label>
          <input
            className={styles.input}
            value={launchCommand}
            onChange={(e) => setLaunchCommand(e.target.value)}
            placeholder="C:\Games\game.exe или steam://rungameid/..."
            type="text"
          />
        </div>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={inRoulette}
            onChange={(e) => setInRoulette(e.target.checked)}
          />
          <span className={styles.checkLabel}>Участвует в рулетке</span>
        </label>

        {/* Блок подтверждения удаления */}
        {isConfirmingDelete ? (
          <div className={styles.deleteConfirmBox}>
            <div className={styles.deleteWarningHeader}>
              <AlertTriangle size={18} className={styles.deleteIcon} />
              <span className={styles.deleteWarningTitle}>Удалить игру из библиотеки?</span>
            </div>
            <p className={styles.deleteWarningText}>
              Игра «<strong>{game.title}</strong>» будет удалена из библиотеки. Связанные кэшированные обложки и настройки будут очищены. История выбора останется в статистике.
            </p>
            <div className={styles.deleteActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
                type="button"
                disabled={isDeleting}
              >
                Отмена
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirmed}
                type="button"
                loading={isDeleting}
              >
                Да, удалить
              </Button>
            </div>
          </div>
        ) : null}

        <div className={styles.footer}>
          {onDelete && !isConfirmingDelete && (
            <Button
              variant="danger"
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
            >
              <Trash2 size={15} />
              <span>Удалить</span>
            </Button>
          )}

          <div className={styles.footerRight}>
            <Button variant="ghost" onClick={onClose} type="button" disabled={isDeleting}>
              Отмена
            </Button>
            <Button variant="primary" type="submit" disabled={isDeleting}>
              Сохранить
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
