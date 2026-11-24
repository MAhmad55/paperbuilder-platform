(function (root) {
  "use strict";

  const COMMANDS = Object.freeze({
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", theta: "θ", lambda: "λ", mu: "μ", pi: "π", sigma: "σ", phi: "φ", omega: "ω",
    Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
    times: "×", cdot: "·", div: "÷", pm: "±", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠",
    approx: "≈", infty: "∞", degree: "°", angle: "∠", therefore: "∴", because: "∵", in: "∈", notin: "∉", cup: "∪", cap: "∩", emptyset: "∅",
    to: "→", rightarrow: "→", leftarrow: "←", iff: "⇔", subset: "⊂", subseteq: "⊆", parallel: "∥", perp: "⊥", sum: "∑", int: "∫", circ: "°"
  });

  const SUPERSCRIPTS = Object.freeze({
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ⁱ", j: "ʲ", k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ", t: "ᵗ", u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ", "/": "⁄", " ": ""
  });
  const SUBSCRIPTS = Object.freeze({
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ", "/": "⁄", " ": ""
  });

  function mapScript(value, table) {
    return Array.from(String(value)).map((character) => table[character] || character).join("");
  }

  // Fractions are emitted as LaTeX \frac{}{} so the display layer can render
  // them as proper stacked fractions via KaTeX (vertical, horizontal bar).
  // Private-use markers survive all text processing; converted to \frac at the end.
  const FRAC_O = "\uE000", FRAC_S = "\uE001", FRAC_C = "\uE002";
  function toFraction(num, den) {
    return FRAC_O + num + FRAC_S + den + FRAC_C;
  }
  // Reverse map: superscript digits -> regular digits (for ¹/⁹ style fractions in bank)
  const UNSUPER = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  function unsup(s) { return String(s).split("").map(c => UNSUPER[c] || c).join(""); }

  // Parses a balanced-brace group starting at index i (where text[i] === '{').
  // Returns [content, indexAfterClosingBrace] or null.
  function readBraceGroup(text, i) {
    if (text[i] !== "{") return null;
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") {
        depth--;
        if (depth === 0) return [text.slice(i + 1, j), j + 1];
      }
    }
    return null;
  }

  function normalizeTex(input) {
    let text = String(input == null ? "" : input);
    // Stash $...$ / $$...$$ math spans FIRST so the Unicode rewrite pipeline
    // cannot mangle nested LaTeX (e.g. ^{-\frac{3}{4}}). Restored at the end
    // as \uE014 markers for direct KaTeX rendering by the display layer.
    const stashedMath = [];
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
      stashedMath.push({ latex, display: true });
      return "\uE012" + (stashedMath.length - 1) + "\uE013";
    });
    text = text.replace(/\$([^$]+?)\$/g, (_, latex) => {
      stashedMath.push({ latex, display: false });
      return "\uE012" + (stashedMath.length - 1) + "\uE013";
    });
    text = text.replace(/\\(?:\(|\)|\[|\])/g, "");
    // Fractions: simple numeric \frac{a}{b} -> fraction marker; complex ones
    // (nested braces like \sqrt, ^, _) are stashed verbatim as placeholders so
    // later Unicode rewrites cannot mangle them; restored as \frac{}{} at the
    // end for KaTeX rendering by the display layer.
    const stashedFracs = [];
    (function stashFractions() {
      const re = /\\(?:dfrac|tfrac|frac)\s*\{/g;
      let out = "", last = 0, m;
      while ((m = re.exec(text)) !== null) {
        const braceStart = m[0].lastIndexOf("{");
        const r1 = readBraceGroup(text, m.index + braceStart);
        if (!r1) continue;
        let k = r1[1];
        while (k < text.length && /\s/.test(text[k])) k++;
        const r2 = readBraceGroup(text, k);
        if (!r2) continue;
        const a = r1[0], b = r2[0];
        let replacement;
        if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
          replacement = toFraction(a, b);
        } else if (!/[\\^_{}]/.test(a) && !/[\\^_{}]/.test(b)) {
          replacement = toFraction(normalizeTex(a), normalizeTex(b));
        } else {
          stashedFracs.push("\\frac{" + a + "}{" + b + "}");
          replacement = "\uE010" + (stashedFracs.length - 1) + "\uE011";
        }
        out += text.slice(last, m.index) + replacement;
        last = r2[1];
        re.lastIndex = last;
      }
      if (last > 0) text = out + text.slice(last);
    })();
    text = text.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
    text = text.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
    text = text.replace(/\\overline\s*\{([^{}]*)\}/g, (_, value) => Array.from(value).map((character) => `${character}\u0305`).join(""));
    text = text.replace(/\\(?:left|right)\b/g, "");
    text = text.replace(/\\(?:,|;|:|!|quad\b|qquad\b|enspace\b)/g, " ");
    text = text.replace(/\\([A-Za-z]+)\b/g, (whole, name) => Object.prototype.hasOwnProperty.call(COMMANDS, name) ? COMMANDS[name] : name);
    text = text.replace(/\\([{}%_#$&])/g, "$1");
    text = text.replace(/\^\s*°/g, "°");
    text = text.replace(/\\/g, "");
    text = text.replace(/\$\$?([^$]*)\$\$?/g, "$1");
    text = text.replace(/(\d)sqrt\s*\(/gi, "$1√(");
    text = text.replace(/(\d)sqrt\s*\[/gi, "$1√[");
    text = text.replace(/\bsqrt\s*\(([^()]+)\)/gi, "√($1)");
    text = text.replace(/\bsqrt\s*\{([^{}]+)\}/gi, "√($1)");
    text = text.replace(/\bsqrt\s*\[([^\]]+)\]/gi, "√($1)");
    // Bank uses √[...] directly; normalize to √(...) for consistency.
    text = text.replace(/√\[([^\]]+)\]/g, "√($1)");
    // Pure-math radicand: √(7) -> √7 (drop parens around a simple radicand only)
    text = text.replace(/√\(([0-9a-zA-Zπ∞]+)\)/g, "√$1");
    // Recurring-decimal bar: (0.6-bar) -> 0.6̄ , 0.23-bar -> 0.2̄3̄ (combining overline U+0305)
    text = text.replace(/\(?(\d+)\.(\d+)-bar\)?/g, (_, int, rep) =>
      int + "." + Array.from(rep).map((d) => d + "\u0305").join(""));
    // Real-numbers set: "in R" -> "in ℝ" (NOT R(x) function names or point labels)
    text = text.replace(/\bin\s+R\b/g, "in ℝ");
    // Implication arrows: => -> ⇒ , <=> -> ⇔
    text = text.replace(/<=>/g, "⇔").replace(/=>/g, "⇒");
    text = text.replace(/\bdeg\s*([CF])\b/gi, "°$1");
    text = text.replace(/\bdeg\b/gi, "°");
    text = text.replace(/\bm\s+angle\s+/gi, "m ∠");
    text = text.replace(/\btheta\b/gi, "θ").replace(/\balpha\b/gi, "α").replace(/\bbeta\b/gi, "β").replace(/\bpi\b/gi, "π");
    // Plain-text math shorthands -> pure Unicode math (bank uses these, not LaTeX).
    text = text.replace(/(\d+)(?:st|nd|rd|th)\s+root\s+of\b/gi, (_, n) => mapScript(n, SUPERSCRIPTS) + "√");
    text = text.replace(/(\d+)(?:st|nd|rd|th)-root\b/gi, (_, n) => mapScript(n, SUPERSCRIPTS) + "√");
    text = text.replace(/\bcube-root\s+of\b/gi, "∛");
    text = text.replace(/\bcube-root\s*\(/gi, "∛(");
    text = text.replace(/\bcube-root\s*\[/gi, "∛[");
    text = text.replace(/\bsquare-root\s+of\b/gi, "√");
    text = text.replace(/(\d)pi\b/gi, "$1π");
    text = text.replace(/\binfinity\b/gi, "∞");
    text = text.replace(/([0-9A-Za-z)\]⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉])\s*\*\s*(?=[0-9A-Za-z(√∛π∞θαβγδλμσφωΑΒΓΔΘΛΠΣΦΩ])/g, "$1×");
    text = text.replace(/(\d)\s*x\s*(?=\d)/g, "$1 × ");
    text = text.replace(/\^\{([^{}]+)\}/g, (_, value) => mapScript(value, SUPERSCRIPTS));
    text = text.replace(/\^(-[A-Za-z0-9]+)/g, (_, value) => mapScript(value, SUPERSCRIPTS));
    text = text.replace(/\^\(([^()]*)\)/g, (_, value) => mapScript(value, SUPERSCRIPTS));
    text = text.replace(/\^([A-Za-z0-9]+)\b/g, (_, value) => mapScript(value, SUPERSCRIPTS));
    text = text.replace(/_\{([^{}]+)\}/g, (_, value) => mapScript(value, SUBSCRIPTS));
    text = text.replace(/_([A-Za-z0-9]+)\b/g, (_, value) => mapScript(value, SUBSCRIPTS));
    // Unicode superscript fractions: ¹/⁹ -> \frac{1}{9} (stacked via KaTeX).
    // Bank uses ¹/⁹ style; convert before the (n/d) rules below.
    text = text.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*\/\s*([⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]+)/g,
      (_, n, d) => toFraction(unsup(n), unsup(d)));
    // Pure-math fractions: (81/16) -> ⁸¹⁄₁₆ , 3/4 -> ¾ (vulgar char when available).
    // Runs AFTER ^/_ rules so exponents like ^(-3/4) are already superscripted.
    // A fraction followed by an exponent keeps its parens: (4/9)^3 -> (⁴⁄₉)³
    text = text.replace(/\((\d+)\s*\/\s*(\d+)\)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾⁄₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉]+)/g,
      (_, n, d, exp) => "(" + toFraction(n, d) + ")" + exp);
    text = text.replace(/\(?(\d+)\s*\/\s*(\d+)\)?/g, (_, n, d) => toFraction(n, d));
    text = text.replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/!=/g, "≠").replace(/->/g, "→");
    text = text.replace(/[{}]/g, "").replace(/\\/g, "");
    // Isolate math runs as LTR so √(2) etc. keep their order inside RTL (Urdu) text.
    // Uses Unicode LRI (U+2066) / PDI (U+2069); harmless in LTR English.
    const MATH_RUN = /[0-9a-zA-Z√∛π×÷±≤≥≠≈∞°∠∴∵∈∉∪∩∅→←⇔⇒⊂⊆∥⊥∑∫·⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ⁄₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓαβγδθλμσφωΑΒΓΔΘΛΠΣΦΩℝ̅½¼¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒()[\]{}+\-*/=<>^., ]+/g;
    const HAS_MATH_SYMBOL = /[√∛π×÷±≤≥≠≈∞°∠∴∵∈∉∪∩∅→←⇔⇒⊂⊆∥⊥∑∫·⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾⁄₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎αβγδθλμσφωΑΒΓΔΘΛΠΣΦΩℝ̅½¼¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒=<>+\-^]/;
    text = text.replace(MATH_RUN, (run) => {
      if (!HAS_MATH_SYMBOL.test(run)) return run;
      const left = (run.match(/^\s+/) || [""])[0];
      const right = (run.match(/\s+$/) || [""])[0];
      return `${left}\u2066${run.trim()}\u2069${right}`;
    });
    // Fractions -> KaTeX \\frac{}{} for proper stacked rendering in the display layer.
    text = text.replace(new RegExp(FRAC_O + "([^" + FRAC_S + FRAC_C + "]*)" + FRAC_S + "([^" + FRAC_S + FRAC_C + "]*)" + FRAC_C, "g"),
      (_, a, b) => "\\frac{" + a + "}{" + b + "}");
    // Restore complex fractions stashed verbatim at the start.
    text = text.replace(/\uE010(\d+)\uE011/g, (_, i) => stashedFracs[Number(i)] || "");
    // Restore $...$ math spans as KaTeX markers for the display layer:
    // \uE014...\uE015 inline, \uE016...\uE017 display.
    text = text.replace(/\uE012(\d+)\uE013/g, (_, i) => {
      const entry = stashedMath[Number(i)];
      if (!entry) return "";
      return (entry.display ? "\uE016" : "\uE014") + entry.latex + (entry.display ? "\uE017" : "\uE015");
    });
    return text.replace(/[ \t]+/g, " ").trim();
  }

  const api = { COMMANDS, normalizeTex, formatQuestionText: normalizeTex };
  root.PaperBuilder = root.PaperBuilder || {};
  root.PaperBuilder.mathFormat = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
