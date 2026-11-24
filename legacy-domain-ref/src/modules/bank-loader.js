(function (root) {
  "use strict";

  const validationApi = () => root.PaperBuilder.validation;

  function asIssue(path, message) {
    return { severity: "error", path, message };
  }

  async function readJsonResponse(response, label) {
    if (!response.ok) throw new Error(`${label} could not be loaded (HTTP ${response.status}).`);
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`${label} is not valid JSON: ${error.message}`);
    }
  }

  // Flaky connections (weak mobile data) drop fetches at random;
  // a single dropped fetch used to brick the bank until a manual reload.
  // Retry the JSON loads a few times before giving up.
  // NOTE (2026-10-21, speed fix): these fetches used to force
  // `cache: "no-store"`, a leftover from the free-tunnel era when a stale
  // bank was a real risk. On Cloudflare Pages the bank is served with an
  // ETag and must-revalidate, so a plain fetch revalidates cheaply (304,
  // no body) and repeat visits no longer re-download the whole 1.06 MB file.
  async function fetchJsonWithRetry(fetchImpl, url, label, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetchImpl(url);
        return await readJsonResponse(response, label);
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
        }
      }
    }
    throw lastError;
  }

  // A figure HEAD that hangs forever must not hold the whole bank hostage:
  // cap each check, after which the existing catch records it as a warning.
  async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function checkHttpFigures(bankData, entryUrl, fetchImpl) {
    const analysis = validationApi().validateBank(bankData, "figure-check");
    const figureAssets = {};
    const warnings = [];

    await Promise.all(analysis.figureReferences.map(async (reference) => {
      const url = new URL(reference, entryUrl).href;
      try {
        const response = await fetchWithTimeout(fetchImpl, url, { method: "HEAD" }, 10000);
        if (response.ok) {
          figureAssets[reference] = { available: true, url };
        } else {
          figureAssets[reference] = { available: false, url: null };
          warnings.push({
            severity: "warning",
            path: `figures/${reference}`,
            message: `Referenced illustration was not supplied (HTTP ${response.status}).`
          });
        }
      } catch (error) {
        figureAssets[reference] = { available: false, url: null };
        warnings.push({
          severity: "warning",
          path: `figures/${reference}`,
          message: "Referenced illustration could not be found beside the bank file."
        });
      }
    }));

    return { figureAssets, warnings };
  }

  function failedBankRecord(entry, errors) {
    return {
      id: entry && entry.id ? entry.id : "unknown-bank",
      entry: entry || {},
      data: null,
      fileUrl: null,
      validation: {
        ok: false,
        errors,
        warnings: [],
        counts: { mcq: 0, short: 0, long: 0, numerical: 0, total: 0 },
        units: [],
        figureReferences: []
      },
      figureAssets: {},
      figureWarnings: []
    };
  }

  async function loadFromHttp(options) {
    const settings = options || {};
    const fetchImpl = settings.fetchImpl || root.fetch.bind(root);
    const manifestPath = settings.manifestPath || "data/banks.json";
    const baseUrl = settings.baseUrl || (root.location && root.location.href);
    if (!baseUrl) throw new Error("A browser base URL is required to load the static manifest.");
    const manifestUrl = new URL(manifestPath, baseUrl).href;
    const manifest = await fetchJsonWithRetry(fetchImpl, manifestUrl, "Bank manifest");
    const manifestValidation = validationApi().validateManifest(manifest);

    if (!manifestValidation.ok) {
      return { manifest, manifestValidation, banks: [], source: "http" };
    }

    const banks = await Promise.all(manifest.banks.map(async (entry) => {
      const entryUrl = new URL(entry.file, manifestUrl).href;
      try {
        const data = await fetchJsonWithRetry(fetchImpl, entryUrl, `Bank ${entry.id}`);
        const bankValidation = validationApi().validateBank(data, entry.id);
        const record = {
          id: entry.id,
          entry,
          data,
          fileUrl: entryUrl,
          validation: bankValidation,
          figureAssets: {},
          figureWarnings: []
        };
        // SPEED (2026-10-21): figure availability used to gate the whole
        // bank load — 39 HEAD round-trips before the user could start.
        // The checks now run in the background; the caller refreshes the
        // status note and any visible question list when figuresReady
        // resolves. Until then a figure question simply has no figureAsset,
        // exactly as if its figure were missing — never a broken image.
        record.figuresReady = checkHttpFigures(data, entryUrl, fetchImpl)
          .then(({ figureAssets, warnings }) => {
            record.figureAssets = figureAssets;
            record.figureWarnings = warnings;
            return record;
          })
          .catch(() => record);
        return record;
      } catch (error) {
        return failedBankRecord(entry, [asIssue(entry.file, error.message)]);
      }
    }));

    return { manifest, manifestValidation, banks, source: "http" };
  }

  function normalizeFilePath(path) {
    return String(path || "").replace(/\\/g, "/").replace(/^\/+/, "");
  }

  function joinPath(folder, relativePath) {
    const parts = `${folder}/${relativePath}`.split("/").filter((part) => part && part !== ".");
    const result = [];
    for (const part of parts) {
      if (part === "..") {
        if (!result.length) return null;
        result.pop();
      } else {
        result.push(part);
      }
    }
    return result.join("/");
  }

  async function loadFromDirectory(fileList) {
    const files = Array.from(fileList || []);
    const fileByPath = new Map();
    const candidates = [];

    files.forEach((file) => {
      const path = normalizeFilePath(file.webkitRelativePath || file.name);
      fileByPath.set(path, file);
      if (path === "banks.json" || path.endsWith("/banks.json")) candidates.push(path);
    });

    const manifestPath = candidates.find((path) => path.endsWith("/data/banks.json")) || candidates[0];
    if (!manifestPath) {
      const manifestValidation = {
        ok: false,
        errors: [asIssue("manifest", "Select a folder that contains data/banks.json.")],
        warnings: []
      };
      return { manifest: null, manifestValidation, banks: [], source: "directory" };
    }

    let manifest;
    try {
      manifest = JSON.parse(await fileByPath.get(manifestPath).text());
    } catch (error) {
      const manifestValidation = {
        ok: false,
        errors: [asIssue(manifestPath, `Manifest is not valid JSON: ${error.message}`)],
        warnings: []
      };
      return { manifest: null, manifestValidation, banks: [], source: "directory" };
    }

    const manifestValidation = validationApi().validateManifest(manifest);
    if (!manifestValidation.ok) {
      return { manifest, manifestValidation, banks: [], source: "directory" };
    }

    const manifestFolder = manifestPath.split("/").slice(0, -1).join("/");
    const createdObjectUrls = [];
    const banks = await Promise.all(manifest.banks.map(async (entry) => {
      const bankPath = joinPath(manifestFolder, entry.file);
      const file = bankPath && fileByPath.get(bankPath);
      if (!file) return failedBankRecord(entry, [asIssue(entry.file, `File ${entry.file} was not found in the selected data folder.`)]);

      try {
        const data = JSON.parse(await file.text());
        const bankValidation = validationApi().validateBank(data, entry.id);
        const figureAssets = {};
        const figureWarnings = [];
        bankValidation.figureReferences.forEach((reference) => {
          const figurePath = joinPath(bankPath.split("/").slice(0, -1).join("/"), reference);
          const figureFile = figurePath && fileByPath.get(figurePath);
          if (figureFile) {
            const url = URL.createObjectURL(figureFile);
            createdObjectUrls.push(url);
            figureAssets[reference] = { available: true, url };
          } else {
            figureAssets[reference] = { available: false, url: null };
            figureWarnings.push({
              severity: "warning",
              path: `figures/${reference}`,
              message: "Referenced illustration was not supplied beside the bank file."
            });
          }
        });

        return {
          id: entry.id,
          entry,
          data,
          fileUrl: bankPath,
          validation: bankValidation,
          figureAssets,
          figureWarnings
        };
      } catch (error) {
        return failedBankRecord(entry, [asIssue(entry.file, `Bank is not valid JSON: ${error.message}`)]);
      }
    }));

    return { manifest, manifestValidation, banks, source: "directory", createdObjectUrls };
  }

  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.bankLoader = { loadFromHttp, loadFromDirectory };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.PaperBuilder.bankLoader;
  }
})(typeof window !== "undefined" ? window : globalThis);
