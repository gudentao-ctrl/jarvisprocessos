# Security review — 2026-10-18

## Corrected and checked
- Candidate policies no longer use unconditional access; company/tool/CRUD rules remain enforced by restrictive policies as well.
- Database trigger prevents ordinary users changing their own approval status or administrative flags.
- Public assessment writes now revalidate registered identity on every save/completion, accept only invitation tokens, measure duration server-side and condition updates on unfinished records.
- Password-recovery destinations allow only explicit application origins and the recovery page.
- Global reload-write function now requires SuperAdmin authorization.
- Production dependency overrides remove all currently reported registry advisories; SheetJS uses its official patched 0.20.3 distribution, which the registry scanner does not check.

## Verification
- Fresh basic database scan: no findings. This is not deep code analysis or certification.
- The initial 51-table inventory had row-level security enabled; the new People tables explicitly enable it in their migrations.
- Initial focused tests and document-generation smoke tests passed; the fresh focused suite has fourteen passing tests.
- Browser: signed-out administration access redirects to sign-in; invalid assessment invitations and writes without identity are rejected; real signed-in SuperAdmin permission workspace still loads.
- Preview build signal: build OK.
- No candidate's real answers were changed. Successful assessment completion with the new checks was not exercised end-to-end.
- Non-admin cross-company CRUD tests were not executed with a real non-admin session.

## Remaining risks requiring follow-up
- Deployed legacy `chunk-audio` has a confirmed cross-tenant service-role risk. Its unused source was removed, but Cloud refused live deletion until the migrated app is published and verified. Removal remains a release blocker, not a completed fix.
- Google credentials were potentially exposed previously: rotate the Google client secret and reconnect accounts. The new private storage prevents current ordinary Data API access; prior exposure cannot be undone by isolation alone.
- Real Google authorization, refresh and event delivery were not exercised; an authorized Google account and valid provider configuration are required.
- Non-admin multi-company CRUD was not exercised with a real restricted account. SuperAdmin and anonymous checks do not prove all account combinations.
- Anonymous survey duplicate protection is per browser session, not verified human identity; another browser or regenerated session can submit again. Do not claim single-person participation enforcement.
- Historical unsafe SQL files remain historical artifacts; the applied Drizzle migrations and live policies are authoritative. Do not reapply blanket legacy policies.
- Basic scanners are not a penetration test or certification; SheetJS's CDN release remains outside the registry advisory scan.

## Comprehensive review changes and fresh verification
- Applied migrations 0004–0008 isolate Google configuration/tokens/states, add nine protected People tables, validate survey submissions and same-company relations, preserve answered question semantics and delete surveys transactionally.
- Removed personal-data local/demo persistence from recruitment and mentoring, embedded survey definitions in URLs, answer broadcasts and fabricated fallback candidate/KPI rows.
- Finance mutation guards now use mutation actions rather than read access; shared-store saves fail explicitly instead of claiming persistence through mutable server memory.
- Document-template save/read functions assert company/tool/action access and reject the reserved financial store.
- Mentoring imports only actually completed assessments and uses the shared calendar-age helper.
- Authenticated browser checks loaded recruitment, mentoring, surveys and profile without runtime errors.
- Survey flow was exercised with temporary records: creation, anonymous answer, report readback (one real response, score +100), editing with stable question IDs, replay rejection, anonymous answer/token-table denial and transactional deletion. All temporary surveys were removed; no real candidate responses were changed.
- Fourteen focused tests passed. Fresh dependency scan found no known advisories in 70 registry production dependencies; basic security scan found no issues. Latest preview build signal was OK.
- Linter flags on three private tables without client policies are intentional fail-closed isolation; token-scoped public survey functions intentionally use validated SECURITY DEFINER execution.
- Fresh live policy inspection confirms candidates have no anonymous policies and authenticated access uses company/tool/action gates; calendar and document-template gates are RESTRICTIVE, so permissive company policies do not bypass them. Historical blanket candidate policies flagged by repository review are not present in the live policy inventory.
## Controlled penetration test — 2026-10-20
- Files: interview audio, POP sources and logos now require the matching company permission; legacy files are bound to their company records. Signed-out listing returned no files; SuperAdmin logo downloads and file listings still work.
- Report logos are read only from the private logo bucket under the caller's permissions, with type and 5MB limits; arbitrary, internal and traversal destinations are rejected by regression tests.
- Action-plan updates require a valid signed-in user with update permission for that company, accept only known statuses, cap appended history and reject concurrent overwrites. Signed-out, forged-session, invalid-status and unknown-link attempts were rejected without data changes.
- Signed-out reads of personal, financial, permission, Google-token and survey-answer data returned no rows or were denied; signed-out permission-grant and file-check calls were denied; malformed survey tokens returned nothing.
- The action-plan page moved off the survey address because both used the same address and blocked anonymous NPS/eNPS links.
- Mobile check: both active Augusto Bogo survey links opened anonymously and showed the first question; no response was submitted.
- Sixteen focused tests passed. Not performed: load/denial-of-service testing, restricted non-admin account testing, external infrastructure testing.
