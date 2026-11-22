import { Check, Lock } from 'lucide-react'
import Bidi from '../utils/bidi'

export type StepState = 'done' | 'current' | 'blocked' | 'pending'

export interface StepperStep {
  id: string
  title: string
  summary?: string
  state: StepState
}

export interface StepperProps {
  steps: StepperStep[]
  onStepClick?: (stepId: string) => void
  ariaLabel?: string
}

export function Stepper({ steps, onStepClick, ariaLabel }: StepperProps) {
  return (
    <ol className="pb-stepper" aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const isDone = step.state === 'done'
        const isCurrent = step.state === 'current'
        const marker = isDone
          ? <Check size={17} aria-hidden="true" />
          : step.state === 'blocked'
            ? <Lock size={15} aria-hidden="true" />
            : <span aria-hidden="true" style={{ fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>

        const content = (
          <div className="pb-stepper__content">
            <div className="pb-stepper__title">{step.title}</div>
            {step.summary && <div className="pb-stepper__summary"><Bidi>{step.summary}</Bidi></div>}
          </div>
        )

        return (
          <li
            key={step.id}
            className={['pb-stepper__item', `pb-stepper__item--${step.state}`].join(' ')}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="pb-stepper__marker" aria-hidden="true">{marker}</span>
            {onStepClick && isDone ? (
              <button
                type="button"
                className="pb-stepper__button"
                onClick={() => onStepClick(step.id)}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default Stepper
