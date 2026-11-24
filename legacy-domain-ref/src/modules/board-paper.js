(function (root) {
  "use strict";

  const DEFAULT_BOARD_PATTERN = Object.freeze({
    mcqCount: 15,
    mcqMarks: 1,
    shortGroupCount: 3,
    shortCandidatesPerGroup: 9,
    shortAttemptPerGroup: 6,
    shortMarks: 2,
    longCandidateQuestionCount: 5,
    longPartsPerQuestion: 2,
    longAttemptCount: 3,
    longMarks: 8,
    // Numericals are NOT a board-pattern group: no count or attempt fields.
    // Every selected numerical prints and counts at this editable
    // per-question mark. 5 matches the physics board's 5-mark (b) part;
    // banks without numericals never use it, so their totals are untouched.
    numericalMarks: 5,
    longPartMarks: Object.freeze([4, 4]),
    longGroups: Object.freeze([{ from: 5, to: 7, attempt: 2 }, { from: 8, to: 9, attempt: 1 }]),
    firstShortQuestionNumber: 2,
    firstLongQuestionNumber: 5
  });

  // Per-subject board presets (9th and 10th share the same marks distribution,
  // per the owner's 2026-10-26 ruling; source: ALP Smart Syllabus 2025-26).
  // Urdu, English and Islamiyat use named sections (tashreeh, translation,
  // ...) that this MCQ/short/long engine cannot express yet, so they stay out
  // until their banks and a named-section model arrive.
  const SUBJECT_PATTERNS = Object.freeze({
    mathematics: Object.freeze({
      ...DEFAULT_BOARD_PATTERN,
      longPartMarks: Object.freeze([4, 4]),
      longGroups: Object.freeze([{ from: 5, to: 7, attempt: 2 }, { from: 8, to: 9, attempt: 1 }])
    }),
    physics: Object.freeze({
      mcqCount: 12,
      mcqMarks: 1,
      shortGroupCount: 3,
      shortCandidatesPerGroup: 8,
      shortAttemptPerGroup: 5,
      shortMarks: 2,
      longCandidateQuestionCount: 3,
      longPartsPerQuestion: 2,
      longAttemptCount: 2,
      longMarks: 9,
      longPartMarks: Object.freeze([4, 5]),
      // Owner's rule: one complete Physics board long question is (a) a
      // long prompt (4 marks) + (b) a numerical (5 marks). The ALP reference
      // file states only the 4+5 split; the "part (b) is a numerical" rule is
      // the owner's own word, not the file.
      longSecondPartIsNumerical: true,
      firstShortQuestionNumber: 2,
      firstLongQuestionNumber: 5
    }),
    chemistry: Object.freeze({
      mcqCount: 12,
      mcqMarks: 1,
      shortGroupCount: 3,
      shortCandidatesPerGroup: 8,
      shortAttemptPerGroup: 5,
      shortMarks: 2,
      longCandidateQuestionCount: 3,
      longPartsPerQuestion: 2,
      longAttemptCount: 2,
      longMarks: 9,
      longPartMarks: Object.freeze([5, 4]),
      firstShortQuestionNumber: 2,
      firstLongQuestionNumber: 5
    }),
    biology: Object.freeze({
      mcqCount: 12,
      mcqMarks: 1,
      shortGroupCount: 3,
      shortCandidatesPerGroup: 8,
      shortAttemptPerGroup: 5,
      shortMarks: 2,
      longCandidateQuestionCount: 3,
      longPartsPerQuestion: 2,
      longAttemptCount: 2,
      longMarks: 9,
      longPartMarks: Object.freeze([5, 4]),
      firstShortQuestionNumber: 2,
      firstLongQuestionNumber: 5
    }),
    computerScience: Object.freeze({
      mcqCount: 10,
      mcqMarks: 1,
      shortGroupCount: 3,
      shortCandidatesPerGroup: 6,
      shortAttemptPerGroup: 4,
      shortMarks: 2,
      longCandidateQuestionCount: 3,
      longPartsPerQuestion: 1,
      longAttemptCount: 2,
      longMarks: 8,
      longPartMarks: Object.freeze([8]),
      firstShortQuestionNumber: 2,
      firstLongQuestionNumber: 5
    })
  });

  function patternForSubject(subject) {
    const key = String(subject || "").toLowerCase();
    if (key.includes("computer")) return SUBJECT_PATTERNS.computerScience;
    if (key.includes("physic")) return SUBJECT_PATTERNS.physics;
    if (key.includes("chemist")) return SUBJECT_PATTERNS.chemistry;
    if (key.includes("biolog")) return SUBJECT_PATTERNS.biology;
    return SUBJECT_PATTERNS.mathematics;
  }

  const TYPE_KEYS = ["mcq", "short", "long", "numerical"];
  const ROMAN_PARTS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];

  // Long part labels run a, b, c, …; beyond z the label falls back to the
  // part number, so a custom pattern with many parts never prints two "b"s.
  function longPartLabel(partIndex) {
    if (!Number.isSafeInteger(partIndex) || partIndex < 0) return String(partIndex + 1);
    return partIndex < 26 ? String.fromCharCode(97 + partIndex) : String(partIndex + 1);
  }

  // Long choice-groups are authored against the pattern's own long numbering
  // (Q5–Q7 / Q8–Q9 by default). When extra short sets push the first long
  // question later, the groups must move by the same shift, or printed
  // statements and group spacing name questions that no longer sit there.
  function rebaseLongGroups(input, firstLongQuestionNumber) {
    const validation = validatePatternInputs(input);
    if (!validation.ok) return null;
    const pattern = validation.pattern;
    if (!Array.isArray(pattern.longGroups) || !pattern.longGroups.length) return null;
    const first = Number(firstLongQuestionNumber);
    if (!Number.isSafeInteger(first)) return pattern.longGroups;
    const anchor = Number(pattern.longGroups[0].from);
    const shift = Number.isSafeInteger(anchor) ? first - anchor : 0;
    if (!shift) return pattern.longGroups;
    return pattern.longGroups.map((group) => ({ from: group.from + shift, to: group.to + shift, attempt: group.attempt }));
  }

  function positiveInteger(value, label, maximum) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) return `${label} must be a positive whole number.`;
    if (maximum && number > maximum) return `${label} cannot be more than ${maximum}.`;
    return "";
  }

  function positiveNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return `${label} must be a positive number.`;
    return "";
  }

  function normalizePattern(input) {
    const values = input || {};
    const pattern = { ...DEFAULT_BOARD_PATTERN, ...values };
    Object.keys(DEFAULT_BOARD_PATTERN).forEach((key) => {
      if (Array.isArray(pattern[key])) return;
      pattern[key] = Number(pattern[key]);
    });
    // A caller that changes any long field without supplying a split leaves
    // the preset's split behind: it no longer describes this pattern, so it
    // drops instead of failing validation or printing a stale statement.
    const longShapeChanged = ["longPartsPerQuestion", "longCandidateQuestionCount", "longAttemptCount", "longMarks"].some(
      (key) => values[key] != null && Number(values[key]) !== Number(DEFAULT_BOARD_PATTERN[key])
    );
    if (longShapeChanged) {
      if (values.longPartMarks == null) delete pattern.longPartMarks;
      if (values.longGroups == null) delete pattern.longGroups;
    }
    if (Array.isArray(pattern.longPartMarks)) pattern.longPartMarks = pattern.longPartMarks.map(Number);
    if (Array.isArray(pattern.longGroups)) {
      pattern.longGroups = pattern.longGroups.map((group) => ({
        from: Number(group.from),
        to: Number(group.to),
        attempt: Number(group.attempt)
      }));
    }
    return pattern;
  }

  function longMarksPerQuestion(pattern) {
    if (Array.isArray(pattern.longPartMarks) && pattern.longPartMarks.length) {
      return pattern.longPartMarks.reduce((sum, value) => sum + Number(value), 0);
    }
    return Number(pattern.longMarks);
  }

  function validatePatternInputs(input) {
    const values = input || {};
    const pattern = normalizePattern(values);
    const partMarksErrors = [];
    if (pattern.longPartMarks != null) {
      if (!Array.isArray(pattern.longPartMarks) || pattern.longPartMarks.length !== pattern.longPartsPerQuestion) {
        partMarksErrors.push("Long part marks must list one mark per long part.");
      } else {
        pattern.longPartMarks.forEach((value) => {
          const error = positiveNumber(value, "Long part marks");
          if (error) partMarksErrors.push(error);
        });
      }
    }
    const groupErrors = [];
    // A long question paired with a numerical as part (b) has exactly two
    // parts by construction, so a pattern claiming otherwise is incoherent.
    if (pattern.longSecondPartIsNumerical && pattern.longPartsPerQuestion !== 2) {
      partMarksErrors.push("Long questions paired with a numerical must have exactly 2 parts.");
    }
    if (pattern.longGroups != null) {
      if (!Array.isArray(pattern.longGroups) || !pattern.longGroups.length) {
        groupErrors.push("Long groups must list at least one group.");
      } else {
        let attempted = 0;
        pattern.longGroups.forEach((group) => {
          if (!Number.isSafeInteger(group.from) || !Number.isSafeInteger(group.to) || group.to < group.from) {
            groupErrors.push("Long groups must have a valid question range.");
          }
          const error = positiveInteger(group.attempt, "Long group attempt", group.to - group.from + 1);
          if (error) groupErrors.push(error);
          attempted += group.attempt;
        });
        if (attempted !== pattern.longAttemptCount) groupErrors.push("Long group attempts must add up to the long attempt count.");
      }
    }
    const errors = [
      positiveInteger(pattern.mcqCount, "MCQ count"),
      positiveInteger(pattern.shortGroupCount, "Short set count"),
      positiveInteger(pattern.shortCandidatesPerGroup, "Short candidates per set"),
      positiveInteger(pattern.shortAttemptPerGroup, "Short questions per set", pattern.shortCandidatesPerGroup),
      positiveInteger(pattern.longCandidateQuestionCount, "Long board-question count"),
      positiveInteger(pattern.longPartsPerQuestion, "Long prompts per board question"),
      positiveInteger(pattern.longAttemptCount, "Long questions to attempt", pattern.longCandidateQuestionCount),
      positiveInteger(pattern.firstShortQuestionNumber, "First short-question number"),
      positiveInteger(pattern.firstLongQuestionNumber, "First long-question number"),
      positiveNumber(pattern.mcqMarks, "MCQ marks each"),
      positiveNumber(pattern.shortMarks, "Short-question marks each"),
      positiveNumber(pattern.longMarks, "Long-question marks each"),
      positiveNumber(pattern.numericalMarks, "Numerical marks each"),
      ...partMarksErrors,
      ...groupErrors
    ].filter(Boolean);

    return { ok: errors.length === 0, errors, pattern: errors.length ? null : pattern };
  }

  function getRequiredSelectionCounts(input) {
    const pattern = normalizePattern(input);
    // Physics pairs each long board question with a numerical as part (b):
    // auto-pick needs one long prompt and one numerical per board question.
    // Every other subject keeps the board pattern's numerical count of 0:
    // teachers add numericals by checkbox instead.
    const pairedNumerical = Boolean(pattern.longSecondPartIsNumerical);
    return {
      mcq: Number(pattern.mcqCount),
      short: Number(pattern.shortGroupCount) * Number(pattern.shortCandidatesPerGroup),
      long: pairedNumerical
        ? Number(pattern.longCandidateQuestionCount)
        : Number(pattern.longCandidateQuestionCount) * Number(pattern.longPartsPerQuestion),
      numerical: pairedNumerical ? Number(pattern.longCandidateQuestionCount) : 0
    };
  }

  function calculateMarks(input, selected, sectionChoices) {
    const validation = validatePatternInputs(input);
    if (!validation.ok) throw new RangeError(validation.errors.join(" "));
    const pattern = validation.pattern;
    const questions = selected || {};
    const choices = sectionChoices || {};
    const mcqCount = Array.isArray(questions.mcq) ? questions.mcq.length : Number(pattern.mcqCount);
    const shortCount = Array.isArray(questions.short)
      ? questions.short.length
      : Number(pattern.shortGroupCount) * Number(pattern.shortCandidatesPerGroup);
    // No selection passed means the required selection: one long prompt and
    // one numerical per board question when the second part is a numerical.
    const required = getRequiredSelectionCounts(pattern);
    const longCount = Array.isArray(questions.long) ? questions.long.length : required.long;
    // Numericals have no board group and no choice override, except when
    // they are the second part of a long board question: paired numericals
    // count inside the long section, never in the separate numerical one.
    // Absent means the required count, never "select them all".
    const numericalCount = Array.isArray(questions.numerical) ? questions.numerical.length : required.numerical;
    const shortGroupSizes = Array.from({ length: Math.ceil(shortCount / pattern.shortCandidatesPerGroup) }, (_, index) => {
      const remaining = shortCount - index * pattern.shortCandidatesPerGroup;
      return Math.min(pattern.shortCandidatesPerGroup, remaining);
    });
    const shortGroupMarks = shortGroupSizes.map((size, index) => {
      const override = Array.isArray(choices.short) ? choices.short[index] : null;
      const attemptValue = override ? Number(override.attempt) : NaN;
      const attempt = Number.isSafeInteger(attemptValue) && attemptValue >= 1
        ? Math.min(attemptValue, size)
        : Math.min(Number(pattern.shortAttemptPerGroup), size);
      const marksValue = override ? Number(override.marksEach) : NaN;
      const marksEach = Number.isFinite(marksValue) && marksValue > 0 ? marksValue : Number(pattern.shortMarks);
      return { candidates: size, attempted: attempt, marksEach, total: attempt * marksEach };
    });
    const shortAttempted = shortGroupMarks.reduce((sum, group) => sum + group.attempted, 0);
    const shortTotal = shortGroupMarks.reduce((sum, group) => sum + group.total, 0);
    // With a numerical second part, a board question is one long prompt
    // plus one numerical, so the pair count is the smaller of the two lists.
    // Otherwise a board question is longPartsPerQuestion long prompts.
    const pairedNumerical = Boolean(pattern.longSecondPartIsNumerical);
    const longPairCount = pairedNumerical
      ? Math.min(longCount, numericalCount)
      : Math.floor(longCount / pattern.longPartsPerQuestion);
    const longQuestionCount = longPairCount;
    const longAttemptValue = choices.long ? Number(choices.long.attempt) : NaN;
    const longAttempted = Number.isSafeInteger(longAttemptValue) && longAttemptValue >= 1
      ? Math.min(longAttemptValue, longQuestionCount)
      : Math.min(Number(pattern.longAttemptCount), longQuestionCount);
    const longMarksValue = choices.long ? Number(choices.long.marksEach) : NaN;
    const longEach = Number.isFinite(longMarksValue) && longMarksValue > 0 ? longMarksValue : longMarksPerQuestion(pattern);
    // Paired numericals are already counted in the long section; only
    // numericals beyond the paired count print and count on their own.
    const unpairedNumericalCount = pairedNumerical ? numericalCount - longPairCount : numericalCount;
    const sections = {
      mcq: { candidates: mcqCount, attempted: mcqCount, marksEach: Number(pattern.mcqMarks), total: mcqCount * Number(pattern.mcqMarks) },
      short: { candidates: shortCount, groups: shortGroupSizes.length, attempted: shortAttempted, marksEach: Number(pattern.shortMarks), total: shortTotal },
      long: { prompts: longCount, candidates: longQuestionCount, attempted: longAttempted, marksEach: longEach, total: longAttempted * longEach },
      numerical: { candidates: numericalCount, attempted: unpairedNumericalCount, marksEach: Number(pattern.numericalMarks), total: unpairedNumericalCount * Number(pattern.numericalMarks) }
    };
    const total = sections.mcq.total + sections.short.total + sections.long.total + sections.numerical.total;
    return { sections, total };
  }

  function chunk(values, size) {
    const groups = [];
    for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size));
    return groups;
  }

  // Custom statements may carry placeholders that resolve against the
  // section's own numbers at render time, so a teacher can write one
  // instruction that stays correct when counts or marks change. Unknown
  // tokens are left untouched; a statement without tokens is unchanged.
  const STATEMENT_TOKENS = ["offered", "attempt", "marks", "total", "first", "last"];

  function substituteStatementPlaceholders(statement, values) {
    if (typeof statement !== "string") return statement;
    const data = values || {};
    return STATEMENT_TOKENS.reduce((text, token) => {
      if (data[token] == null) return text;
      return text.split(`{${token}}`).join(String(data[token]));
    }, statement);
  }

  function moveArrayEntry(list, from, to) {
    const items = Array.isArray(list) ? list.slice() : [];
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < 0
      || from >= items.length || to >= items.length || from === to) return items;
    const [entry] = items.splice(from, 1);
    items.splice(to, 0, entry);
    return items;
  }

  function dropArrayEntry(list, index) {
    const items = Array.isArray(list) ? list.slice() : [];
    if (!Number.isSafeInteger(index) || index < 0 || index >= items.length) return items;
    items.splice(index, 1);
    return items;
  }

  function buildBoardLayout(selected, input, sectionChoices) {
    const validation = validatePatternInputs(input);
    if (!validation.ok) throw new RangeError(validation.errors.join(" "));
    const pattern = validation.pattern;
    const questions = selected || {};
    const choices = sectionChoices || {};
    const mcq = Array.isArray(questions.mcq) ? questions.mcq.slice() : [];
    const shortPrompts = Array.isArray(questions.short) ? questions.short.slice() : [];
    const longPrompts = Array.isArray(questions.long) ? questions.long.slice() : [];
    const numericalItems = Array.isArray(questions.numerical) ? questions.numerical.slice() : [];
    const shortGroups = chunk(shortPrompts, pattern.shortCandidatesPerGroup).map((items, index) => {
      const questionNumber = pattern.firstShortQuestionNumber + index;
      const override = Array.isArray(choices.short) ? choices.short[index] : null;
      const attemptValue = override ? Number(override.attempt) : NaN;
      const attemptCount = Number.isSafeInteger(attemptValue) && attemptValue >= 1
        ? Math.min(attemptValue, items.length)
        : Math.min(pattern.shortAttemptPerGroup, items.length);
      const marksValue = override ? Number(override.marksEach) : NaN;
      const marksEach = Number.isFinite(marksValue) && marksValue > 0 ? marksValue : Number(pattern.shortMarks);
      const statement = override && typeof override.statement === "string" && override.statement.trim()
        ? substituteStatementPlaceholders(override.statement.trim(), {
          offered: items.length,
          attempt: attemptCount,
          marks: marksEach,
          total: attemptCount * marksEach,
          first: questionNumber,
          last: questionNumber
        })
        : null;
      return {
        number: questionNumber,
        label: `Q.${questionNumber}`,
        parts: items.map((item, partIndex) => ({ label: ROMAN_PARTS[partIndex] || String(partIndex + 1), item })),
        attemptCount,
        marksEach,
        totalMarks: attemptCount * marksEach,
        statement
      };
    });
    const firstLongQuestionNumber = Math.max(pattern.firstLongQuestionNumber, pattern.firstShortQuestionNumber + shortGroups.length);
    const longPartMarks = Array.isArray(pattern.longPartMarks) && pattern.longPartMarks.length === pattern.longPartsPerQuestion
      ? pattern.longPartMarks.map(Number)
      : null;
    const longMarksOverride = choices.long && Number.isFinite(Number(choices.long.marksEach)) && Number(choices.long.marksEach) > 0
      ? Number(choices.long.marksEach)
      : null;
    // Physics: board question i is (a) long prompt i + (b) numerical i, in
    // list order. A long prompt without a numerical partner stays an
    // incomplete single-part board question; extra numericals print in the
    // separate Numericals section instead.
    const pairedAsLongPartB = Boolean(pattern.longSecondPartIsNumerical);
    const pairCount = pairedAsLongPartB ? Math.min(longPrompts.length, numericalItems.length) : 0;
    const longPartGroups = pairedAsLongPartB
      ? longPrompts.map((item, index) => (index < pairCount ? [item, numericalItems[index]] : [item]))
      : chunk(longPrompts, pattern.longPartsPerQuestion);
    const longQuestions = longPartGroups.map((parts, index) => {
      const questionNumber = firstLongQuestionNumber + index;
      return {
        number: questionNumber,
        label: `Q.${questionNumber}`,
        parts: parts.map((item, partIndex) => ({
          label: pattern.longPartsPerQuestion === 1 ? "" : longPartLabel(partIndex),
          marks: longMarksOverride ? null : (longPartMarks ? longPartMarks[partIndex] : null),
          item
        })),
        complete: parts.length === pattern.longPartsPerQuestion,
        compulsory: pattern.compulsoryLongNumber != null && questionNumber === Number(pattern.compulsoryLongNumber),
        marks: longMarksOverride != null ? longMarksOverride : longMarksPerQuestion(pattern)
      };
    });
    const incompleteLongPrompts = pairedAsLongPartB
      ? longPrompts.length - pairCount
      : longPrompts.length % pattern.longPartsPerQuestion;
    // Numericals print after Long as their own section, one question number
    // each, numbered on from the last long question so no number collides.
    // Each is a single whole question (no parts), at the pattern's
    // per-numerical mark. Numericals already paired as a long part (b) never
    // print here as well.
    const unpairedNumericalItems = pairedAsLongPartB ? numericalItems.slice(pairCount) : numericalItems;
    const firstNumericalQuestionNumber = firstLongQuestionNumber + longQuestions.length;
    const numericalQuestions = unpairedNumericalItems.map((item, index) => ({
      number: firstNumericalQuestionNumber + index,
      label: `Q.${firstNumericalQuestionNumber + index}`,
      item,
      marks: Number(pattern.numericalMarks)
    }));
    const longAttemptValue = choices.long ? Number(choices.long.attempt) : NaN;
    const attemptedLongCount = Number.isSafeInteger(longAttemptValue) && longAttemptValue >= 1
      ? Math.min(longAttemptValue, longQuestions.filter((item) => item.complete).length)
      : Math.min(pattern.longAttemptCount, longQuestions.filter((item) => item.complete).length);
    const marks = calculateMarks(pattern, { mcq, short: shortPrompts, long: longPrompts, numerical: numericalItems }, choices);
    const completeLongQuestions = longQuestions.filter((item) => item.complete);
    const longEach = longMarksOverride != null ? longMarksOverride : longMarksPerQuestion(pattern);
    const longStatement = {
      attempt: attemptedLongCount,
      candidates: completeLongQuestions.length,
      marksEach: longEach,
      totalMarks: attemptedLongCount * longEach,
      groups: rebaseLongGroups(pattern, firstLongQuestionNumber),
      statement: choices.long && typeof choices.long.statement === "string" && choices.long.statement.trim()
        ? substituteStatementPlaceholders(choices.long.statement.trim(), {
          offered: completeLongQuestions.length,
          attempt: attemptedLongCount,
          marks: longEach,
          total: attemptedLongCount * longEach,
          first: longQuestions.length ? longQuestions[0].number : firstLongQuestionNumber,
          last: completeLongQuestions.length ? completeLongQuestions[completeLongQuestions.length - 1].number : firstLongQuestionNumber
        })
        : null
    };

    return {
      mcq,
      shortGroups,
      longQuestions,
      numericalQuestions,
      firstNumericalQuestionNumber,
      incompleteLongPrompts,
      attemptedLongCount,
      marks,
      longStatement,
      totalQuestions: mcq.length + shortPrompts.length + longPrompts.length + numericalItems.length,
      hasCompulsoryQ9: longQuestions.some((item) => item.compulsory && item.complete)
    };
  }

  function answerTextFor(question, language, index) {
    const answer = String(question.answer == null ? "" : question.answer).trim().toUpperCase();
    const optionIndex = "ABCD".indexOf(answer);
    if (optionIndex < 0) return null;
    const options = language === "urdu" ? question.options_ur : question.options;
    return Array.isArray(options) && options[optionIndex] != null ? String(options[optionIndex]) : null;
  }

  function workedSolutionFor(item) {
    const source = item && item.question ? item.question : {};
    // The owner's full worked-solution output is authorised for the 10th
    // Mathematics bank only. Other banks keep their established key behaviour.
    if (!item || item.bankId !== "10th-math-urdu") return { english: "", urdu: "" };
    return {
      english: String(source.solution_en != null ? source.solution_en : source.a == null ? "" : source.a),
      urdu: String(source.solution_ur != null ? source.solution_ur : source.a_ur == null ? "" : source.a_ur)
    };
  }

  function buildAnswerKey(selected, medium, layout) {
    const questions = selected || {};
    const mode = medium || "english";
    const mcqs = Array.isArray(questions.mcq) ? questions.mcq : [];
    const shorts = Array.isArray(questions.short) ? questions.short : [];
    const longs = Array.isArray(questions.long) ? questions.long : [];
    const numericals = Array.isArray(questions.numerical) ? questions.numerical : [];
    const solutionAvailable = (solution) => Boolean(mode === "bilingual"
      ? solution.english.trim() && solution.urdu.trim()
      : mode === "urdu" ? solution.urdu.trim() : solution.english.trim());
    const promptFor = (item) => ({
      english: item.promptEn || (item.question && item.question.q) || "",
      urdu: item.promptUr || (item.question && item.question.q_ur) || ""
    });
    const entries = mcqs.map((item, index) => {
      const question = item.question || {};
      const letter = String(question.answer == null ? "" : question.answer).trim().toUpperCase();
      const optionIndex = "ABCD".indexOf(letter);
      const english = optionIndex >= 0 && Array.isArray(question.options) ? question.options[optionIndex] : null;
      const urdu = optionIndex >= 0 && Array.isArray(question.options_ur) ? question.options_ur[optionIndex] : null;
      const answerAvailable = Boolean(letter && (mode === "english" ? english : mode === "urdu" ? urdu : english && urdu));
      const solution = workedSolutionFor(item);
      return {
        type: "mcq",
        number: index + 1,
        item,
        prompt: promptFor(item),
        answerAvailable,
        correctAnswer: answerAvailable ? {
          letter,
          english: english == null ? "" : String(english),
          urdu: urdu == null ? "" : String(urdu)
        } : null,
        solution,
        solutionAvailable: solutionAvailable(solution),
        markingNote: answerAvailable ? "" : "No keyed answer was supplied with this question bank."
      };
    });
    const writtenEntry = (item, type, label, number) => {
      const solution = workedSolutionFor(item);
      const available = solutionAvailable(solution);
      return {
        type,
        number,
        label: label || null,
        item,
        prompt: promptFor(item),
        answerAvailable: available,
        correctAnswer: null,
        solution,
        solutionAvailable: available,
        markingNote: available ? "" : "No keyed answer was supplied with this question bank."
      };
    };
    const writtenEntries = (items, type, offset) => items.map((item, index) => writtenEntry(item, type, null, offset + index + 1));

    // With a layout, key entries carry the paper's own labels (Q.2(i),
    // Q.5(a), …) in printed order, so a teacher never has to map a bare
    // 1–27 / 1–10 list back onto the paper. Without one, the old sequential
    // numbering stays as the fallback.
    let shortKey = writtenEntries(shorts, "short", 0);
    let longKey = writtenEntries(longs, "long", 0);
    let numericalKey = writtenEntries(numericals, "numerical", 0);
    if (layout && Array.isArray(layout.shortGroups)) {
      let number = 0;
      shortKey = layout.shortGroups.flatMap((group) => group.parts.map((part) => writtenEntry(part.item, "short", `Q.${group.number}(${part.label})`, ++number)));
    }
    if (layout && Array.isArray(layout.longQuestions)) {
      let number = 0;
      longKey = layout.longQuestions.flatMap((question) => question.parts.map((part) => writtenEntry(part.item, "long", part.label ? `Q.${question.number}(${part.label})` : `Q.${question.number}`, ++number)));
    }
    if (layout && Array.isArray(layout.numericalQuestions)) {
      let number = 0;
      numericalKey = layout.numericalQuestions.map((question) => writtenEntry(question.item, "numerical", `Q.${question.number}`, ++number));
    }

    return {
      mcq: entries,
      short: shortKey,
      long: longKey,
      numerical: numericalKey
    };
  }

  const api = {
    DEFAULT_BOARD_PATTERN,
    SUBJECT_PATTERNS,
    patternForSubject,
    longMarksPerQuestion,
    ROMAN_PARTS,
    normalizePattern,
    validatePatternInputs,
    getRequiredSelectionCounts,
    calculateMarks,
    chunk,
    longPartLabel,
    rebaseLongGroups,
    substituteStatementPlaceholders,
    moveArrayEntry,
    dropArrayEntry,
    buildBoardLayout,
    answerTextFor,
    buildAnswerKey
  };

  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.boardPaper = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
