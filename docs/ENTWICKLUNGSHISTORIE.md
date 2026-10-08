# Spielraum 2 — Monatsplanung

An independent static monthly planning app in German, with device-local state and a private Sites deployment. No external fonts, analytics, API calls or bank connection.

## Product

- Monthly planned income minus every planned expense and savings allocation. No debit-date gating and no separate budget envelope to configure.
- Direct creation of income, expense and savings items; a live form preview displays the remaining amount before saving.
- Monthly, annual (1/12, rounded to cents) and one-off items. All items for the selected month count immediately.
- Direct row editing and deletion with a 14-second undo affordance. Recurring changes/deletions apply from the selected month, preserving earlier months. Single-month changes are available in the editor's optional section.
- Live interactive ring and pie charts; category amounts, savings and free amount. Deficits are shown explicitly and never rendered as negative pie slices.
- Forward-looking 6/12-month planned surplus, a simple what-if calculator, SVG chart export and aggregated analysis export for chat.
- JSON backup/restore, CSV export, separate in-memory example plan, customizable categories and original local-storage safeguards.

## Storage and migration

`spielraum.v2` stores validated version-2 state. On the first V2 launch, a V1 value under `spielraum.v1` is migrated to V2. The original V1 value is never changed. Existing transactions retain original date metadata and become one-off monthly planning items; recurring rules retain their periods and month exclusions. Annual rules become monthly provisions. Legacy monthly budgets, limits and completeness metadata are retained in the export.

If a legacy budget exists without a planned income item for a month, it appears as an explicitly labeled inherited monthly allowance. It is suppressed in months with actual planned income items to avoid double-counting. Its form explains how to convert it to a regular planned income item.

Both V1 and V2 backup formats are accepted. Validation occurs before replacing data. Storage errors preserve the saved data and keep form inputs available. Cross-tab conflict checks prevent stale overwrites.

## Delivery

Authored static source is tracked in `dist/`; no build or install step. `planner.js` is the V2 data model; `planner-ui.js` and `planner.css` implement the interface. `legacy.js` validates and parses the previous data format. Do not change the deployed origin: browser storage belongs to it. The V2 service worker uses separate cache entries, and never clears financial storage.

## Verification

`node --test tests/*.test.mjs` covers money parsing, projection semantics, annual and one-off planning, recurrence changes/deletions, migration, backup validation and negative chart values. A synthetic DOM harness also exercised create/edit/delete/undo, live form projection, all views, pie/ring rendering, demo isolation, imports, storage failures and startup migration. No live-browser layout QA was performed in this managed static-site environment.

The optional feature-detected `show_budget_chart` WebMCP tool only changes the visible chart. A live supported WebMCP browser context was unavailable; only an API stub was used for its schema/behavior tests.

## Categories and plan intelligence (2.1)

- `intelligence.js` adds 23 default categories on a one-time additive migration. Existing items, category IDs, names, amounts and notes are preserved. The exact previous V2 JSON is saved first under `spielraum.before-categories-2026-09`; if this write fails the update does not overwrite the old value.
- Inline custom category creation preserves the item draft. Categories have keywords, a planning pace and optional personal limit. Explicit assignments are remembered for equal normalized names and item types. Existing uncategorized items are only reassigned after a selectable review.
- Local rule-based analysis explains every hint and compares personal buffer/savings targets, category limits and saved monthly plans. No language model is connected and no financial data is sent externally.
- Day comparison reserves fixed costs and savings at the beginning, spreading variable budgets evenly over the month's days. Month end equals the main projection. Historical averages need at least two explicit saved previous months; at most six are used. Current-month snapshots are refreshed on saving; past snapshots stay frozen unless explicitly saved again.
- Savings have their own category-level chart mode.
- Authenticated PWA manifest requests now use `crossorigin="use-credentials"`. The worker's shell cache includes the new module and authenticated asset requests; settings offers install diagnostics and actual browser-prompt handling. No origin, app ID or local financial storage key changes. Installation on the user's physical Android/Chrome device remains unverified.

Additional checks: `node tests/ui-flow.mjs` exercises synthetic UI flows and storage failures. `tests/intelligence.test.mjs` covers migration, suggestions, targets, day arithmetic and snapshot history. This is not a live-browser layout or physical-device installation test.

## Reserve pots and app icons (2.2)

