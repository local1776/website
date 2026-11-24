# Tests and build notes

Nothing in this folder is loaded by the calculator. Since Nov 22 2026 the calculator lives at www.local1776.org/agr-calculator:
its content and scripts are `site/apps/agr-calculator.html`, its styles `site/apps/agr-calculator.css`. Where these notes say
`index.html`, use `site/apps/agr-calculator.html` (e.g. `node tools/agr/tests/engine_test.js site/apps/agr-calculator.html`).

- `engine_test.js`: runs the math in Node across seven member profiles and sweeps the data for gaps. `node tests/engine_test.js index.html`
- `lifetime_test.js`: prints the Bottom Line ledger (working years, retirement, all in) for the baseline profiles and checks it against the retirement card.
- `sweep.js`: runs one member through every duty location in the country.
- `ui_test.py`, `print_test.py`, `print_gap.py`: headless Chrome checks of the page and of the Print / Save as PDF output (Playwright). Since 1.3 the form has no defaults, so these scripts answer every question before they press the button.
- `og_card.html`: source for `og.png`, the share-preview image.
- `territory_test.py`: browser check of Puerto Rico, Guam and the U.S. Virgin Islands.
- `build-v1.3/`: the scripts that turned version 1.2 into version 1.3, in order (a to n; there is no m), and the checks used along the way. Run in order on the 1.2 `index.html`, they reproduce the 1.3 file exactly.
  - What 1.3 changed in the math: an orders-cut what-if; the technician runs to the same last day as the AGR path when that is later than Minimum Retirement Age; FERS start ages by law for every length of service, including a frozen annuity; the FERS supplement; an estimate of Social Security; estimated TSP growth; an earlier Guard pension age for qualifying duty since Jan. 28, 2008; BRS matching limited to years 2 through 26; no Guard retired pay while still serving; a partial last AGR year counted as partial; annual training no longer counted twice in retirement points; the 10-year commissioned-service rule for officers.
  - What 1.3 changed on the page: every box is required and nothing is pre-filled; entries that contradict each other are refused; the AGR total is labeled a best case; a "No Active-Duty Retirement" result; "If Your Orders Are Cut"; the prior active-duty chart; the rights scorecard; "This Is the Record, Not a Scare Tactic"; "The Way Back"; optional TSP balance boxes; headlines sized to the lead.
  - Checks: `v13_engine_check.js` (1.2 against 1.3 on the baseline profiles), `v13_form_check_test.py` (required boxes and entries that don't add up), `v13_officer_test.py` (officer boxes), `v13_mechanic_shots.py` and `v13_older_shot.py` (two full member runs in a browser), `v13_age_grid.js`, `v13_sample5000.js` and `v13_sample5000_stress.js` (thousands of members through the engine).
- `build-v1.2/`: the script that fixed territory income tax in version 1.2 (Guam and the Virgin Islands as mirror systems, Puerto Rico with its own schedule and a credit for federal tax).
- `build-v1.1/`: the six scripts that turned version 1.0 into version 1.1, in order (a to f). Kept as a record of exactly what changed.

Rule: any change to the math or the data is run through `engine_test.js` first. Numbers move only when a change is meant to move them.
