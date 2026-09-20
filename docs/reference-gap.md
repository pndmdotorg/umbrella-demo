# UMBRELLA fitness: reference alignment

Reference: https://umbrella-fitness.vercel.app/ — inspected 2026-09-20.

## Purpose and first phase

Match the reference's mobile-first look and make the Home experience reviewable. The user approved starting with the screen/feature gap inventory and Home implementation. Keep this as a static Web demo; native packaging and production services are not part of this phase. Preserve the original staking simulation at `/umbrella.html` and its `umbrella-sim` localStorage key.

The root now uses a separate fitness frontend with no framework or build dependency. HTML provides the shell, CSS the shared visual system, `fitness.mjs` the views, and `fitness-state.mjs` the testable demo state. The new storage key is `umbrella-fitness-demo-v1`.

## Screen and feature inventory

| Area | Reference observed | Previous local implementation | First phase | Remaining |
| --- | --- | --- | --- | --- |
| Home | Pale green/white, dark outline, rounded Virus card, carousel, impact, energy, START | Full-screen dark 3D world | Reference-style Home, same sprite asset, initial numbers, working carousel | Fine visual tuning across devices |
| Navigation | Home / Viruses / Stats / Market | Buy / My Viruses / Treasury / Leaderboard | Four working routes with active state and browser history | Additional nested routes |
| Account | Level badge, PFE/UMB, wallet, demo settings | USDG/UMBRELLA simulation | Demo wallet, local persistence, reset confirmation | Auth, wallet connection, real transfer flows |
| Viruses | Rarity filter, four owned Viruses, detail attributes, equip | Staking inventory | Filter, collection, details, equip | Exact tab nesting, attribute allocation, repair, leveling |
| Capsules / Badges | Collection tabs | None | Explicit empty/next-phase states | Minting, opening, eligibility, achievements |
| Walking | Live/demo entry, accelerated demo, energy/durability, pause/finish, map | None | 30× simulated flow, pause/resume, finish, account settlement | GPS, maps, background tracking, precise reference math |
| Results | Infected, reward, duration, consumed energy/durability, steps | None | Demo result and persistent history | Real session verification |
| Stats | Today/week, PFE, energy, streak, chart, session history | Treasury / leaderboard | Rolling seven-day chart and sample + demo history | Exact aggregation/range rules and richer history |
| Market | Virus/Capsule tabs, search/filter/sort, listings, purchase/sale | Bond purchase | Six reference-inspired visual listing previews | Search/sort, trading, ownership transfer, listings lifecycle |

## What was actually observed

- Home: selected Uncommon #00842, LV 12, durability 82/100; energy 6/6; 5,280 infected; wallet 0.024850000 PFE and 12,500 UMB.
- Collection: #00917 Common, #01063 Rare, #01128 Epic; other levels 5. Displayed attributes 24/32/16/20.
- Reference image is a 2×2 CSS sprite at `/viruses-playful.png`. Copied unchanged to `assets/viruses-playful.png`; source recorded in `assets/README.md`.
- Reference lab displayed repair 72 UMB, level-up 520 UMB, and mint 1,200 UMB for the inspected initial Virus. These are observations of one state, not general pricing rules.
- Reference demo walk showed 30× time, simulated speed, energy/durability consumption, pause and finish confirmation. Finish added simulated PFE and showed a result.
- Marketplace showed six listings starting at 1,000 UMB with increments of 450. No transaction was needed for inspection.

## Provisional demo behavior (not verified reference economics)

- Walk duration advances 30 seconds per wall-clock second. Simulated speed is fixed at 7.2 km/h.
- Steps = floor(duration × 2.4); infected = floor(steps × 1.1); reward = infected × 480 PFE nano-units. Integer nano-units avoid balance drift.
- Energy costs one unit per 300 simulated seconds; durability costs one point per 100 simulated seconds. Movement pauses at either resource limit.
- Energy refills 1.5/6 every six hours. Missed refill periods catch up when no walk is active.
- Navigating away, hiding the tab, or reloading pauses the walk. Reload never silently resumes simulated earnings.
- Finish settles once; repeating it cannot credit twice. The wallet and activity are saved locally. Corrupt storage starts a fresh demo; unavailable storage leaves a usable in-memory session.
- Initial history is clearly marked sample data. New sessions use the browser's local date; weekly stats cover the last seven days.
- START opens a demo-mode explanation; the secondary Demo Walk action starts immediately. No button requests location or pretends GPS is implemented.

## Next implementation phase

1. Confirm whether an authoritative reference repository/specification is available. Source-backed calculation rules are preferable to inference from UI.
2. Specify repair, leveling, attribute allocation, minting, capsule opening, and ownership/market transactions with insufficient-balance and eligibility cases.
3. Implement and test these loops as demo behavior, comparing with the reference state-by-state.
4. Decide native targets and background tracking requirements before choosing mobile packaging or a native rewrite.
5. Add real authentication, storage, GPS and wallet services only after those requirements are settled.

## Acceptance for this phase

- Home renders at 390px with the reference palette, sprite, cards, account strip and four navigation items.
- At narrow widths and short heights, the document scrolls and all Home actions remain reachable above the fixed navigation.
- Virus selection, demo walk, pause, finish, wallet, stats/history and reload form a usable end-to-end flow.
- Preview-only features are identified in the UI and cannot spend balances.
- Original demo source and storage are preserved.

## Verification performed

- `node --test tests/fitness-state.test.mjs`: 7 tests passed, covering settlement idempotency, pause/reload, exhaustion, start guards, refill catch-up, invalid storage, and clock rollback.
- `node --check` passed for both JavaScript modules; `git diff --check` passed.
- Browser flow verified: carousel → rarity filter → Virus detail/equip → Home → demo walk → pause → reload (still paused) → finish confirmation → result → Stats. Wallet increased by exactly the displayed result; history and balance survived a second reload.
- Viewports checked: default desktop, 390×844, and 320×568. Narrow document width matched the viewport; Home start and demo actions remained reachable by scrolling.
- Market preview dialog displayed a disabled trading action. Reset restored the initial account. Browser error/warning log was empty during the final check.
- This is a local browser verification, not testing on physical iOS/Android devices. No deployment was performed.
