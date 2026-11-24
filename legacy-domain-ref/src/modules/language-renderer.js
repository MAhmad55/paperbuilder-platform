(function (root) {
  "use strict";

  const MODES = ["english", "urdu", "bilingual"];
  const TYPE_LABELS = {
    mcq: "Multiple choice questions",
    short: "Short-answer questions",
    long: "Long-answer questions",
    numerical: "Numerical problems"
  };

  function modePanels(question, mode, includeOptions) {
    const english = {
      language: "en",
      direction: "ltr",
      text: question.q,
      options: includeOptions && Array.isArray(question.options) ? question.options.slice() : []
    };
    const urdu = {
      language: "ur",
      direction: "rtl",
      text: question.q_ur,
      options: includeOptions && Array.isArray(question.options_ur) ? question.options_ur.slice() : []
    };

    if (mode === "english") return { layout: "single", panels: [english] };
    if (mode === "urdu") return { layout: "single", panels: [urdu] };
    if (mode === "bilingual") return { layout: "columns", panels: [english, urdu] };
    throw new RangeError(`Unsupported language mode: ${mode}`);
  }

  function studentQuestionViewModel(selectionItem, questionNumber, mode, marksEach) {
    const source = selectionItem.question;
    const type = selectionItem.type;
    const figure = selectionItem.figureAsset && selectionItem.figureAsset.available
      ? { url: selectionItem.figureAsset.url }
      : source.fig
        ? { missingReference: source.fig }
        : null;

    return {
      number: questionNumber,
      type,
      unitNumber: selectionItem.unitNumber,
      unitTitle: selectionItem.unitTitle,
      marks: marksEach,
      content: modePanels(source, mode, type === "mcq"),
      figure
    };
  }

  function studentPaperViewModel(selection, marks, mode) {
    const sections = ["mcq", "short", "long", "numerical"]
      .filter((type) => selection.questions[type].length > 0)
      .map((type) => ({
        type,
        title: TYPE_LABELS[type],
        count: selection.questions[type].length,
        marksEach: marks[type].marksEach,
        total: marks[type].total,
        questions: selection.questions[type].map((item, index) => studentQuestionViewModel(item, index + 1, mode, marks[type].marksEach))
      }));

    return { sections };
  }

  function workedSolutionViewModel(selectionItem, mode) {
    if (!selectionItem || selectionItem.bankId !== "10th-math-urdu") return null;
    const source = selectionItem.question || {};
    const english = String(source.solution_en != null ? source.solution_en : source.a == null ? "" : source.a);
    const urdu = String(source.solution_ur != null ? source.solution_ur : source.a_ur == null ? "" : source.a_ur);
    const content = modePanels({ q: english, q_ur: urdu }, mode, false);
    return content.panels.every((panel) => panel.text.trim()) ? content : null;
  }

  function answerKeyQuestionViewModel(selectionItem, questionNumber, mode, marksEach) {
    const source = selectionItem.question;
    const solution = workedSolutionViewModel(selectionItem, mode);
    const base = {
      number: questionNumber,
      type: selectionItem.type,
      unitNumber: selectionItem.unitNumber,
      unitTitle: selectionItem.unitTitle,
      sourceNumber: source.n,
      sourceId: Object.prototype.hasOwnProperty.call(source, "id") ? source.id : null,
      marks: marksEach,
      prompt: modePanels(source, mode, false)
    };

    if (selectionItem.type !== "mcq") {
      return {
        ...base,
        answerAvailable: Boolean(solution),
        solution,
        solutionAvailable: Boolean(solution),
        correctAnswer: null,
        markingNote: solution ? "" : "No keyed answer was supplied with this question bank."
      };
    }

    const answer = String(source.answer).trim();
    const optionIndex = "ABCD".indexOf(answer.toUpperCase());
    const englishOption = optionIndex >= 0 ? source.options[optionIndex] : "";
    const urduOption = optionIndex >= 0 ? source.options_ur[optionIndex] : "";
    const correctAnswer = mode === "english"
      ? { layout: "single", panels: [{ language: "en", direction: "ltr", letter: answer, text: englishOption }] }
      : mode === "urdu"
        ? { layout: "single", panels: [{ language: "ur", direction: "rtl", letter: answer, text: urduOption }] }
        : {
          layout: "columns",
          panels: [
            { language: "en", direction: "ltr", letter: answer, text: englishOption },
            { language: "ur", direction: "rtl", letter: answer, text: urduOption }
          ]
        };

    return {
      ...base,
      answerAvailable: true,
      correctAnswer,
      solution,
      solutionAvailable: Boolean(solution)
    };
  }

  function answerKeyViewModel(selection, marks, mode) {
    return {
      sections: ["mcq", "short", "long", "numerical"]
        .filter((type) => selection.questions[type].length > 0)
        .map((type) => ({
          type,
          title: TYPE_LABELS[type],
          total: marks[type].total,
          entries: selection.questions[type].map((item, index) => answerKeyQuestionViewModel(item, index + 1, mode, marks[type].marksEach))
        }))
    };
  }

  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.languageRenderer = {
    MODES,
    TYPE_LABELS,
    modePanels,
    studentQuestionViewModel,
    studentPaperViewModel,
    answerKeyQuestionViewModel,
    answerKeyViewModel
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.PaperBuilder.languageRenderer;
  }
})(typeof window !== "undefined" ? window : globalThis);