- `reserves.js` models named pots with dated beginning-of-month balance checkpoints. `reserves-ui.js` adds their total, editable pots, goals, movements and a six-month projection. Positive balances have a composition chart; negative pot balances are displayed explicitly.
- An item may reference one pot via `potId`: `saving` deposits reduce free monthly budget; `income` withdrawals increase monthly available funds. Both sides use the same item, cents and recurrence/exclusions. There is no duplicate transaction ledger. Annual items retain the existing monthly 1/12 semantics. Withdrawals are separately labelled and do not suppress a legacy income allowance.
- Previous savings items are never automatically linked or duplicated. Manual linking preserves their monthly impact. Existing data is copied byte-for-byte to `spielraum.before-reserves-2026-09` before first upgrade, keeping the same local-storage key and deployment origin. Backups include pots and checkpoints.
- A balance correction resets the pot's starting point from a chosen month, leaves earlier checkpoints intact and does not create income. It can be undone or removed in the pot details. Pot deletion is blocked while any items reference it.
- These are planned balances, not observed bank balances. Start balances must exclude the selected month's already planned movements to avoid counting them twice. Bonus funding can be entered as normal income plus a savings deposit, then released through monthly withdrawals. No automatic bank transfers or investment returns.
- The existing logo motif was redrawn as smooth cubic vector paths. Versioned SVG and native 192/512/1024 PNG assets replace the jagged raster; a separate full-bleed maskable 512 icon preserves the central safe zone. `scripts/render-icons.cjs` reproducibly rasterizes `assets/app-icon.svg` using Sharp, resolved from the primary runtime (or a local installation). App ID and launch URL stay stable. Existing Android launchers may retain older icons until their manifest refresh; no claim of physical-device verification.
- `tests/reserves.test.mjs` and the extended synthetic UI flow verify future deposits, withdrawals, monthly totals, edits/deletions, checkpoints, linking, import and preservation of original data. Asset dimensions and logo output were checked locally; no live browser QA in this static managed profile.

## Native splash update repair

A user screenshot showed the original jagged splash after a manually requested WebAPK update reported Succeeded. The status alone does not prove an APK replacement: Chromium's WebApkUpdateManager can record SUCCESS when no upgrade is scheduled. The installed device's exact failure is not observable here.

The manifest now embeds the existing crisp PNG icon bytes as data URLs (`scripts/embed-manifest-icons.cjs`) instead of requiring separate authenticated requests to the private Site for native icon fetching. SVG is omitted from the installation icon candidates to keep native raster selection explicit; the SVG asset remains available to the website. Manifest URL, application ID, launch URL, audience and budget storage remain unchanged. Shell cache was bumped to deliver the updated manifest. This is a targeted compatibility repair; success on the physical Android device still requires confirmation after it consumes the new manifest.

## Cashflow edition (September 2026)

- Existing origin, manifest identity and `spielraum.v2` data are preserved. Before the first load after this update, the original value is copied unchanged to `spielraum.before-cashflow-2026-09`. The existing backup download/restore includes actual purchases and optional payment days.
- A budget expense can be assigned to a reserve pot (or create one inline). It becomes a saving contribution on the same item, so free budget does not change twice. Recurring edits still split at the selected month. New inline pots start at zero at the selected starting month; opening capital remains editable separately.
- Reserves now show total planned end balance, composition amounts, each pot's cashflow and six monthly closing balances. The payment ledger filters withdrawals, savings, planned expenses or all movements. Optional payment days clamp to the last day of short months; annual provisions remain undated because the existing year model is a monthly allocation, not an actual debit calendar.
- `actualExpenses` is an additive array of `{id,title,amount,date,category,note}`. It never enters `totals`, pot balances or scheduled payments. The separate Ausgaben view supports entry/edit/delete/undo, custom categories, dated history, category composition, comparison against planned expenses, and CSV. Aggregate chat export now includes actual category totals. No budget items are silently copied into the actual ledger.
- Regression coverage: calculation suites plus synthetic DOM event flows test linking, inline pots, previews, actual expense CRUD, category deletion guards and quota preservation. This static site has no compatible supervised browser preview; no visual/handset test is claimed.

## Editorial visual edition (26 September 2026)

