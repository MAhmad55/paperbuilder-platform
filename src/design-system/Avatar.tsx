import { useTranslation } from 'react-i18next'
import Bidi from '../utils/bidi'

export type AvatarStatus = 'active' | 'invited' | 'inactive'

export interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  status?: AvatarStatus
  className?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  const { t } = useTranslation()
  const sizeClass = `pb-avatar--${size}`
  return (
    <span className={['pb-avatar', sizeClass, className].filter(Boolean).join(' ')} title={name}>
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <span aria-hidden="true"><Bidi>{initials(name)}</Bidi></span>
      )}
      <span className="sr-only">{name}</span>
      {status && (
        <span
          className={['pb-avatar__status', status === 'invited' && 'pb-avatar__status--invited', status === 'inactive' && 'pb-avatar__status--inactive'].filter(Boolean).join(' ')}
          role="img"
          aria-label={status === 'active' ? t('status.active') : status === 'invited' ? t('copy.avatarStatusInvited') : t('copy.avatarStatusInactive')}
        />
      )}
    </span>
  )
}

export default Avatar
