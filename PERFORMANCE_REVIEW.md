# Performance review — 2026-10-18

## Changes
- People summary requests run concurrently rather than sequentially. Stale responses are ignored after company changes or unmounts.
- Map uses the shared active-company source, eliminating divergent local selections.
- PDF and spreadsheet export code is imported only on export, reducing initial map dependency loading.
- Company selection does not invalidate the identity or company-directory queries. Directory reads have a short freshness window; explicit mutation invalidation still refreshes them.

## Verification
- Authenticated Chromium at 1280×1800 and mobile emulation at 390×630: Empresas, Pessoas, Alçadas and Mapa loaded without page errors or document-width overflow.
- Changed map from one actual company to another on both devices; both selectors and displayed company agreed. Mobile navigation opened successfully.
- PDF and XLSX exports downloaded successfully after lazy loading. No business records were created or modified.
- Local preview content readiness was approximately 1.3–2.9 seconds across observed runs. This measures heading visibility, not complete data readiness or production Core Web Vitals. It excludes the added post-load observation wait.
- Fourteen existing regression tests passed; harness build signal was OK after changes.
- Cloud health: memory 58–59%, disk 15%, connections 10–11/60, no restarts or exhaustion alerts. Cumulative rollbacks stayed unchanged at 88062 between snapshots; the total alone is not a current failure rate.
- Highest aggregate-time queries averaged 1.03–2.06ms; their maximum times were below 41ms. No measured database bottleneck justifies new indexes or a paid compute upgrade.

## Limits
- Development modules and local-network timing are not production bundle or real-device performance measurements. Resource timing reached its default 250-entry buffer, so it is not a complete request count.
- No real slow mobile network, physical phone, concurrent-user load test or published Core Web Vitals audit was performed.
- Scope covers representative navigation and exports, not every workflow or large-data stress case. Stability and speed cannot be guaranteed for every device and connection.