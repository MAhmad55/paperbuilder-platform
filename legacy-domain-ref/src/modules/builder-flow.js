(function (root) {
  "use strict";

  const STEP_COUNT = 7;
  const STEP_LABELS = ["Class", "Subject", "Chapters", "Questions", "Review", "Information", "Paper"];
  const CLASS_CHOICES = [
    { value: "8", label: "8th Class", number: "08" },
    { value: "9", label: "9th Class", number: "09" },
    { value: "10", label: "10th Class", number: "10" },
    { value: "First Year", label: "1st Year", number: "1Y" },
    { value: "Second Year", label: "2nd Year", number: "2Y" }
  ];
  const SUBJECT_CHOICES = [
    { id: "english", label: "English", icon: "english" },
    { id: "urdu", label: "Urdu", icon: "urdu" },
    { id: "mathematics-en", label: "Mathematics (English Medium)", icon: "math-en", medium: "english", available: false },
    { id: "mathematics-ur", label: "Mathematics (Urdu Medium)", icon: "math-ur", medium: "urdu", available: true },
    { id: "physics-en", label: "Physics (English Medium)", icon: "physics", medium: "english", available: false },
    { id: "physics-ur", label: "Physics (Urdu Medium)", icon: "physics", medium: "urdu", available: true },
    { id: "chemistry-en", label: "Chemistry (English Medium)", icon: "chemistry", medium: "english", available: false },
    { id: "chemistry-ur", label: "Chemistry (Urdu Medium)", icon: "chemistry", medium: "urdu", available: true },
    { id: "biology-en", label: "Biology (English Medium)", icon: "biology", medium: "english", available: false },
    { id: "biology-ur", label: "Biology (Urdu Medium)", icon: "biology", medium: "urdu", available: true },
    { id: "computer-science-en", label: "Computer Science (English Medium)", icon: "computer", medium: "english", available: false },
    { id: "computer-science-ur", label: "Computer Science (Urdu Medium)", icon: "computer", medium: "urdu", available: true },
    { id: "islamiat", label: "Islamiat", icon: "islamiat", classes: ["9"] },
    { id: "pakistan-studies", label: "Pakistan Studies", icon: "pakistan-studies", classes: ["10"] },
    { id: "tarjuma-quran", label: "Tarjuma Quran", icon: "quran" }
  ];
  // Medium availability is derived from the loaded bank manifest, not hard-coded:
  // a medium is only offered once a validated bank actually carries it.
  // Bilingual is NOT a builder medium (owner rule): a paper is authored in one
  // language. "Both languages side by side" is an OUTPUT choice made on the paper
  // step - see PRINT_LANGUAGES below.
  const MEDIUM_CHOICES = [
    { value: "urdu", label: "UM", title: "Urdu Medium", available: true },
    { value: "english", label: "EM", title: "English Medium", available: false }
  ];
  // Output-only choices, offered on the paper step. "bilingual" is valid here and
  // nowhere else; it needs both source languages in the bank.
  const PRINT_LANGUAGES = [
    { value: "english", label: "English", title: "Print the paper in English only", requires: ["english"] },
    { value: "urdu", label: "Urdu", title: "Print the paper in Urdu only", requires: ["urdu"] },
    { value: "bilingual", label: "Bilingual", title: "Print English and Urdu side by side", requires: ["english", "urdu"] }
  ];
  const DEFAULT_BANK_MEDIUMS = ["urdu"];
  const QUESTION_TYPES = ["mcq", "short", "long", "numerical"];

  let bankMediums = DEFAULT_BANK_MEDIUMS.slice();

  function applyMediumAvailability() {
    SUBJECT_CHOICES.forEach((choice) => {
      if (!choice.medium) return;
      choice.available = bankMediums.includes(choice.medium);
    });
    MEDIUM_CHOICES.forEach((choice) => {
      choice.available = bankMediums.includes(choice.value);
    });
    PRINT_LANGUAGES.forEach((choice) => {
      choice.available = choice.requires.every((language) => bankMediums.includes(language));
    });
  }

  function setBankMediums(values) {
    const list = Array.from(values || [], (value) => String(value).trim().toLowerCase()).filter(Boolean);
    bankMediums = Array.from(new Set(list.length ? list : DEFAULT_BANK_MEDIUMS));
    applyMediumAvailability();
    return { subjects: availableSubjects(), mediums: availableMediums() };
  }

  function bankMediumList() {
    return bankMediums.slice();
  }

  function isMediumAvailable(medium) {
    const choice = MEDIUM_CHOICES.find((item) => item.value === medium);
    return Boolean(choice && choice.available);
  }

  function isPrintLanguageAvailable(language) {
    const choice = PRINT_LANGUAGES.find((item) => item.value === language);
    return Boolean(choice && choice.available);
  }

  function availablePrintLanguages() {
    return PRINT_LANGUAGES.filter((choice) => choice.available).map((choice) => choice.value);
  }

  // The paper prints in the chosen output language; until the user picks one it
  // simply follows the authoring medium.
  function printLanguageOf(state) {
    const chosen = state && state.printLanguage;
    if (chosen && isPrintLanguageAvailable(chosen)) return chosen;
    return (state && state.medium) || "urdu";
  }

  function setPrintLanguage(state, language) {
    assertState(state);
    if (!isPrintLanguageAvailable(language)) return state;
    return { ...state, printLanguage: language, stale: Boolean(state.selectedQuestions && totalSelected(state)) };
  }

  function availableMediums() {
    return MEDIUM_CHOICES.filter((choice) => choice.available).map((choice) => choice.value);
  }

  function availableSubjects() {
    return SUBJECT_CHOICES.filter((choice) => choice.available);
  }

  // Class-gated subjects: a choice with a `classes` list only appears for
  // those classes (Islamiat is 9th only, Pakistan Studies is 10th only, per
  // the Scheme of Studies). A choice with no `classes` list is shared.
  function subjectsForClass(classValue) {
    const value = String(classValue);
    return SUBJECT_CHOICES.filter((choice) => !choice.classes || choice.classes.includes(value));
  }

  applyMediumAvailability();

  function emptyQuestions() {
    return { mcq: [], short: [], long: [], numerical: [] };
  }

  function createFlowState() {
    return {
      step: 1,
      classValue: null,
      bankId: null,
      subjectId: null,
      medium: availableMediums()[0] || "urdu",
      printLanguage: null,
      selectedUnitIds: [],
      mode: "custom",
      selectedQuestions: emptyQuestions(),
      autoCounts: { mcq: 15, short: 6, long: 3 },
      marks: { mcq: 1, short: 2, long: 8, numerical: 5 },
      config: {
        instituteName: "",
        instituteType: "",
        contact: "",
        showLogo: true,
        showContact: false,
        timeAllowed: "",
        totalMarks: null,
        totalMarksDerived: true,
        fontSize: 11,
        watermarkText: "",
        chapters: "",
        logoDataUrl: "",
        includeAnswerKey: false,
        separatePages: false,
        omr: false,
        omrPosition: "end"
      },
      stale: false
    };
  }

  function assertState(state) {
    if (!state || !Number.isInteger(state.step) || state.step < 1 || state.step > STEP_COUNT) {
      throw new TypeError(`Flow step must be an integer from 1 to ${STEP_COUNT}.`);
    }
  }

  function totalSelected(state) {
    return QUESTION_TYPES.reduce((total, type) => total + (state.selectedQuestions[type] || []).length, 0);
  }

  function canAdvance(state) {
    assertState(state);
    if (state.step === 1) return CLASS_CHOICES.some((choice) => choice.value === state.classValue);
    if (state.step === 2) return Boolean(state.bankId && state.subjectId && ["mathematics-en", "mathematics-ur"].includes(state.subjectId));
    if (state.step === 3) return Array.isArray(state.selectedUnitIds) && state.selectedUnitIds.length > 0;
    if (state.step === 4 || state.step === 5) return totalSelected(state) > 0;
    return false;
  }

  function goToStep(state, step) {
    assertState(state);
    if (!Number.isInteger(step) || step < 1 || step > STEP_COUNT) {
      throw new RangeError(`Flow step must be from 1 to ${STEP_COUNT}.`);
    }
    return { ...state, step };
  }

  function nextStep(state) {
    assertState(state);
    return canAdvance(state) && state.step < STEP_COUNT ? goToStep(state, state.step + 1) : state;
  }

  function previousStep(state) {
    assertState(state);
    return state.step > 1 ? goToStep(state, state.step - 1) : state;
  }

  function getProgress(state) {
    assertState(state);
    return {
      step: state.step,
      total: STEP_COUNT,
      label: STEP_LABELS[state.step - 1],
      percent: Math.round((state.step / STEP_COUNT) * 100)
    };
  }

  function selectClass(state, value) {
    assertState(state);
    const choice = CLASS_CHOICES.find((item) => item.value === String(value));
    if (!choice) return state;
    return {
      ...state,
      step: 2,
      classValue: choice.value,
      bankId: null,
      subjectId: null,
      selectedUnitIds: [],
      selectedQuestions: emptyQuestions(),
      stale: false
    };
  }

  function selectSubject(state, subjectId, bankId, options) {
    assertState(state);
    const choice = SUBJECT_CHOICES.find((item) => item.id === subjectId);
    if (!choice || !bankId) return state;
    // A class-gated subject cannot be picked for the wrong class, even when
    // the caller asserts a bank backs it.
    if (choice.classes && !choice.classes.includes(String(state.classValue))) return state;
    // A subject with no medium cannot be medium-gated: the caller
    // asserts it is backed by a validated bank for the selected class via
    // options.bankBacked. Without that assertion the old rule stands, so
    // unbacked subjects still cannot advance.
    if (!choice.available && !(options && options.bankBacked)) return state;
    return {
      ...state,
      step: 3,
      bankId: String(bankId),
      subjectId: choice.id,
      medium: choice.medium,
      selectedQuestions: emptyQuestions(),
      stale: false
    };
  }

  function setUnits(state, unitIds) {
    assertState(state);
    const selectedUnitIds = Array.from(new Set(Array.from(unitIds || [], (value) => String(value))));
    return { ...state, selectedUnitIds };
  }

  function setQuestions(state, selectedQuestions) {
    assertState(state);
    const questions = emptyQuestions();
    QUESTION_TYPES.forEach((type) => {
      questions[type] = Array.isArray(selectedQuestions && selectedQuestions[type])
        ? selectedQuestions[type].slice()
        : [];
    });
    return { ...state, selectedQuestions: questions, stale: false };
  }

  function setMedium(state, medium) {
    assertState(state);
    // Only mediums backed by a loaded bank may be selected, and "bilingual" is
    // never a builder medium - it belongs to the paper step.
    if (!isMediumAvailable(medium)) return state;
    // An explicit output-language choice survives a medium switch only while it
    // can still be printed.
    const printLanguage = state.printLanguage && isPrintLanguageAvailable(state.printLanguage) ? state.printLanguage : null;
    return { ...state, medium, printLanguage, stale: Boolean(state.selectedQuestions && totalSelected(state)) };
  }

  function setMode(state, mode) {
    assertState(state);
    if (mode !== "custom" && mode !== "auto") return state;
    return { ...state, mode };
  }

  function setConfig(state, values) {
    assertState(state);
    return { ...state, config: { ...state.config, ...(values || {}) }, stale: true };
  }

  function validationMessage(state) {
    assertState(state);
    if (state.step === 1 && !state.classValue) return "Select a class to continue.";
    if (state.step === 2 && !state.subjectId) return "Select an available subject to continue.";
    if (state.step === 3 && state.selectedUnitIds.length === 0) return "Select at least one chapter.";
    if ((state.step === 4 || state.step === 5) && totalSelected(state) === 0) return "Select at least one question.";
    return "";
  }

  const api = {
    STEP_COUNT,
    STEP_LABELS,
    CLASS_CHOICES,
    SUBJECT_CHOICES,
    MEDIUM_CHOICES,
    PRINT_LANGUAGES,
    QUESTION_TYPES,
    setBankMediums,
    bankMediumList,
    isMediumAvailable,
    availableMediums,
    isPrintLanguageAvailable,
    availablePrintLanguages,
    printLanguageOf,
    setPrintLanguage,
    availableSubjects,
    subjectsForClass,
    createFlowState,
    totalSelected,
    canAdvance,
    goToStep,
    nextStep,
    previousStep,
    getProgress,
    selectClass,
    selectSubject,
    setUnits,
    setQuestions,
    setMedium,
    setMode,
    setConfig,
    validationMessage
  };

  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.builderFlow = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
