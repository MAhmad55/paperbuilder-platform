import { useTranslation } from 'react-i18next'
import { Checkbox } from './Checkbox'
import Bidi from '../utils/bidi'

export interface ChapterRowProps {
  checked: boolean
  name: string
  mcqCount: number
  shortCount: number
  longCount: number
  coverage: number  // 0-100
  onToggle: () => void
}

export function ChapterRow({ checked, name, mcqCount, shortCount, longCount, coverage, onToggle }: ChapterRowProps) {
  const { t } = useTranslation()
  const counts = t('copy.paper.chapterCounts', { mcq: mcqCount, short: shortCount, long: longCount })
  return (
    <div className={['pb-chapter-row', checked && 'pb-chapter-row--checked'].filter(Boolean).join(' ')}>
      <Checkbox
        checked={checked}
        onChange={onToggle}
        aria-label={t('copy.paper.selectChapter', { name })}
      />
      <span className="pb-chapter-row__name">{name}</span>
      <span className="pb-chapter-row__counts"><Bidi>{counts}</Bidi></span>
      <span className="pb-chapter-row__coverage" role="progressbar" aria-label={t('copy.paper.coverage', { coverage })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coverage}>
        <span className="pb-chapter-row__coverage-fill" style={{ width: `${coverage}%` }} />
      </span>
    </div>
  )
}

export default ChapterRow