User reference: warm paper, charcoal typography, muted slate/ochre/forest/violet and quiet, aligned expense rows. Budget rows now use a narrow category rail, compact metadata, tabular money and a dedicated delete button, without nested card footers. The same visual system extends to recorded purchases, reserves, diagrams and forms. Existing built-in category colors are translated by a read-only `themeColor` helper; saved categories, custom colors, entries, amounts and storage identity are not migrated. Existing UI flow regression passes. Direct browser/phone visual verification is unavailable for this static checkout.

## Goals edition (29 September 2026)

The Auswertung route, its navigation and in-plan promotion are removed. The app now offers Monatsplan, Rücklagen, Ausgaben and Ziele. Existing chart navigation tools open Monatsplan; category matching, diagram export and backups remain available. Historical analysis metadata is preserved in existing state.

`goals` is additive: `{id,title,price,deadline,potId,status,note}`; amounts are cents, deadline is an optional month, status is active/done. Goals can remain unfunded wishes or reference one existing/new zero-balance pot. A pot can fund only one active goal; completed goals release this allocation. Linked pots cannot be deleted until goal references are removed. Deleting or completing a goal never deletes money or budget entries.

Progress uses reserveSummary at the selected month's end. Deadline suggestions include all existing planned deposits, withdrawals and corrections. Additional monthly contribution starts at the later of the selected month and the last checkpoint before the deadline, avoiding suggestions that would be erased by a future correction. Amounts round up to cents. Suggestions open an editable saving item, with explicit start/end and immediate free-budget preview, and only affect the plan when saved. Marking done explicitly warns that existing savings continue; purchases remain separately entered actual expenses.

Unit coverage includes backup validity, no budget changes on goal creation, prevention of double allocation, deadline shortfalls and future corrections. Synthetic UI flows cover CRUD/undo, optional pot creation, recurring-rate prefill/end date, retained payments on deletion/completion, pot deletion guard and backup restore. The existing static checkout has no compatible supervised visual preview.

## Decision scenarios (30 September 2026)

Ziele now contains Wünsche and Entscheidungen without adding a main navigation route. Decisions retain an independent start month, minimum free monthly amount, protected pot floors and up to five variants. Variant lines are deltas to the live plan (expense/income/saving, monthly/yearly/once); selected existing series can end at the scenario start while retaining earlier months. Existing income, categories, savings and pot checkpoints form the baseline. Yearly values remain monthly provisions. Supplemental income against an active inherited V1 allowance is explicitly blocked until the allowance is replaced with normal income, avoiding the legacy suppression rule silently changing the base.

`decisions` is an additive validated local array. Drafts and stress settings never modify budget items, actual purchases or pot checkpoints. A funded expense produces an expense plus an equal linked withdrawal on adoption; this reduces the pot without double charging the free budget. The twelve-month comparison includes line charts and exact tables, individual pot flows, baseline and variant goal coverage, and violations of user-defined limits. Free surplus is not automatically invested or assigned to goals. Existing savings continue in a deficit projection, which is explicitly explained in the UI. Goal coverage means first coverage within the comparison window, not an automatically recorded purchase.

Adoption requires an explicit change-list preview and confirmation against the same state revision. The journal stores independent before/after snapshots, related-series guards and monthly skip guards. Duplicate adoption is blocked. Persistent rollback restores only affected items/skips and stops if those entries or related monthly exceptions were changed after adoption. Unrelated purchases, goals and budget changes are preserved. Journal and drafts are included in normal backup/restore. Applied scenarios are locked until rollback; they are never simulated twice over the adopted plan.

Verification: seven scenario-domain tests supplement the previous 29 tests. Synthetic DOM flow covers navigation, escaped text, variants, pot-funded purchases, stress configuration, isolated drafts, explicit adoption, reload and rollback, unchanged actual expenses, deletion and undo. No compatible supervised browser or physical-phone visual verification is available for this static project. SW cache v2-8 includes all three new modules; existing origin, app identity, data key and private audience are unchanged.

## Integrated planning package (30 September 2026, Spielraum 2.7)

Main navigation remains unchanged. Ziele adds Zeitplan between wishes and decisions; Ausgaben adds Import & Abgleich alongside the existing manual ledger. No APIs, bank connections, model calls or server storage were introduced. Finance records and CSV processing stay on the device.

### Shared goal schedule

