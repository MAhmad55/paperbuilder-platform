import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { FileUp, Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Bidi from '../utils/bidi'

export interface FileUploadProps {
  files: File[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  accept?: string
  multiple?: boolean
  error?: string | null
  helper?: string
  disabled?: boolean
  title?: string
  hint?: string
  removeFileLabel?: string
}

export function FileUpload({
  files, onAdd, onRemove, accept, multiple = true, error, helper, disabled, title, hint, removeFileLabel,
}: FileUploadProps) {
  const { t } = useTranslation()
  const resolvedRemoveLabel = removeFileLabel ?? t('common.removeFile')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (list: FileList | null) => {
    if (!list?.length) return
    const arr = Array.from(list)
    if (multiple) onAdd(arr)
    else onAdd(arr.slice(0, 1))
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div>
      <div
        className={['pb-file-upload', dragging && 'pb-file-upload--dragging', error && 'pb-file-upload--error'].filter(Boolean).join(' ')}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={title}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        <div className="pb-file-upload__icon"><FileUp size={22} aria-hidden="true" /></div>
        <div className="pb-file-upload__title">{title ?? t('common.uploadFiles')}</div>
        {hint && <div className="pb-file-upload__hint">{hint}</div>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          disabled={disabled}
          onChange={onChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      {helper && !error && <p className="pb-helper" style={{ marginTop: 8 }}>{helper}</p>}
      {error && <p className="pb-error-text" role="alert" style={{ marginTop: 8 }}>{error}</p>}
      {files.length > 0 && (
        <ul className="pb-file-list" aria-label={t('common.selectedFiles')}>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="pb-file-list__item">
              <Paperclip size={15} aria-hidden="true" />
              <span className="pb-file-list__name" title={f.name}>{f.name}</span>
              <span className="pb-muted" style={{ fontSize: 12, flexShrink: 0 }}>
                <Bidi>{t('copy.fileSize', { count: Math.max(1, Math.round(f.size / 1024)) })}</Bidi>
              </span>
              <button
                type="button"
                className="pb-icon-btn pb-icon-btn--sm"
                aria-label={`${resolvedRemoveLabel} — ${f.name}`}
                onClick={() => onRemove(i)}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FileUpload
