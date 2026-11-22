import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, IconButton, Badge, Card, type ButtonProps } from '../design-system'
import { Demo, type StateKey } from './Demo'
import { Search, Plus, ArrowRight } from 'lucide-react'

export function ButtonsDemo() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<string | null>(null)

  const demoBtn = (state: StateKey, props?: ButtonProps) => {
    const loadingViz = state === 'loading'
    return (
      <Button
        variant={props?.variant}
        size={props?.size}
        loading={loadingViz || loading !== null}
        disabled={state === 'disabled'}
        data-force={state === 'loading' ? undefined : state}
        {...props}
        onClick={e => {
          props?.onClick?.(e)
          if (state !== 'disabled' && state !== 'loading') {
            setLoading('btn')
            window.setTimeout(() => setLoading(null), 2200)
          }
        }}
      >
        {t('copy.buttons.continue')}
      </Button>
    )
  }

  return (
    <>
      <Demo
        id="button-primary"
        title={t('copy.buttons.titlePrimary')}
        note={t('copy.buttons.notePrimary')}
        states={['default', 'hover', 'focus', 'active', 'disabled', 'loading']}
        render={state => demoBtn(state, { variant: 'primary' })}
      />
      <Demo
        id="button-secondary"
        title={t('copy.buttons.titleSecondary')}
        states={['default', 'hover', 'active', 'disabled']}
        render={state => (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="secondary" data-force={state === 'loading' ? undefined : state} disabled={state === 'disabled'}>{t('copy.buttons.save')}</Button>
            <Button variant="ghost" data-force={state === 'loading' ? undefined : state} disabled={state === 'disabled'}>{t('copy.buttons.cancel')}</Button>
            <Button variant="destructive" data-force={state === 'loading' ? undefined : state} disabled={state === 'disabled'}>{t('copy.buttons.delete')}</Button>
          </div>
        )}
      />
      <Demo
        id="button-lg"
        title={t('copy.buttons.titleLarge')}
        states={['default', 'hover', 'loading']}
        render={state => (
          <Button variant="primary" size="lg" loading={state === 'loading'} disabled={state === 'disabled'}>
            {t('copy.buttons.submitForApproval')}
          </Button>
        )}
      />
      <Demo
        id="icon-button"
        title={t('copy.buttons.titleIcon')}
        note={t('copy.buttons.noteIcon')}
        states={['default', 'hover', 'focus', 'active', 'disabled']}
        render={state => (
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton icon={<Search size={18} />} label={t('copy.buttons.iconSearch')} data-force={state} disabled={state === 'disabled'} />
            <IconButton icon={<Plus size={18} />} label={t('copy.buttons.iconAdd')} variant="bordered" data-force={state} disabled={state === 'disabled'} />
            <IconButton icon={<ArrowRight size={18} />} label={t('copy.buttons.iconNext')} variant="danger" data-force={state} disabled={state === 'disabled'} />
          </div>
        )}
      />
      <Demo
        id="badge"
        title={t('copy.buttons.titleBadge')}
        states={['default']}
        render={() => (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge>3</Badge><Badge tone="ink">5</Badge><Badge tone="pen">!</Badge><Badge tone="mark">7</Badge>
          </div>
        )}
      />
      <Demo
        id="card"
        title={t('copy.buttons.titleCard')}
        note={t('copy.buttons.noteCard')}
        states={['default', 'hover']}
        render={state => (
          <Card hoverable data-force={state === 'hover' ? 'hoverable' : undefined}>
            <div className="pb-card__title" style={{ marginBottom: 6 }}>Beacon Model School</div>
            <p className="pb-card__body">{t('copy.buttons.cardBody')}</p>
          </Card>
        )}
      />
    </>
  )
}

export default ButtonsDemo