`timeline` stores start, a cap for new monthly allocations, minimum free cash, explicitly replaceable savings IDs and protected pot floors. Optional goal `schedule` stores priority, fixed/flexible timing and a fixed new rate (zero means automatic allocation). The planner uses 36 months, prioritizes fixed deadlines then priority and desired date, includes untouched existing savings, and only ends savings series the user released. Existing protected pot capital is excluded from goal coverage. Planned deposits are not placed before a future checkpoint that would erase them. Freed allocation capacity goes to subsequent goals, without double allocation or automatic purchases. Date sliders change desired dates only; actual savings entries require a separate full change preview and confirmation. The resulting monthly entries use a persistent guarded journal for rollback. Missing resources or insufficient fixed rates/deadlines remain visible as warnings rather than affordability claims.

### Decision alternatives

The scenario assistant only changes expressly selected one-off prices, running expense lines or simple existing savings series. It binary-searches cent-level price ceilings, searches proportional running-cost ceilings, checks up to 24 later start months, and can temporarily pause explicitly released unchanged monthly savings before restoring them. Each result is checked for the existing scenario's free-cash and pot-floor constraints for 12 months from its proposed start. These are deterministic calculations against user assumptions, not AI advice, market quotes or loan offers. A result is saved as a separate decision draft and uses the existing adoption preview; no automatic budget edits occur. Complicated savings revisions or skips are left to manual scenario editing. Future free budget is never assumed to accumulate in pots.

### Local CSV and reconciliation

The quote-aware CSV parser handles comma/semicolon/tab, BOM, CRLF and embedded newlines. Users choose the header row, columns, signed/expense-only/split-debit-credit semantics and decimal format. UTF-8 falls back to Windows-1252 for common German bank exports. Dates accept ISO or German day-month-year. Foreign currencies and malformed rows are excluded with visible reasons. Import is bounded at 5 MB / 3,000 rows. The paginated review defaults possible duplicates off and lets the user explicitly include genuine repeated charges. Amount, date, title, category, type, plan association and transfer pot can be reviewed. Inputs are escaped. Imported entries never change planned items or pot balances.

The existing actualExpenses array gains optional kind/direction/merchant/importKey/planItemId/potId fields; old entries remain expenses. Expenses, income/refunds and own-account transfers remain separate. Learned local merchant rules distinguish incoming from outgoing transactions so a refund does not classify subsequent purchases as income. Exact unique expense names suggest a plan-item link. Reconciliation groups linked purchases under their plan category and reserves the maximum of planned vs recorded spending per category, preventing double subtraction and treating missing records as still reserved rather than saved. The consumption ledger excludes income/transfers; the journal shows all entries.

### Confirmed month closing

Month closing requires explicit completeness and actual opening remainder, income, deposits and withdrawals. The previous closed month's available remainder is offered as an editable opening figure; transfers among ordinary own accounts are excluded. The confirmed positive remainder creates one next-month income carry (explicitly labeled existing money, not earnings) and an optional saving entry for a selected pot/goal. No plan modification occurs before a second concrete preview. Negative cashflow is displayed and produces no positive carry. Closures cannot be repeated, can be reopened with a guarded rollback, and show a stale notice if underlying data changed. An immediately following closure must be reopened first to preserve carry chains. Checkpoints must exist by the transfer month. Active legacy V1 budget allowances require conversion before adding carries or supplemental scenario income.

All new fields and journals are validated and included in backup/restore; old state keys and application identity remain unchanged. SW v2-9 caches the new modules. Verification: all 45 domain tests and the extended synthetic DOM flow pass, covering allocation, protected capital, corrections, adoption/rollback, price search, pause restoration, CSV parsing/mapping, duplicate review, transfers, linked reconciliation and confirmed closure/reopening. No physical handset or supervised visual browser test is claimed for this static project.

## Plan checkoff and partial payments (2 October 2026, Spielraum 2.8)

Ausgaben → Abgleich now leads with the existing monthly plan as an actionable checklist. Each expense shows planned, recorded and open amounts with progress. Checkoff creates one linked actual expense for only the remaining amount; partial entry takes only the additional amount and date, with a live remaining/over-budget preview. Repeating checkoff cannot duplicate a completed amount. Recording actuals leaves planned budget items and reserve calculations unchanged. Each month is independent; annual costs compare against the existing monthly provision, not a scheduled annual invoice.

