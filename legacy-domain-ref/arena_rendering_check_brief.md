# PaperBuilder — Urdu rendering check (Arena brief)

## Live code
- Site: https://test-paper-generator.pages.dev
- Repo: MAhmad55/test-paper-generator, branch: arena/8751ff19-test-paper-generator
- Fix commit: 9b41296 (sirf src/app.js, 12 lines)

## Defect (kya ghalat tha)
Urdu sawal jo math par khatam hota hai + aakhir me "۔" (Urdu full stop):
RTL me "۔" equation ke bilkul saath chipak jata tha aur minus jaisa lagta tha.
- 10th Ch1 n=31 (Short): "z + 0 = z" screen par "−z + 0 = z" lagta tha
- 10th Ch1 n=36 (Short): "|z| = |z̄|" screen par "−|z| = |z̄|" lagta tha
- Data me koi ghalti nahi thi (DOM me minus maujood hi nahi tha) — sirf display ka masla tha.
- Scale: 10th bank me 10 records, 9th bank me 95 records isi tarah math + "۔" par khatam hote hain.

## Fix (kya badla)
- src/app.js, shared renderer `renderMathSpans` me: jo "۔" aakhri inline math ke foran baad aaye, wo display par drop hoti hai.
- Bank data files ko haath nahi laga. Tests 54/54.

## Checklist (ye verify karo)
1. Selection list (step 4), Urdu medium, 10th Ch1: n=31 aur n=36 saaf nazar aayen — equation ke aage koi minus jaisi nishan na ho.
2. Baqi math-final records bhi spot-check karo (10th ke 10, 9th ke chand) — list me bhi, paper preview (step 7) me bhi, print me bhi.
3. Control: jo sawal Urdu lafzon par khatam hote hain (masalan n=34 "معلوم کیجیے۔") un me "۔" waisi hi nazar aani chahiye — wo nahi hatni chahiye.
4. English medium me kuch na badla ho.
5. Phone width (390px) par koi overflow ya cut-off na aaya ho.
6. Bank JSON data files me koi change na ho (fix display-only hai).

## Boundaries
- Bank data mat chherna — display ka masla display me hi hal hota hai.
- Koi push/deploy mat karna. Sirf check karo aur report do.
- Agar naye rendering defects milen to unhe alag list me do (record number + screenshot ke saath), data issues se mix mat karo.

## Report format
Har checklist item: PASS ya FAIL + saboot (screenshot ya row reference).
