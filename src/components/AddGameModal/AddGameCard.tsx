import React, { useState, useRef, useEffect } from 'react'
import { ImageOff, Camera, Plus, X, Trash2 } from 'lucide-react'
import type { ScannedExecutableItem } from '../../types/electron'
import { resolveCoverUrl } from '../../utils/cover'
import styles from './AddGameCard.module.css'

interface AddGameCardProps {
  item: ScannedExecutableItem
  availableGenres: string[]
  availableTags: string[]
  onUpdate: (updates: Partial<ScannedExecutableItem>) => void
  onRemove: () => void
}

export const AddGameCard: React.FC<AddGameCardProps> = ({
  item,
  availableGenres,
  availableTags,
  onUpdate,
  onRemove,
}) => {
  const [imgError, setImgError] = useState(false)

  // Genre adder state
  const [isAddingGenre, setIsAddingGenre] = useState(false)
  const [genreInput, setGenreInput] = useState('')
  const genreInputRef = useRef<HTMLInputElement>(null)

  // Tag adder state
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAddingGenre) {
      genreInputRef.current?.focus()
    }
  }, [isAddingGenre])

  useEffect(() => {
    if (isAddingTag) {
      tagInputRef.current?.focus()
    }
  }, [isAddingTag])

  const handlePickCover = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const chosen = await window.electronAPI.openFilePicker({
        title: `Выбрать обложку для «${item.title}»`,
        filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      })
      if (chosen) {
        setImgError(false)
        onUpdate({ coverPath: chosen })
      }
    } catch {
      // Ignored
    }
  }

  const addGenre = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setIsAddingGenre(false)
      setGenreInput('')
      return
    }
    const exists = item.userGenres.some((g) => g.toLowerCase() === trimmed.toLowerCase())
    if (!exists) {
      onUpdate({ userGenres: [...item.userGenres, trimmed] })
    }
    setGenreInput('')
    setIsAddingGenre(false)
  }

  const removeGenre = (idx: number) => {
    onUpdate({ userGenres: item.userGenres.filter((_, i) => i !== idx) })
  }

  const addTag = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setIsAddingTag(false)
      setTagInput('')
      return
    }
    const exists = item.userTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())
    if (!exists) {
      onUpdate({ userTags: [...item.userTags, trimmed] })
    }
    setTagInput('')
    setIsAddingTag(false)
  }

  const removeTag = (idx: number) => {
    onUpdate({ userTags: item.userTags.filter((_, i) => i !== idx) })
  }

  const filteredGenreSuggestions = availableGenres
    .filter(
      (g) =>
        !item.userGenres.some((ug) => ug.toLowerCase() === g.toLowerCase()) &&
        g.toLowerCase().includes(genreInput.toLowerCase())
    )
    .slice(0, 6)

  const filteredTagSuggestions = availableTags
    .filter(
      (t) =>
        !item.userTags.some((ut) => ut.toLowerCase() === t.toLowerCase()) &&
        t.toLowerCase().includes(tagInput.toLowerCase())
    )
    .slice(0, 6)

  const coverUrl = item.coverPath ? resolveCoverUrl(item.coverPath) : null
  const showCover = Boolean(coverUrl && !imgError)

  const cardClasses = [
    styles.card,
    item.selected && !item.isDuplicate ? styles.cardSelected : '',
    item.isDuplicate ? styles.cardDuplicate : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClasses}>
      {/* Cover Left */}
      <div
        className={styles.coverWrapper}
        onClick={handlePickCover}
        title="Нажмите, чтобы выбрать обложку игры"
      >
        {showCover ? (
          <img
            src={coverUrl!}
            alt={item.title}
            className={styles.coverImg}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.placeholder}>
            <ImageOff size={20} />
          </div>
        )}
        <div className={styles.coverOverlay}>
          <Camera size={18} />
        </div>
      </div>

      {/* Middle info */}
      <div className={styles.info}>
        <div className={styles.titleRow}>
          <input
            type="text"
            className={styles.titleInput}
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Название игры"
            title="Нажмите для редактирования названия"
          />

          {item.isDuplicate && (
            <span
              className={styles.duplicateBadge}
              title={item.duplicateReason || 'Игра уже существует в библиотеке'}
            >
              {item.duplicateReason || 'Уже в библиотеке'}
            </span>
          )}
        </div>

        {/* Genres row */}
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Жанры:</span>
          {item.userGenres.map((g, idx) => (
            <span key={`${g}-${idx}`} className={styles.pillGenre}>
              <span>{g}</span>
              <button
                type="button"
                className={styles.pillDeleteBtn}
                onClick={() => removeGenre(idx)}
                title="Удалить жанр"
              >
                <X size={10} />
              </button>
            </span>
          ))}

          {isAddingGenre ? (
            <div className={styles.quickAddBox}>
              <input
                ref={genreInputRef}
                type="text"
                className={styles.quickInput}
                value={genreInput}
                placeholder="Жанр..."
                onChange={(e) => setGenreInput(e.target.value)}
                onBlur={() => {
                  setTimeout(() => addGenre(genreInput), 180)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addGenre(genreInput)
                  } else if (e.key === 'Escape') {
                    setIsAddingGenre(false)
                  }
                }}
              />
              {filteredGenreSuggestions.length > 0 && (
                <ul className={styles.quickDropdown}>
                  {filteredGenreSuggestions.map((sug) => (
                    <li
                      key={sug}
                      className={styles.quickDropdownItem}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addGenre(sug)
                      }}
                    >
                      {sug}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={styles.addPillBtn}
              onClick={() => setIsAddingGenre(true)}
            >
              <Plus size={11} />
              <span>Жанр</span>
            </button>
          )}
        </div>

        {/* Tags row */}
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Теги:</span>
          {item.userTags.map((t, idx) => (
            <span key={`${t}-${idx}`} className={styles.pillTag}>
              <span>{t}</span>
              <button
                type="button"
                className={styles.pillDeleteBtn}
                onClick={() => removeTag(idx)}
                title="Удалить тег"
              >
                <X size={10} />
              </button>
            </span>
          ))}

          {isAddingTag ? (
            <div className={styles.quickAddBox}>
              <input
                ref={tagInputRef}
                type="text"
                className={styles.quickInput}
                value={tagInput}
                placeholder="Тег..."
                onChange={(e) => setTagInput(e.target.value)}
                onBlur={() => {
                  setTimeout(() => addTag(tagInput), 180)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag(tagInput)
                  } else if (e.key === 'Escape') {
                    setIsAddingTag(false)
                  }
                }}
              />
              {filteredTagSuggestions.length > 0 && (
                <ul className={styles.quickDropdown}>
                  {filteredTagSuggestions.map((sug) => (
                    <li
                      key={sug}
                      className={styles.quickDropdownItem}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addTag(sug)
                      }}
                    >
                      {sug}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={styles.addPillBtn}
              onClick={() => setIsAddingTag(true)}
            >
              <Plus size={11} />
              <span>Тег</span>
            </button>
          )}
        </div>

        {/* Path row */}
        <div className={styles.pathRow}>
          <span className={styles.pathText} title={item.exePath}>
            {item.exePath}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className={styles.rightControls}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={item.selected && !item.isDuplicate}
          disabled={item.isDuplicate}
          onChange={(e) => onUpdate({ selected: e.target.checked })}
          title={
            item.isDuplicate
              ? 'Игра уже в библиотеке'
              : item.selected
              ? 'Снять отметку'
              : 'Отметить для добавления'
          }
        />
        <button
          type="button"
          className={styles.removeCardBtn}
          onClick={onRemove}
          title="Убрать из списка добавления"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
