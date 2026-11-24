(function (root) {
  "use strict";

  const TYPE_DEFINITIONS = [
    { key: "mcq", sourceKey: "mcqs" },
    { key: "short", sourceKey: "short" },
    { key: "long", sourceKey: "long" },
    // Numericals are a fourth selectable section (same record shape as short).
    // They are optional: a unit without numericals[] is valid, and a missing
    // requested count means 0 (the board pattern has no numerical group).
    { key: "numerical", sourceKey: "numericals", optional: true }
  ];

  class SelectionError extends Error {
    constructor(message, details) {
      super(message);
      this.name = "SelectionError";
      this.details = details || [];
    }
  }

  function secureRandomIndex(maximum) {
    const cryptoApi = root.crypto;
    if (cryptoApi && typeof cryptoApi.getRandomValues === "function" && maximum <= 0x100000000) {
      const range = 0x100000000;
      const limit = range - (range % maximum);
      const value = new Uint32Array(1);
      let sample;
      do {
        cryptoApi.getRandomValues(value);
        sample = value[0];
      } while (sample >= limit);
      return sample % maximum;
    }
    return Math.floor(Math.random() * maximum);
  }

  function randomIndex(maximum, randomSource) {
    if (typeof randomSource !== "function") return secureRandomIndex(maximum);
    const value = Number(randomSource());
    if (!Number.isFinite(value)) throw new TypeError("Random source must return a finite number.");
    const normalized = Math.min(Math.max(value, 0), 1 - Number.EPSILON);
    return Math.floor(normalized * maximum);
  }

  function shuffleCopy(values, randomSource) {
    const shuffled = values.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1, randomSource);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function sourceIdentity(bankId, unitNumber, type, question) {
    if (Object.prototype.hasOwnProperty.call(question, "id")) {
      return `${bankId}::id:${String(question.id)}`;
    }
    return `${bankId}::unit:${String(unitNumber)}::type:${type}::n:${String(question.n)}`;
  }

  function getPools(bank, bankId, selectedUnitIds, figureAssets, topicFilter) {
    const selected = new Set(Array.from(selectedUnitIds || [], (unitId) => String(unitId)));
    const pools = { mcq: [], short: [], long: [], numerical: [] };

    (bank.units || []).forEach((unit) => {
      const unitId = String(unit.unit);
      if (!selected.has(unitId)) return;
      const topicSet = topicFilter && topicFilter[unitId] instanceof Set ? topicFilter[unitId] : null;

      TYPE_DEFINITIONS.forEach((type) => {
        (Array.isArray(unit[type.sourceKey]) ? unit[type.sourceKey] : []).forEach((question) => {
          if (topicSet && question && typeof question.topic === "string" && !topicSet.has(question.topic)) return;
          pools[type.key].push({
            id: sourceIdentity(bankId, unit.unit, type.key, question),
            bankId,
            unitNumber: unit.unit,
            unitTitle: unit.title,
            type: type.key,
            sourceNumber: question.n,
            sourceId: Object.prototype.hasOwnProperty.call(question, "id") ? question.id : null,
            question,
            figureAsset: question.fig ? (figureAssets || {})[question.fig] || null : null,
            solutionFigureAsset: question.solution_fig ? (figureAssets || {})[question.solution_fig] || null : null
          });
        });
      });
    });

    return pools;
  }

  function getQuestionPool(bank, bankId, selectedUnitIds, figureAssets, topicFilter) {
    return getPools(bank, bankId, selectedUnitIds, figureAssets, topicFilter);
  }

  function getAvailableInventory(bank, selectedUnitIds, topicFilter) {
    const pools = getPools(bank, "inventory", selectedUnitIds, null, topicFilter);
    return {
      mcq: pools.mcq.length,
      short: pools.short.length,
      long: pools.long.length,
      numerical: pools.numerical.length
    };
  }

  function validateRequestedCounts(counts) {
    const errors = [];
    TYPE_DEFINITIONS.forEach(({ key, optional }) => {
      const count = counts && counts[key];
      // An optional type (numericals) may simply be absent: not requested.
      if (count == null && optional) return;
      if (!Number.isSafeInteger(count) || count < 0) {
        errors.push(`${key} count must be a non-negative whole number.`);
      }
    });
    return errors;
  }

  function selectQuestions(bank, bankId, selectedUnitIds, counts, options) {
    const settings = options || {};
    const selected = Array.from(selectedUnitIds || [], (unitId) => String(unitId));
    if (selected.length === 0) throw new SelectionError("Select at least one unit before generating a paper.");

    const countErrors = validateRequestedCounts(counts);
    if (countErrors.length) throw new SelectionError(`Question counts are invalid. ${countErrors.join(" ")}`, countErrors);

    // An absent optional count (numericals) is 0, never "select them all":
    // slice(0, undefined) would return the whole pool.
    const wanted = {};
    TYPE_DEFINITIONS.forEach(({ key, optional }) => {
      wanted[key] = counts[key] == null && optional ? 0 : counts[key];
    });

    const pools = getPools(bank, bankId, selected, settings.figureAssets, settings.topicFilter);
    const availability = {
      mcq: pools.mcq.length,
      short: pools.short.length,
      long: pools.long.length,
      numerical: pools.numerical.length
    };
    const shortages = TYPE_DEFINITIONS
      .filter(({ key }) => wanted[key] > availability[key])
      .map(({ key }) => ({ type: key, requested: wanted[key], available: availability[key] }));

    if (shortages.length) {
      const details = shortages.map(({ type, requested, available }) => `${type}: requested ${requested}, only ${available} available`).join("; ");
      throw new SelectionError(`Not enough questions in the selected units. ${details}. Select more units or lower the requested counts.`, shortages);
    }

    const questions = { mcq: [], short: [], long: [], numerical: [] };
    const seenIds = new Set();

    TYPE_DEFINITIONS.forEach(({ key }) => {
      questions[key] = shuffleCopy(pools[key], settings.randomSource).slice(0, wanted[key]);
      questions[key].forEach((question) => {
        if (seenIds.has(question.id)) {
          throw new SelectionError(`The bank contains a duplicate question identity: ${question.id}. Fix the bank before generating.`);
        }
        seenIds.add(question.id);
      });
    });

    return {
      bankId,
      selectedUnitIds: selected,
      questions,
      availability,
      questionIds: Array.from(seenIds)
    };
  }

  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.questionSelection = {
    TYPE_DEFINITIONS,
    SelectionError,
    shuffleCopy,
    getQuestionPool,
    getAvailableInventory,
    selectQuestions
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.PaperBuilder.questionSelection;
  }
})(typeof window !== "undefined" ? window : globalThis);
