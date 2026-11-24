(function (root) {
  "use strict";

  const PRINT_TARGETS = new Set(["student", "answer-key"]);
  const URDU_PRINT_FONT = '400 12px "Jameel Noori Nastaleeq"';

  function printFontsReady(doc) {
    const fonts = doc && doc.fonts;
    if (!fonts) return null;
    const pending = [];
    // Explicitly load the large Urdu font before opening the print dialog.
    // Screen preview can already look correct while a quick print still uses
    // the fallback Arabic font if the font fetch has not completed.
    if (typeof fonts.load === "function") pending.push(fonts.load(URDU_PRINT_FONT, "اردو"));
    if (fonts.ready) pending.push(fonts.ready);
    if (!pending.length) return null;
    // A failed font must not permanently disable printing; the preload and
    // explicit load make the normal path deterministic.
    return Promise.all(pending).catch(() => undefined);
  }

  function setPrintTarget(target, documentRef) {
    if (!PRINT_TARGETS.has(target)) throw new RangeError(`Unsupported print target: ${target}`);
    const doc = documentRef || root.document;
    if (!doc || !doc.body) throw new Error("Printing is only available in a browser document.");
    doc.body.dataset.printTarget = target;
  }

  function clearPrintTarget(documentRef) {
    const doc = documentRef || root.document;
    if (doc && doc.body) delete doc.body.dataset.printTarget;
  }

  function printTarget(target, options) {
    const settings = options || {};
    const doc = settings.documentRef || root.document;
    const windowRef = settings.windowRef || root;
    if (!PRINT_TARGETS.has(target)) throw new RangeError(`Unsupported print target: ${target}`);
    if (!doc || !doc.body || !windowRef || typeof windowRef.print !== "function") {
      throw new Error("This browser does not support printing.");
    }

    setPrintTarget(target, doc);
    const clear = () => clearPrintTarget(doc);
    if (typeof windowRef.addEventListener === "function") {
      windowRef.addEventListener("afterprint", clear, { once: true });
    }
    const fontsReady = printFontsReady(doc);
    if (fontsReady) {
      return fontsReady.then(() => {
        // Give the browser one painted frame with the loaded font before the
        // print renderer captures the paper.
        if (typeof windowRef.requestAnimationFrame === "function") {
          return new Promise((resolve) => {
            windowRef.requestAnimationFrame(() => {
              try {
                windowRef.print();
              } finally {
                resolve();
              }
            });
          });
        }
        windowRef.print();
      });
    }
    windowRef.print();
    return undefined;
  }

  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.printing = { PRINT_TARGETS, setPrintTarget, clearPrintTarget, printTarget };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.PaperBuilder.printing;
  }
})(typeof window !== "undefined" ? window : globalThis);