Existing unassigned purchases from the same category/name are surfaced before full checkoff and can be linked without creating another record. Linked payment history permits editing and deletion; deleted amounts become open again. Mutations use existing undo, revision checks, storage error handling and local backup format. Closed months must be reopened before checklist entry. The overall open total means remaining planned spending; variable budgets are explicitly not described as outstanding bills. Income and own-account transfers are excluded from the checklist.

Verification: three focused domain tests pass for partial/full amounts, duplicate protection, backup round-trip, month isolation, overspend, annual provisions, skipped/inactive items, dates and closed months. The existing synthetic UI flow plus the new checklist flow pass, including live preview, linking without duplication, deletion/undo and quota-failure preservation. Physical-device visual verification was not available. Existing application identity and local data key are unchanged; SW cache v2-10 includes plan-payments-ui.js.

## Quarterly planning and simplified reconciliation (2 October 2026, Spielraum 2.9)

The new “Alle 3 Monate” recurrence charges the full entered amount in the first payment month and every third month thereafter, across year boundaries. Intermediate months carry no charge. Existing annual entries retain their monthly provision calculation. Quarterly entries support end dates, skips, one-month overrides, partial/full checkoff, reserves, scenarios and backup/restore. A cycleStart anchor preserves the original payment phase when a recurring series is revised in an intermediate month; delayed scenario alternatives shift that anchor too.

Ausgaben → Abgleich now begins with planned income excluding reserve-pot withdrawals, followed by checkable expenses, then a compact monthly balance. Recorded consumption and planned savings are visible deductions. The balance distinguishes money remaining after recorded spending and savings, open expense budgets, and free money after those open amounts. This is an income-based planning calculation, not a bank balance. Unassigned recorded expenses are explicitly flagged for linking so they are not also held as an open plan amount. CSV/import and month-closing controls remain secondary, below the checklist.

Verification includes focused tests for quarterly year boundaries, end/skip rules, revisions, one-month overrides, deletion, reserve accrual, backup round-trip and reconciliation excluding withdrawals. Synthetic UI coverage verifies the quarterly editor, projection, recurrence, checkoff and income → expenses → balance ordering. Application identity and device-local storage key remain unchanged. SW v2-11 updates the cached shell. Physical handset visual verification was not available.

## Visual reconciliation and separate reserve funding (3 October 2026, Spielraum 2.10)

The reconciliation header shows ordinary planned income and planned reserve withdrawals separately, with the withdrawal as a visible “+ … (aus Rücklagen)” addition. A sole income uses its actual plan-item name; multiple incomes have an expandable breakdown rather than being mislabeled as salary. Both sources now fund the reconciliation balance, once. Recorded journal income/transfers are not added a second time.

Two compact responsive graphics share derived amounts: an allocation ring for recorded spending, open expense budgets, planned savings and free money; and a remaining-money strip separating covered open spending, free money and uncovered obligations. Deficits are explicit, never negative pie slices. Empty/zero-income cases render neutral states; all figures have text equivalents and accessible chart descriptions. Unlinked expenses make the allocation explicitly provisional. Checkoff, partial payment, undo and month selection use the existing render lifecycle, so visuals update immediately. No financial records, storage keys or pot balances are migrated by this release. Cache v2-12 includes the new graphics module.

Validation: focused domain tests cover split income, partial/full checkoff invariants, no double addition of imported income, backup round-trip, empty states, zero income and deficits. Synthetic UI tests cover the displayed split, both graphics changing after partial payment and undo, and preservation of plan/pot records. This static project has no compatible supervised browser preview; physical-device visual validation was not performed.

Review findings retained for user prioritization, not implemented in this release: editing a recurring plan series after a partial payment can leave actuals linked to the old revision; annual costs use monthly provisions while quarterly costs use payment months; open fixed bills and variable spending allowances need clearer separation; backups remain manually exported and device-local. These require deliberate data/interaction decisions rather than unrelated changes in a graphics release.

## Reliable reconciliation and payment-month annual costs (3 October 2026, Spielraum 2.11)

Payments resolve to the active expense revision by exact item ID, then by an unambiguous stable series ID. This also repairs already-recorded payments referencing a retained older revision without rewriting actuals. New checkoff/import/classification records retain planGroupId; explicit unlinking clears it. Classification dialogs preselect the resolved active item, and payment-history deletion accepts resolved historical references. Missing or ambiguous series remain unlinked rather than being guessed from names. Payment assignment is resolved once per expense per reconciliation calculation.

