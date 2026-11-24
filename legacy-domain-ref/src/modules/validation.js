(function (root) {
  "use strict";

  const TYPE_DEFINITIONS = [
    { key: "mcq", sourceKey: "mcqs", label: "Multiple choice" },
    { key: "short", sourceKey: "short", label: "Short answer" },
    { key: "long", sourceKey: "long", label: "Long answer" },
    // Numericals mirror the short record shape (n, q, q_ur, a, a_ur, source,
    // topic, fig). The array is optional: units without numericals[] stay
    // valid, so older banks validate unchanged.
    { key: "numerical", sourceKey: "numericals", label: "Numerical problems", optional: true }
  ];

  function issue(severity, path, message) {
    return { severity, path, message };
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function normalizeRelativePath(path) {
    if (!isNonEmptyString(path) || path.startsWith("/") || path.includes("\\")) {
      return null;
    }

    const segments = path.split("/").filter((segment) => segment && segment !== ".");
    if (segments.some((segment) => segment === "..")) return null;
    return segments.join("/");
  }

  function validateManifest(manifest) {
    const errors = [];
    const warnings = [];

    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      errors.push(issue("error", "manifest", "Manifest must be a JSON object."));
      return { ok: false, errors, warnings };
    }

    if (manifest.schemaVersion !== 1) {
      errors.push(issue("error", "manifest.schemaVersion", "Expected manifest schemaVersion 1."));
    }

    if (!Array.isArray(manifest.banks) || manifest.banks.length === 0) {
      errors.push(issue("error", "manifest.banks", "Add at least one registered question bank."));
      return { ok: false, errors, warnings };
    }

    const ids = new Set();
    const files = new Set();
    manifest.banks.forEach((entry, index) => {
      const basePath = `manifest.banks[${index}]`;
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        errors.push(issue("error", basePath, "Bank entry must be an object."));
        return;
      }

      if (!isNonEmptyString(entry.id)) {
        errors.push(issue("error", `${basePath}.id`, "Give each bank a stable, non-empty id."));
      } else if (ids.has(entry.id)) {
        errors.push(issue("error", `${basePath}.id`, `Duplicate bank id: ${entry.id}.`));
      } else {
        ids.add(entry.id);
      }

      const safeFile = normalizeRelativePath(entry.file);
      if (!safeFile) {
        errors.push(issue("error", `${basePath}.file`, "Use a safe file path relative to data/banks.json."));
      } else if (files.has(safeFile)) {
        errors.push(issue("error", `${basePath}.file`, `The file ${safeFile} is registered more than once.`));
      } else {
        files.add(safeFile);
      }
    });

    return { ok: errors.length === 0, errors, warnings };
  }

  function validateBank(bank, bankId) {
    const errors = [];
    const warnings = [];
    const counts = { mcq: 0, short: 0, long: 0, numerical: 0, total: 0 };
    const units = [];
    const sourceIds = new Set();

    if (!bank || typeof bank !== "object" || Array.isArray(bank)) {
      errors.push(issue("error", "bank", "Question bank must be a JSON object."));
      return { ok: false, errors, warnings, counts, units, figureReferences: [] };
    }

    if (!(typeof bank.class === "string" || typeof bank.class === "number") || String(bank.class).trim() === "") {
      errors.push(issue("error", "class", "Add the class/grade in bank metadata."));
    }
    if (!isNonEmptyString(bank.subject)) {
      errors.push(issue("error", "subject", "Add the subject in bank metadata."));
    }
    if (!Array.isArray(bank.units) || bank.units.length === 0) {
      errors.push(issue("error", "units", "The bank must contain at least one unit."));
      return { ok: false, errors, warnings, counts, units, figureReferences: [] };
    }

    const unitIds = new Set();
    const figureReferences = new Set();

    bank.units.forEach((unit, unitIndex) => {
      const unitPath = `units[${unitIndex}]`;
      if (!unit || typeof unit !== "object" || Array.isArray(unit)) {
        errors.push(issue("error", unitPath, "Unit must be an object."));
        return;
      }

      const unitNumber = unit.unit;
      const unitKey = String(unitNumber);
      if (!(typeof unitNumber === "string" || typeof unitNumber === "number") || unitKey.trim() === "") {
        errors.push(issue("error", `${unitPath}.unit`, "Add a non-empty unit number or identifier."));
      } else if (unitIds.has(unitKey)) {
        errors.push(issue("error", `${unitPath}.unit`, `Duplicate unit identifier: ${unitKey}.`));
      } else {
        unitIds.add(unitKey);
      }

      if (!isNonEmptyString(unit.title)) {
        errors.push(issue("error", `${unitPath}.title`, "Add a readable unit title."));
      }

      const unitSummary = {
        id: unitKey,
        title: isNonEmptyString(unit.title) ? unit.title : `Unit ${unitKey || unitIndex + 1}`,
        counts: { mcq: 0, short: 0, long: 0, numerical: 0 }
      };

      TYPE_DEFINITIONS.forEach((type) => {
        const records = unit[type.sourceKey];
        const listPath = `${unitPath}.${type.sourceKey}`;
        if (!Array.isArray(records)) {
          // An optional type may be absent entirely; a present non-array is
          // still an error, exactly as for the required types.
          if (type.optional && records === undefined) return;
          errors.push(issue("error", listPath, "Question type must be an array (use [] when this unit has none)."));
          return;
        }

        records.forEach((question, questionIndex) => {
          const questionPath = `${listPath}[${questionIndex}]`;
          if (!question || typeof question !== "object" || Array.isArray(question)) {
            errors.push(issue("error", questionPath, "Question must be an object."));
            return;
          }

          if (!(typeof question.n === "number" && Number.isFinite(question.n) && question.n >= 0) && !isNonEmptyString(question.n)) {
            errors.push(issue("error", `${questionPath}.n`, "Question number n must be a non-negative number or non-empty string."));
          }
          // English text is optional: an Urdu-medium bank is valid on its Urdu text
          // alone (the app only offers English output when records carry English text).
          if (!isNonEmptyString(question.q_ur)) {
            errors.push(issue("error", `${questionPath}.q_ur`, "Urdu question text q_ur is required."));
          }
          if (!isNonEmptyString(question.source)) {
            errors.push(issue("error", `${questionPath}.source`, "Question source is required."));
          }

          if (type.key === "mcq") {
            if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => !isNonEmptyString(option))) {
              errors.push(issue("error", `${questionPath}.options`, "An MCQ must have exactly four non-empty English options."));
            }
            if (!Array.isArray(question.options_ur) || question.options_ur.length !== 4 || question.options_ur.some((option) => !isNonEmptyString(option))) {
              errors.push(issue("error", `${questionPath}.options_ur`, "An MCQ must have exactly four non-empty Urdu options."));
            }
            if (!isNonEmptyString(question.answer) || !/^[A-D]$/i.test(question.answer.trim())) {
              errors.push(issue("error", `${questionPath}.answer`, "MCQ answer must be one of A, B, C, or D."));
            }
          }

          if (Object.prototype.hasOwnProperty.call(question, "id")) {
            if (!(typeof question.id === "string" || typeof question.id === "number") || String(question.id).trim() === "") {
              errors.push(issue("error", `${questionPath}.id`, "If supplied, a question id must be a non-empty string or number."));
            }
          }

          const identityPart = Object.prototype.hasOwnProperty.call(question, "id")
            ? `id:${String(question.id)}`
            : `unit:${unitKey}|type:${type.key}|n:${String(question.n)}`;
          const sourceId = `${String(bankId || "bank")}|${identityPart}`;
          if (sourceIds.has(sourceId)) {
            errors.push(issue("error", `${questionPath}.id`, `Duplicate question identity ${sourceId}.`));
          } else {
            sourceIds.add(sourceId);
          }

          ["fig", "solution_fig"].forEach((figureField) => {
            if (!Object.prototype.hasOwnProperty.call(question, figureField)) return;
            if (!isNonEmptyString(question[figureField])) {
              errors.push(issue("error", `${questionPath}.${figureField}`, "Figure reference must be a non-empty relative path."));
              return;
            }
            const safeFigure = normalizeRelativePath(question[figureField]);
            if (!safeFigure) {
              errors.push(issue("error", `${questionPath}.${figureField}`, "Figure reference must stay inside the bank data folder."));
            } else {
              figureReferences.add(safeFigure);
            }
          });

          unitSummary.counts[type.key] += 1;
          counts[type.key] += 1;
          counts.total += 1;
        });
      });

      units.push(unitSummary);
    });

    if (counts.total === 0) {
      warnings.push(issue("warning", "units", "This bank contains no questions."));
    }

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      counts,
      units,
      figureReferences: Array.from(figureReferences)
    };
  }

  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.validation = { TYPE_DEFINITIONS, validateManifest, validateBank, normalizeRelativePath };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.PaperBuilder.validation;
  }
})(typeof window !== "undefined" ? window : globalThis);
