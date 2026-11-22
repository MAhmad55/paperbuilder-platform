import type { ReactNode } from 'react'

/**
 * Complete sample paper content — one per language.
 * Rendered inside <PaperSheet> with the EN (LTR) and UR (RTL) variants,
 * so the crop captures are real-world sheet designs.
 */
export function SamplePaperContent({ mode }: { mode: 'en' | 'ur' }) {
  if (mode === 'en') return <EnContent />
  return <UrContent />
}

function SectionHead({ children }: { children: ReactNode }) {
  return <div className="pb-paper__section-head">{children}</div>
}

function McqItem({ n, q, options, mark }: { n: number; q: string; options: [string, string, string, string]; mark: number }) {
  return (
    <li className="pb-paper__mcq-item">
      <div className="pb-paper__question">
        <bdi className="bdi">{n}.</bdi>
        <span>{q} <span className="pb-paper__marks">({mark})</span></span>
      </div>
      <div className="pb-paper__options">
        {(['a', 'b', 'c', 'd'] as const).map((letter, i) => (
          <span key={letter} className="pb-paper__option">
            <bdi className="bdi pb-paper__option-letter">({letter})</bdi>
            <span>{options[i]}</span>
          </span>
        ))}
      </div>
    </li>
  )
}

function EnContent() {
  return (
    <>
      <SectionHead>
        <span>Section A — Multiple Choice</span>
        <span>15 marks</span>
      </SectionHead>
      <ol className="pb-paper__mcq">
        <McqItem
          n={1}
          q="Solve 2x + 5 = 13."
          options={['4', '9', '8', '2.5']}
          mark={5}
        />
        <McqItem
          n={2}
          q="If f(x) = 3x + 1, what is f(2)?"
          options={['7', '13', '5', '8']}
          mark={5}
        />
        <McqItem
          n={3}
          q="Write the area of a circle with radius 4 cm, in terms of π."
          options={['16π cm²', '8π cm²', '4π cm²', '32π cm²']}
          mark={5}
        />
      </ol>

      <SectionHead>
        <span>Section B — Short Questions</span>
        <span>30 marks</span>
      </SectionHead>
      <div className="pb-paper__question">
        <bdi className="bdi">1.</bdi>
        <span>Factorise x² − 4. <span className="pb-paper__marks">(10 marks)</span></span>
      </div>
      <div className="pb-paper__answer-space" />
      <div className="pb-paper__question">
        <bdi className="bdi">2.</bdi>
        <span>Write the mean, median and mode of: 4, 6, 8, 8, 10. <span className="pb-paper__marks">(10 marks)</span></span>
      </div>
      <div className="pb-paper__answer-space" />
      <div className="pb-paper__question">
        <bdi className="bdi">3.</bdi>
        <span>Draw the graph of y = 2x + 1 for x between 0 and 3. <span className="pb-paper__marks">(10 marks)</span></span>
      </div>
      <div className="pb-paper__answer-space" />

      <SectionHead>
        <span>Section C — Long Question</span>
        <span>30 marks</span>
      </SectionHead>
      <div className="pb-paper__question">
        <bdi className="bdi">1.</bdi>
        <span>A ladder 5 m long leans against a vertical wall. The foot of the ladder is 3 m from the wall. Find the height to which the top of the ladder reaches. Show all your working. <span className="pb-paper__marks">(30 marks)</span></span>
      </div>
      <div className="pb-paper__answer-space" />
    </>
  )
}

function UrContent() {
  return (
    <>
      <SectionHead>
        <span>حصہ A — کثیر الجواب</span>
        <span>15 مارک</span>
      </SectionHead>
      <ol className="pb-paper__mcq">
        <McqItem
          n={1}
          q="2x + 5 = 13 کا حل کریں۔"
          options={['4', '9', '8', '2.5']}
          mark={5}
        />
        <McqItem
          n={2}
          q="اگر f(x) = 3x + 1 ہے، تو f(2) کیا ہے؟"
          options={['7', '13', '5', '8']}
          mark={5}
        />
        <McqItem
          n={3}
          q="4 سینٹی میٹر ریڈیس والے دائرے کے رقبے کو π کے لحاظ سے لکھیں۔"
          options={['16π cm²', '8π cm²', '4π cm²', '32π cm²']}
          mark={5}
        />
      </ol>

      <SectionHead>
        <span>حصہ B — مختصر سوالات</span>
        <span>30 مارک</span>
      </SectionHead>
      <div className="pb-paper__question">
        <bdi className="bdi">1.</bdi>
        <span>x² − 4 کو فیکٹر کریں۔ <bdi className="bdi">(10 مارک)</bdi></span>
      </div>
      <div className="pb-paper__answer-space" />
      <div className="pb-paper__question">
        <bdi className="bdi">2.</bdi>
        <span>ذیل میں میانہ، وسط اور مود لکھیں: 4، 6، 8، 8، 10 <bdi className="bdi">(10 مارک)</bdi></span>
      </div>
      <div className="pb-paper__answer-space" />
      <div className="pb-paper__question">
        <bdi className="bdi">3.</bdi>
        <span>y = 2x + 1 کے گراف کو 0 سے 3 کے درمیان کھینچیں۔ <bdi className="bdi">(10 مارک)</bdi></span>
      </div>
      <div className="pb-paper__answer-space" />

      <SectionHead>
        <span>حصہ C — طویل سوال</span>
        <span>30 مارک</span>
      </SectionHead>
      <div className="pb-paper__question">
        <bdi className="bdi">1.</bdi>
        <span>5 میٹر طویل ایک سیڑھی عمودی دیوار کے خلاف رکھی ہے۔ سیڑھی کی بنیاد دیوار سے 3 میٹر دور ہے۔ معلوم کریں کہ سیڑھی کا اوپر دیوار تک کیا بلندی پر پہنچتا ہے۔ تمام مراحل دکھائیں۔ <bdi className="bdi">(30 مارک)</bdi></span>
      </div>
      <div className="pb-paper__answer-space" />
    </>
  )
}
