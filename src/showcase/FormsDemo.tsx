import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Textarea, Select, Combobox, DatePicker, FileUpload } from '../design-system'
import { Demo, type StateKey } from './Demo'
import { FileText } from 'lucide-react'

export function FormsDemo() {
  const { t } = useTranslation()
  const [comboValue, setComboValue] = useState<string | null>(null)
  const [date, setDate] = useState('2026-12-15')
  const [files, setFiles] = useState<File[]>([])

  const selectOptions = [
    { value: 'math', label: t('copy.forms.selectOptionMathematics') },
    { value: 'english', label: t('copy.forms.selectOptionEnglish') },
    { value: 'urdu', label: t('copy.forms.selectOptionUrdu') },
    { value: 'science', label: t('copy.forms.selectOptionScience') },
    { value: 'physics', label: t('copy.forms.selectOptionPhysics') },
  ]

  return (
    <>
      <Demo
        id="input"
        title={t('copy.forms.titleInput')}
        states={['default', 'hover', 'focus', 'disabled', 'error']}
        render={state => (
          <Input
            size="md"
            label={t('copy.forms.inputLabel')}
            placeholder={t('copy.forms.inputPlaceholder')}
            leadingIcon={<FileText size={15} />}
            helper={t('copy.forms.inputHelper')}
            error={state === 'error' ? t('copy.forms.inputError') : null}
            defaultValue={state !== 'error' ? t('copy.forms.inputPlaceholder') : undefined}
            disabled={state === 'disabled'}
            data-force={state === 'default' || state === 'disabled' || state === 'error' ? undefined : state}
          />
        )}
      />
      <Demo
        id="textarea"
        title={t('copy.forms.titleTextarea')}
        states={['default', 'focus', 'disabled', 'error']}
        render={state => (
          <Textarea
            label={t('copy.forms.textareaLabel')}
            placeholder={t('copy.forms.textareaPlaceholder')}
            helper={t('copy.forms.textareaHelper')}
            error={state === 'error' ? t('copy.forms.textareaError') : null}
            disabled={state === 'disabled'}
            data-force={state === 'disabled' || state === 'error' ? undefined : state}
          />
        )}
      />
      <Demo
        id="select"
        title={t('copy.forms.titleSelect')}
        states={['default', 'hover', 'focus', 'disabled', 'error']}
        render={state => (
          <Select
            label={t('copy.forms.selectLabel')}
            options={selectOptions}
            error={state === 'error' ? t('copy.forms.selectError') : null}
            disabled={state === 'disabled'}
            data-force={state === 'default' || state === 'disabled' || state === 'error' ? undefined : state}
          />
        )}
      />
      <Demo
        id="combobox"
        title={t('copy.forms.titleCombobox')}
        note={t('copy.forms.noteCombobox')}
        states={['default', 'disabled']}
        render={state => (
          <Combobox
            options={[
              { value: 'k1', label: t('copy.forms.comboboxOptionOne'), hint: t('copy.forms.comboboxHintPrimary') },
              { value: 'k5', label: t('copy.forms.comboboxOptionFive'), hint: t('copy.forms.comboboxHintPrimary') },
              { value: 'k9', label: t('copy.forms.comboboxOptionNine'), hint: t('copy.forms.comboboxHintMiddle') },
              { value: 'k12', label: t('copy.forms.comboboxOptionTwelve'), hint: t('copy.forms.comboboxHintBoard') },
            ]}
            value={comboValue}
            onChange={setComboValue}
            placeholder={t('copy.forms.comboboxPlaceholder')}
            label={t('copy.forms.comboboxLabel')}
            disabled={state === 'disabled'}
          />
        )}
      />
      <Demo
        id="datepicker"
        title={t('copy.forms.titleDatepicker')}
        states={['default', 'disabled', 'error']}
        render={state => (
          <DatePicker
            label={t('copy.forms.dateLabel')}
            value={date}
            onChange={setDate}
            disabled={state === 'disabled'}
            error={state === 'error' ? t('copy.forms.dateError') : null}
          />
        )}
      />
      <Demo
        id="file-upload"
        title={t('copy.forms.titleFileUpload')}
        note={t('copy.forms.noteFileUpload')}
        states={['default', 'error']}
        render={state => (
          <FileUpload
            files={state === 'error' ? [new File([''], 'photo of paper.png', { type: 'image/png' })] : files}
            onAdd={f => setFiles(v => [...v, ...f])}
            onRemove={idx => setFiles(v => v.filter((_, i) => i !== idx))}
            error={state === 'error' ? t('copy.forms.fileError') : null}
            title={t('copy.forms.fileTitle')}
            hint={t('copy.forms.fileHint')}
          />
        )}
      />
    </>
  )
}

export default FormsDemo