The checklist, amounts and allocation ring distinguish fixed invoices from variable spending allowances. Existing category pace supplies the default; a per-item pace choice is available in the planner and directly in the checklist. Changing that choice from the selected month uses the same historical revision rules and preserves payments. Fixed invoices may show their scheduled day, clamped to month length. Past-date copy says the entry is not fully recorded, not that the real invoice is necessarily overdue. Variable budgets do not display due-date notices.

New annual items explicitly use annualPayment=true, the full entered amount, and a cycleStart anchor at twelve-month intervals. Main planner, reserves, payment schedule, reconciliation, scenario preview/adoption and rollback share these semantics. Quarterly behavior is unchanged. There is no automatic monthly saving or smoothing.

Older annual items without this marker retain their prior monthly-share calculation until the user chooses the correct payment month. A persistent review notice lists those entries; their annual editor requires a payment month instead of silently guessing one from the historical start date. Conversion from the selected month preserves earlier revisions, actuals and prior pot projections. Existing backups and scenario journals remain valid; no bulk rewrite is performed on load. Old scenario annual lines remain labeled as prior monthly shares until edited. New scenario annual lines take their start as the first payment month.

Focused tests cover original/series linkage, legacy actuals, title/category/amount edits, one-month overrides, explicit unlinking, classification totals, full annual amounts including cents, rhythm preservation, skips/end dates, payment-day clamping, non-payment-month rejection, legacy conversion, pot balances, scenario adoption/backup/undo, and UI review/edit/delete/undo flows. Existing suites pass. The static project has no compatible supervised visual browser preview, so physical-phone visual QA is not claimed. Storage identity remains spielraum.v2; cache is v2-13.

## Unified spending and goal purchase checks (5 October 2026, Spielraum 2.12)

Ausgaben is now one working surface: split income / reserve funding, free cash and open obligations, the existing full / partial payment checklist, an interactive planned / recorded category ring, and a dated journal. There are no Ausgaben / Abgleich sub-tabs. New manual entries can select a plan item immediately; they retain the stable series reference and its category. Existing actuals, plan revisions and local storage are not rewritten. Fixed and variable filters and chart drill-downs change only the displayed selection, never the whole-month totals. Import and month closing remain under a secondary disclosure. Manual editing, deletion and moving entries into closed months require reopening that month.

Goals now have a direct “Kauf prüfen” action with price, month, optional monthly running costs, an optional partial reserve contribution and minimum free cash. Checks are read-only and examine twelve months; an infeasible check searches up to 24 later starts using actual planned pot growth, never hypothetical accumulation of free money. Protected floors from the existing goal timeline apply. The result shows purchase-month / minimum free cash, an interactive monthly chart, and other linked goals' coverage changes. Unlinked goals cannot be evaluated. A separate explicit change preview is required before adoption. Each goal uses one identified purchase adoption to prevent repeats, with the existing guarded persistent reversal. Applied purchase checks survive backup/restore. Goals and their original desired dates/prices remain unchanged by a simulation or adoption; new expense/funding items represent the chosen purchase. Existing advanced decision drafts are retained behind “Gespeicherte Kaufprüfungen & bisherige Entwürfe”, rather than a primary Decisions tab.

`budget-insights.js` explains changes between the selected and preceding monthly plans, resolving revisions by stable series and listing exact signed drivers. It does not fabricate actual-spending comparisons. Quarterly and annual costs remain in their payment months; related reserve labels were corrected to reflect those existing semantics. `refinement.css` unifies surfaces, typography, category rails, numeric alignment, status chips and mobile targets. Existing app identity, private audience, device-local storage key spielraum.v2 and all stored data structures are preserved. Service-worker shell v2-14 includes new modules/styles.

Verification: the existing 59 financial-domain checks, three new integrated purchase / change-explanation checks, and the expanded synthetic UI flow pass. New coverage includes partial funding counted once, read-only purchase checks, infeasible adoption rejection, later dates supported by pot growth, persistent adoption / backup / guarded rollback, immediate expense linkage across plan revisions, filtered drill-downs, and absence of redundant spending navigation. No compatible supervised visual preview is available for this static project; no physical-phone visual validation is claimed.
