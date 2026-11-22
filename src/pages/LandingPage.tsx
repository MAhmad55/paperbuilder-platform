import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { ArrowDown, Check, History, KeyRound, Languages, ShieldCheck, type LucideIcon } from 'lucide-react'
import { PublicLayout } from '../features/public/PublicLayout'
import {
  Avatar, Badge, Button, Card, Meter, PaperSheet, SegmentedControl, StatusChip,
  type ChipStatus,
} from '../design-system'
import { Accordion, type AccordionItem } from '../design-system/Accordion'
import { SamplePaperContent } from '../showcase/SamplePaper'
import { Bidi } from '../utils/bidi'
import { formatDate } from '../utils/date'
import '../styles/landing.css'

type PaperMode = 'en' | 'ur'

/**
 * Sample paper copy. This is the paper's own content (like
 * SamplePaperContent), not interface copy, so both languages are kept
 * here and the preview can show either one regardless of the UI language.
 */
interface SamplePaperCopy {
  school: string
  initials: string
  title: string
  subtitle: string
  subject: string
  medium: string
  metaClass: string
  metaSubject: string
  metaDate: string
  metaMedium: string
  instruction: string
}

const SAMPLE_PAPER: Record<PaperMode, SamplePaperCopy> = {
  en: {
    school: 'Beacon Model School',
    initials: 'BM',
    title: 'Mathematics — Midterm',
    subtitle: 'Class 9 · First Term',
    subject: 'Mathematics',
    medium: 'English',
    metaClass: 'Class',
    metaSubject: 'Subject',
    metaDate: 'Date',
    metaMedium: 'Medium',
    instruction: 'Answer all questions. Marks are shown in brackets.',
  },
  ur: {
    school: 'بیکن ماڈل اسکول',
    initials: 'ب',
    title: 'ریاضی — میڈ ٹرم',
    subtitle: 'جماعت 9 · پہلی ترم',
    subject: 'ریاضی',
    medium: 'اردو',
    metaClass: 'جماعت',
    metaSubject: 'مضمون',
    metaDate: 'تاریخ',
    metaMedium: 'زبان',
    instruction: 'تمام سوالات کے جوابات دیں۔ مارک بریکٹس میں لکھے ہیں۔',
  },
}

function SamplePaperSheet({ mode }: { mode: PaperMode }) {
  const c = SAMPLE_PAPER[mode]
  return (
    <PaperSheet
      mode={mode}
      schoolName={c.school}
      schoolInitials={c.initials}
      title={c.title}
      subtitle={c.subtitle}
      meta={[
        { label: c.metaClass, value: '9' },
        { label: c.metaSubject, value: c.subject },
        { label: c.metaDate, value: formatDate('2026-12-15', mode) },
        { label: c.metaMedium, value: c.medium },
      ]}
      marks={75}
      instructions={[c.instruction]}
    >
      <SamplePaperContent mode={mode} />
    </PaperSheet>
  )
}

/** A window into a real paper: top / middle / bottom of the same sheet. */
function PaperCrop({ mode, align, short }: { mode: PaperMode; align: 'top' | 'middle' | 'bottom'; short?: boolean }) {
  return (
    <div className={['landing-crop', `landing-crop--${align}`, short && 'landing-crop--short'].filter(Boolean).join(' ')} aria-hidden="true">
      <div className="landing-crop__inner">
        <SamplePaperSheet mode={mode} />
      </div>
    </div>
  )
}

function SectionHead({ eyebrow, titleId, title, subtitle, dark, center }: {
  eyebrow?: string
  titleId: string
  title: string
  subtitle?: string
  dark?: boolean
  center?: boolean
}) {
  return (
    <div className={['landing__head', dark && 'landing__head--dark', center && 'landing__head--center'].filter(Boolean).join(' ')}>
      {eyebrow && <p className="landing__eyebrow">{eyebrow}</p>}
      <h2 id={titleId} className="landing__title">{title}</h2>
      {subtitle && <p className="landing__subtitle">{subtitle}</p>}
    </div>
  )
}

