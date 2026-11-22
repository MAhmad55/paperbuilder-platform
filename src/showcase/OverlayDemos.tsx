import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Drawer, BottomSheet, Menu, Tooltip, useToast, Badge } from '../design-system'
import { Demo, type StateKey } from './Demo'
import { Button } from '../design-system'
import type { MenuEntry } from '../design-system/Menu'
import { Bell, Settings, LogOut, History } from 'lucide-react'
import Bidi from '../utils/bidi'

export function OverlayDemos() {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { toast } = useToast()

  const menuItems: MenuEntry[] = [
    { id: 'profile', label: t('shell.profile'), icon: <Bell size={16} />, onSelect: () => toast({ variant: 'info', title: t('copy.overlays.menuMockedTitle'), message: t('copy.overlays.menuProfileMsg') }) },
    { id: 'settings', label: t('shell.settings'), icon: <Settings size={16} />, onSelect: () => toast({ variant: 'info', title: t('copy.overlays.menuMockedTitle'), message: t('copy.overlays.menuSettingsMsg') }) },
    { id: 'history', label: t('shell.history'), icon: <History size={16} />, onSelect: () => toast({ variant: 'info', title: t('copy.overlays.menuMockedTitle'), message: t('copy.overlays.menuHistoryMsg') }) },
    { id: 'sep', divider: true },
    { id: 'logout', label: t('shell.signOut'), icon: <LogOut size={16} />, danger: true, onSelect: () => toast({ variant: 'warning', title: t('copy.overlays.menuMockedTitle'), message: t('copy.overlays.menuSignOutMsg') }) },
  ]

  return (
    <>
      <Demo
        id="dialog"
        title={t('copy.overlays.titleDialog')}
        note={t('copy.overlays.noteDialog')}
        states={['default']}
        render={() => (
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>{t('copy.overlays.openDialog')}</Button>
            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title={t('copy.overlays.dialogTitle')}
              footer={
                <>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button variant="destructive" onClick={() => { setDialogOpen(false); toast({ variant: 'success', title: t('status.changesRequested'), message: t('copy.overlays.dialogToastMsg') }) }}>{t('copy.overlays.dialogRequest')}</Button>
                </>
              }
            >
              <p style={{ margin: 0 }}>
                {t('copy.overlays.dialogBodyPrefix')} <Bidi>Trigonometry</Bidi>
                {t('copy.overlays.dialogBodySuffix')}
              </p>
            </Dialog>
          </>
        )}
      />
      <Demo
        id="drawer"
        title={t('copy.overlays.titleDrawer')}
        note={t('copy.overlays.noteDrawer')}
        states={['default']}
        render={() => (
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>{t('copy.overlays.drawerOpen')}</Button>
            <Drawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              title={t('copy.overlays.drawerTitle')}
              footer={<Button variant="primary" onClick={() => setDrawerOpen(false)}>{t('copy.overlays.drawerApply')}</Button>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><b>{t('copy.overlays.drawerStatus')}</b><p className="pb-muted">{t('copy.overlays.drawerStatusValue')}</p></div>
                <div><b>{t('copy.overlays.drawerClass')}</b><p className="pb-muted">{t('copy.overlays.drawerClassValue')}</p></div>
                <div><b>{t('copy.overlays.drawerPlan')}</b><p className="pb-muted">{t('copy.overlays.drawerPlanValue')}</p></div>
              </div>
            </Drawer>
          </>
        )}
      />
      <Demo
        id="bottom-sheet"
        title={t('copy.overlays.titleBottomSheet')}
        note={t('copy.overlays.noteBottomSheet')}
        states={['default']}
        render={() => (
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>{t('copy.overlays.bottomSheetOpen')}</Button>
            <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t('copy.overlays.bottomSheetTitle')}>
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>{t('copy.overlays.bottomSheetBody')}</p>
            </BottomSheet>
          </>
        )}
      />
      <Demo
        id="menu"
        title={t('copy.overlays.titleMenu')}
        note={t('copy.overlays.noteMenu')}
        states={['default']}
        render={() => (
          <Menu
            ariaLabel={t('copy.overlays.menuAria')}
            trigger={() => <Button variant="secondary">{t('copy.overlays.menuOpen')}</Button>}
            items={menuItems}
          />
        )}
      />
      <Demo
        id="tooltip"
        title={t('copy.overlays.titleTooltip')}
        states={['default', 'hover', 'focus']}
        render={state => (
          <Tooltip text={t('copy.overlays.tooltipText')} placement="top" data-force={state === 'default' ? undefined : state}>
            <button
              type="button"
              className="pb-icon-btn pb-icon-btn--bordered"
              style={{ cursor: 'help' }}
              aria-label={t('copy.overlays.tooltipText')}
            >
              ?
            </button>
          </Tooltip>
        )}
      />
      <Demo
        id="toast"
        title={t('copy.overlays.titleToast')}
        note={t('copy.overlays.noteToast')}
        states={['default']}
        render={() => (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => toast({ variant: 'success', title: t('copy.overlays.toastSuccessTitle'), message: t('copy.overlays.toastSuccessMsg') })}>{t('copy.overlays.toastSuccessBtn')}</Button>
            <Button variant="secondary" onClick={() => toast({ variant: 'error', title: t('copy.overlays.toastErrorTitle'), message: t('copy.overlays.toastErrorMsg') })}>{t('copy.overlays.toastErrorBtn')}</Button>
            <Button variant="secondary" onClick={() => toast({ variant: 'warning', title: t('copy.overlays.toastWarningTitle'), message: t('copy.overlays.toastWarningMsg') })}>{t('copy.overlays.toastWarningBtn')}</Button>
            <Button variant="secondary" onClick={() => toast({ variant: 'info', title: t('copy.overlays.toastInfoTitle'), message: t('copy.overlays.toastInfoMsg') })}>{t('copy.overlays.toastInfoBtn')}</Button>
          </div>
        )}
      />
    </>
  )
}

export default OverlayDemos
