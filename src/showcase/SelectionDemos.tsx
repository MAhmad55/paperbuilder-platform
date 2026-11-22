import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Radio, Switch, SegmentedControl, Tabs } from '../design-system'
import { Demo, type StateKey } from './Demo'

export function SelectionDemos() {
  const { t } = useTranslation()
  const [checked, setChecked] = useState(true)
  const [radio, setRadio] = useState('a')
  const [switchOn, setSwitchOn] = useState(true)
  const [segmented, setSegmented] = useState('en')
  const [tabs, setTabs] = useState('overview')

  return (
    <>
      <Demo
        id="checkbox"
        title={t('copy.selection.titleCheckbox')}
        states={['default', 'focus', 'disabled']}
        render={(state: StateKey) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Checkbox
              label={t('copy.selection.checkIncludeKey')}
              checked={state === 'disabled' ? true : checked}
              disabled={state === 'disabled'}
              onChange={() => setChecked(c => !c)}
              data-force={state === 'focus' ? 'focus' : undefined}
            />
            <Checkbox
              label={t('copy.selection.checkIndeterminate')}
              checked={false}
              indeterminate={state === 'default'}
              onChange={() => {}}
              aria-label={t('copy.selection.checkIndeterminate')}
            />
          </div>
        )}
      />
      <Demo
        id="radio"
        title={t('copy.selection.titleRadio')}
        states={['default', 'focus', 'disabled']}
        render={state => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Radio name="exam-type" label={t('examType.monthly')} value="a" checked={radio === 'a'} onChange={() => setRadio('a')} data-force={state === 'focus' ? 'focus' : undefined} />
            <Radio name="exam-type" label={t('examType.midterm')} value="b" checked={radio === 'b'} onChange={() => setRadio('b')} disabled={state === 'disabled'} />
            <Radio name="exam-type" label={t('examType.boardPattern')} value="c" checked={radio === 'c'} onChange={() => setRadio('c')} />
          </div>
        )}
      />
      <Demo
        id="switch"
        title={t('copy.selection.titleSwitch')}
        states={['default', 'focus', 'disabled']}
        render={state => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Switch checked={state === 'disabled' ? true : switchOn} onChange={setSwitchOn} label={t('copy.selection.switchPrintKey')} description={t('copy.selection.switchPrintKeyDesc')} disabled={state === 'disabled'} />
            <Switch checked={true} onChange={setSwitchOn} label={t('copy.selection.switchRoll')} description={t('copy.selection.switchRollDesc')} disabled={state === 'disabled'} />
          </div>
        )}
      />
      <Demo
        id="segmented"
        title={t('copy.selection.titleSegmented')}
        note={t('copy.selection.noteSegmented')}
        states={['default', 'disabled']}
        render={state => (
          <SegmentedControl
            ariaLabel={t('copy.selection.segmentedAria')}
            options={[
              { value: 'en', label: t('copy.selection.segmentedOptionEnglish') },
              { value: 'ur', label: t('copy.selection.segmentedOptionUrdu') },
              { value: 'both', label: t('copy.selection.segmentedOptionBoth') },
            ]}
            value={segmented}
            onChange={setSegmented}
            disabled={state === 'disabled'}
          />
        )}
      />
      <Demo
        id="tabs"
        title={t('copy.selection.titleTabs')}
        states={['default']}
        render={() => (
          <Tabs
            ariaLabel={t('copy.selection.tabsAria')}
            tabs={[
              { value: 'overview', label: t('copy.selection.tabsOverview') },
              { value: 'questions', label: t('copy.selection.tabsQuestions') },
              { value: 'answer-key', label: t('copy.selection.tabsAnswerKey') },
              { value: 'history', label: t('copy.selection.tabsHistory') },
            ]}
            value={tabs}
            onChange={setTabs}
          />
        )}
      />
    </>
  )
}

export default SelectionDemos
