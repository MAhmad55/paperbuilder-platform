import { useTranslation } from 'react-i18next'
import { Lock, LockOpen, ArrowLeftRight, Trash2 } from 'lucide-react'
import { Badge } from './Badge'
import { IconButton } from './IconButton'
import Bidi from '../utils/bidi'

export type QuestionType = 'mcq' | 'short' | 'long'

export interface QuestionRowProps {
  type: QuestionType
  chapter?: string
  marks: number
  text: string
  locked?: boolean
  onToggleLock?: () => void
  onSwap?: () => void
  onRemove?: () => void
  showActions?: boolean
}

const TYPE_KEY: Record<QuestionType, string> = {
  mcq: 'copy.paper.optionMcq',
  short: 'copy.paper.optionShort',
  long: 'copy.paper.optionLong',
}

export function QuestionRow({
  type,
  chapter,
  marks,
  text,
  locked,
  onToggleLock,
  onSwap,
  onRemove,
  showActions = true,
}: QuestionRowProps) {
  const { t } = useTranslation()
  const typeLabel = t(TYPE_KEY[type])
  return (
    <div className={['pb-question-row', locked && 'pb-question-row--locked'].filter(Boolean).join(' ')}>
      <div className="pb-question-row__preview">
        <p className="pb-question-row__text">{text}</p>
        <div className="pb-question-row__meta">
          <Badge tone={type === 'mcq' ? 'ink' : type === 'short' ? 'neutral' : 'mark'}>{typeLabel}</Badge>
          {chapter && <span className="pb-muted" style={{ fontSize: 'var(--text-xs)' }}>{chapter}</span>}
        </div>
      </div>
      <div className="pb-question-row__marks"><Bidi>{marks}m</Bidi></div>
      {showActions && (
        <div className="pb-question-row__actions">
          {onToggleLock && (
            <IconButton
              size="sm"
              icon={locked ? <LockOpen size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
              label={locked ? t('copy.paper.questionUnlock') : t('copy.paper.questionLock')}
              onClick={onToggleLock}
            />
          )}
          {onSwap && (
            <IconButton size="sm" icon={<ArrowLeftRight size={16} className="flip-rtl" aria-hidden="true" />} label={t('copy.paper.questionSwap')} onClick={onSwap} />
          )}
          {onRemove && (
            <IconButton size="sm" variant="danger" icon={<Trash2 size={16} aria-hidden="true" />} label={t('copy.paper.questionRemove')} onClick={onRemove} />
          )}
        </div>
      )}
    </div>
  )
}

export default QuestionRow
