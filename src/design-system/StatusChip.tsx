import { useTranslation } from 'react-i18next'
import {
  CheckCircle2, Clock, Eye, FileText, Archive, RotateCcw, Printer,
  PauseCircle, XCircle, type LucideIcon,
} from 'lucide-react'

export type ChipStatus =
  | 'draft' | 'submitted' | 'in-review' | 'approved' | 'changes-requested' | 'printed' | 'archived'
  | 'pending' | 'active' | 'suspended' | 'rejected'

/** Maps the hyphenated chip status to the i18n key suffix (status.${key}). */
const KEY_BY_STATUS: Record<ChipStatus, string> = {
  draft: 'draft',
  submitted: 'submitted',
  'in-review': 'inReview',
  approved: 'approved',
  'changes-requested': 'changesRequested',
  printed: 'printed',
  archived: 'archived',
  pending: 'pending',
  active: 'active',
  suspended: 'suspended',
  rejected: 'rejected',
}

const STATUS_ICONS: Record<ChipStatus, LucideIcon> = {
  draft: FileText,
  submitted: FileText,
  'in-review': Eye,
  approved: CheckCircle2,
  'changes-requested': RotateCcw,
  printed: Printer,
  archived: Archive,
  pending: Clock,
  active: CheckCircle2,
  suspended: PauseCircle,
  rejected: XCircle,
}

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ChipStatus
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function StatusChip({ status, label, className, size, ...rest }: StatusChipProps) {
  const { t } = useTranslation()
  const Icon = STATUS_ICONS[status] ?? FileText
  return (
    <span className={['pb-chip', `pb-chip--${status}`, className].filter(Boolean).join(' ')} role="status" {...rest}>
      <Icon size={13} aria-hidden="true" />
      <span>{label ?? t(`status.${KEY_BY_STATUS[status] ?? status}`)}</span>
    </span>
  )
}

export default StatusChip