function RoleCopy({ roleKey, titleId }: { roleKey: 'teacher' | 'school' | 'platform'; titleId: string }) {
  const { t } = useTranslation()
  return (
    <div className="landing-role__copy">
      <h2 id={titleId}>{t(`landing.roles.${roleKey}.title`)}</h2>
      <p className="landing__lead">{t(`landing.roles.${roleKey}.subtitle`)}</p>
      <ul className="landing-role__points">
        {[1, 2, 3].map(n => (
          <li key={n}>
            <Check size={20} aria-hidden="true" />
            <span>{t(`landing.roles.${roleKey}.point${n}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function IllustrationRow({ name, meta, status }: { name: string; meta: string; status: ChipStatus }) {
  return (
    <li className="landing-rows__row">
      <Avatar name={name} size="sm" />
      <div className="landing-rows__text">
        <span className="landing-rows__name">{name}</span>
        <span className="landing-rows__meta">{meta}</span>
      </div>
      <StatusChip status={status} />
    </li>
  )
}

const TRUST_ITEMS: Array<{ id: 'approvals' | 'audit' | 'key' | 'bilingual'; Icon: LucideIcon }> = [
  { id: 'approvals', Icon: ShieldCheck },
  { id: 'audit', Icon: History },
  { id: 'key', Icon: KeyRound },
  { id: 'bilingual', Icon: Languages },
]

interface PlanDef {
  id: 'starter' | 'growth' | 'enterprise'
  teachers: number | null
  papers: number | null
  popular?: boolean
  cta: 'requestAccess' | 'contactUs'
}

/** Limits are numbers in code (data, not copy); "Unlimited" is a word, so it is translated. */
const PLANS: PlanDef[] = [
  { id: 'starter', teachers: 5, papers: 50, cta: 'requestAccess' },
  { id: 'growth', teachers: 25, papers: 300, popular: true, cta: 'requestAccess' },
  { id: 'enterprise', teachers: null, papers: null, cta: 'contactUs' },
]

/** Landing page — Phase 2 B1, blueprint 7.8. */
export function LandingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const uiLang: PaperMode = i18n.language === 'ur' ? 'ur' : 'en'

  /* The preview follows the interface language, and can be flipped on its own. */
  const [preview, setPreview] = useState<PaperMode>(uiLang)
  useEffect(() => { setPreview(uiLang) }, [uiLang])

  const faqItems: AccordionItem[] = [1, 2, 3, 4, 5, 6].map(n => ({
    id: `faq-${n}`,
    question: t(`landing.faq.q${n}`),
    answer: t(`landing.faq.a${n}`),
  }))

  return (
    <PublicLayout>
      <div className="landing">
        {/* 1. Hero — live A4 paper, Urdu / English preview */}
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing__container landing-hero__grid">
            <div className="landing-hero__copy">
              <p className="landing__eyebrow">{t('landing.hero.eyebrow')}</p>
              <h1 id="landing-hero-title" className="landing-hero__title">{t('landing.hero.title')}</h1>
              <p className="landing__lead">{t('landing.hero.subtitle')}</p>
              <div className="landing-hero__ctas">
                <Button size="lg" onClick={() => navigate('/request-access')}>
                  {t('landing.hero.primaryCta')}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  trailingIcon={<ArrowDown size={18} aria-hidden="true" />}
                  onClick={() => navigate('/#how')}
                >
                  {t('landing.hero.secondaryCta')}
                </Button>
              </div>
            </div>
            <div className="landing-hero__paper">
              <div className="landing-hero__preview">
                <span className="landing-hero__preview-label">{t('landing.hero.previewLabel')}</span>
                <SegmentedControl
                  ariaLabel={t('landing.hero.previewLabel')}
                  value={preview}
                  onChange={v => setPreview(v as PaperMode)}
                  options={[
                    { value: 'ur', label: t('landing.hero.previewUrdu') },
                    { value: 'en', label: t('landing.hero.previewEnglish') },
                  ]}
                />
              </div>
              <SamplePaperSheet mode={preview} />
              <p className="landing-hero__caption">
                <Trans
                  i18nKey="landing.hero.sampleNote"
                  values={{ classNo: 9, marks: 75 }}
                  components={{ b: <Bidi>{''}</Bidi> }}
                />
              </p>
            </div>
          </div>
        </section>

        {/* 2. How a paper is made — real paper crops, not icons */}
        <section id="how" className="landing__band landing__band--paper" aria-labelledby="landing-how-title">
          <div className="landing__container">
            <SectionHead
              eyebrow={t('landing.how.eyebrow')}
              titleId="landing-how-title"
              title={t('landing.how.title')}
              subtitle={t('landing.how.subtitle')}
            />
            <div className="landing-how__grid">
              <article className="landing-how__beat">
                <PaperCrop mode={uiLang} align="top" />
                <div className="landing-how__body">
                  <span className="landing-how__num"><Bidi>1</Bidi></span>
                  <h3>{t('landing.how.pickTitle')}</h3>
                  <p>{t('landing.how.pickText')}</p>
                </div>
              </article>
              <article className="landing-how__beat">
                <PaperCrop mode={uiLang} align="middle" />
                <div className="landing-how__body">
                  <span className="landing-how__num"><Bidi>2</Bidi></span>
                  <h3>{t('landing.how.buildTitle')}</h3>
                  <p>{t('landing.how.buildText')}</p>
                </div>
              </article>
              <article className="landing-how__beat">
                <PaperCrop mode={uiLang} align="bottom" />
                <div className="landing-how__body">
                  <span className="landing-how__num"><Bidi>3</Bidi></span>
                  <h3>{t('landing.how.printTitle')}</h3>
                  <p>{t('landing.how.printText')}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* 3. Role sections — one product illustration each */}
        <section className="landing-role" aria-labelledby="landing-role-teacher-title">
          <div className="landing__container landing-role__grid">
            <RoleCopy roleKey="teacher" titleId="landing-role-teacher-title" />
            <div className="landing-role__media">
              <Card title={t('landing.roles.teacher.illustrationTitle')}>
                <div className="landing-illustration">
                  <PaperCrop mode={uiLang} align="top" short />
                  <Meter target={75} current={75} label={t('landing.roles.teacher.meterLabel')} />
                  <div className="landing-illustration__chip-row">
                    <StatusChip status="approved" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="landing-role" aria-labelledby="landing-role-school-title">
          <div className="landing__container landing-role__grid landing-role--flip">
            <RoleCopy roleKey="school" titleId="landing-role-school-title" />
            <div className="landing-role__media">
              <Card title={t('landing.roles.school.illustrationTitle')}>
                <ul className="landing-rows">
                  <IllustrationRow name={t('landing.roles.school.row1Name')} meta={t('landing.roles.school.row1Paper')} status="submitted" />
                  <IllustrationRow name={t('landing.roles.school.row2Name')} meta={t('landing.roles.school.row2Paper')} status="in-review" />
                  <IllustrationRow name={t('landing.roles.school.row3Name')} meta={t('landing.roles.school.row3Paper')} status="approved" />
                </ul>
              </Card>
            </div>
          </div>
        </section>

        <section className="landing-role" aria-labelledby="landing-role-platform-title">
          <div className="landing__container landing-role__grid">
            <RoleCopy roleKey="platform" titleId="landing-role-platform-title" />
            <div className="landing-role__media">
              <Card title={t('landing.roles.platform.illustrationTitle')}>
                <div className="landing-illustration">
                  <ul className="landing-rows">
                    <IllustrationRow name={t('landing.roles.platform.row1Name')} meta={t('landing.roles.platform.row1Meta')} status="active" />
                    <IllustrationRow name={t('landing.roles.platform.row2Name')} meta={t('landing.roles.platform.row2Meta')} status="active" />
                    <IllustrationRow name={t('landing.roles.platform.row3Name')} meta={t('landing.roles.platform.row3Meta')} status="pending" />
                  </ul>
                  <Meter target={1500} current={1240} label={t('landing.roles.platform.meterLabel')} />
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* 4. Trust band */}
        <section className="landing__band landing__band--dark" aria-labelledby="landing-trust-title">
          <div className="landing__container">
            <SectionHead
              titleId="landing-trust-title"
              title={t('landing.trust.title')}
              subtitle={t('landing.trust.subtitle')}
              dark
            />
            <ul className="landing-trust__grid">
              {TRUST_ITEMS.map(({ id, Icon }) => (
                <li key={id} className="landing-trust__item">
                  <Icon size={24} aria-hidden="true" className="landing-trust__icon" />
                  <h3>{t(`landing.trust.${id}Title`)}</h3>
                  <p>{t(`landing.trust.${id}Text`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. Plans — prices and limits are placeholders */}
        <section id="plans" className="landing__band" aria-labelledby="landing-plans-title">
          <div className="landing__container">
            <SectionHead
              eyebrow={t('landing.plans.eyebrow')}
              titleId="landing-plans-title"
              title={t('landing.plans.title')}
              subtitle={t('landing.plans.subtitle')}
            />
            <div className="landing-plans__grid">
              {PLANS.map(plan => (
                <Card
                  key={plan.id}
                  padding="lg"
                  className={plan.popular ? 'landing-plan landing-plan--popular' : 'landing-plan'}
                >
                  {plan.popular && (
                    <div className="landing-plan__badge-row">
                      <Badge tone="mark">{t('landing.plans.mostPopular')}</Badge>
                    </div>
                  )}
                  <h3 className="landing-plan__name">{t(`landing.plans.${plan.id}.name`)}</h3>
                  <p className="landing-plan__blurb">{t(`landing.plans.${plan.id}.blurb`)}</p>
                  <p className="landing-plan__price">
                    <span className="landing-plan__price-value">{t('landing.plans.priceOnRequest')}</span>
                    <span className="landing-plan__price-per">{t('landing.plans.perMonth')}</span>
                  </p>
                  <ul className="landing-plan__limits">
                    <li>
                      <Check size={18} aria-hidden="true" />
                      <span>
                        <Bidi>{plan.teachers ?? t('landing.plans.unlimited')}</Bidi>
                        {' '}
                        {t(`landing.plans.${plan.id}.teachersLabel`)}
                      </span>
                    </li>
                    <li>
                      <Check size={18} aria-hidden="true" />
                      <span>
                        <Bidi>{plan.papers ?? t('landing.plans.unlimited')}</Bidi>
                        {' '}
                        {t(`landing.plans.${plan.id}.papersLabel`)}
                      </span>
                    </li>
                    <li>
                      <Check size={18} aria-hidden="true" />
                      <span>{t(`landing.plans.${plan.id}.feature`)}</span>
                    </li>
                  </ul>
                  <Button
                    size="lg"
                    variant={plan.popular ? 'primary' : 'secondary'}
                    className="landing-plan__cta"
                    onClick={() => navigate('/request-access')}
                  >
                    {t(plan.cta === 'contactUs' ? 'landing.plans.contactUs' : 'landing.plans.requestAccess')}
                  </Button>
                </Card>
              ))}
            </div>
            <p className="landing-plans__note">{t('landing.plans.note')}</p>
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className="landing__band" aria-labelledby="landing-faq-title">
          <div className="landing__container landing-faq">
            <SectionHead
              eyebrow={t('landing.faq.eyebrow')}
              titleId="landing-faq-title"
              title={t('landing.faq.title')}
              center
            />
            <Accordion ariaLabel={t('landing.faq.title')} items={faqItems} />
          </div>
        </section>

        {/* 7. Final call to action */}
        <section className="landing__band landing__band--cta" aria-labelledby="landing-cta-title">
          <div className="landing__container landing-cta">
            <h2 id="landing-cta-title">{t('landing.cta.title')}</h2>
            <p>{t('landing.cta.text')}</p>
            <Button size="lg" variant="secondary" onClick={() => navigate('/request-access')}>
              {t('landing.cta.button')}
            </Button>
          </div>
        </section>
      </div>
    </PublicLayout>
  )
}

export default LandingPage
