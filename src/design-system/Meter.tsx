import { useTranslation } from 'react-i18next'
import Bidi from '../utils/bidi'

export type MeterState = 'under' | 'near' | 'met' | 'over'

export interface MeterProps {
  target: number
  current: number
  label?: string
  className?: string
}

export function getMeterState(target: number, current: number): MeterState {
  if (target <= 0) return 'under'
  const ratio = current / target
  if (ratio < 0.8) return 'under'
  if (ratio < 1) return 'near'
  if (ratio === 1) return 'met'
  return 'over'
}

export function Meter({ target, current, label, className }: MeterProps) {
  const { t } = useTranslation()
  const state = getMeterState(target, current)
  const safeTarget = target > 0 ? target : 1
  const ratio = Math.min(1, Math.abs(current) / safeTarget)

  return (
    <div
      className={['pb-meter', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label ?? t('common.marks')}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={Math.min(current, target)}
      aria-valuetext={`${current} / ${target}`}
    >
      <div className="pb-meter__head">
        <span className="pb-meter__label">{label ?? t('common.marks')}</span>
        <span className="pb-meter__value"><Bidi>{`${current} / ${target}`}</Bidi></span>
      </div>
      <div className="pb-meter__track">
        <div className={`pb-meter__fill pb-meter__fill--${state}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className={`pb-meter__status pb-meter__status--${state}`} aria-hidden="false">
        {t(`meter.${state}`)}
      </span>
    </div>
  )
}

export default Meter
