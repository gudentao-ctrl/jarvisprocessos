# Security review — 2026-10-16

## Corrected and checked
- Candidate policies no longer use unconditional access; company/tool/CRUD rules remain enforced by restrictive policies as well.
- Database trigger prevents ordinary users changing their own approval status or administrative flags.
- Public assessment writes now revalidate registered identity on every save/completion, accept only invitation tokens, measure duration server-side and condition updates on unfinished records.
- Password-recovery destinations allow only explicit application origins and the recovery page.
- Global reload-write function now requires SuperAdmin authorization.
- Production dependency overrides remove all currently reported registry advisories; SheetJS uses its official patched 0.20.3 distribution, which the registry scanner does not check.

## Verification
- Fresh basic database scan: no findings. This is not deep code analysis or certification.
- All 51 live public application tables have row-level security enabled.
- Twelve focused automated tests pass; spreadsheet and Word-document generation smoke tests pass.
- Browser: signed-out administration access redirects to sign-in; invalid assessment invitations and writes without identity are rejected; real signed-in SuperAdmin permission workspace still loads.
- Preview build signal: build OK.
- No candidate's real answers were changed. Successful assessment completion with the new checks was not exercised end-to-end.
- Non-admin cross-company CRUD tests were not executed with a real non-admin session.

## Remaining risks requiring follow-up
- Recruitment, mentoring and NPS still have browser-local persistence/fallback paths, including personal data and silent failed saves. Their historical SQL files are not evidence of live tables: these module tables are absent from the live public table inventory. They need protected persistence before confidential production use; browser filters are not authorization.
- Google OAuth configuration and user tokens are stored in the general finance document-template store. Users authorized to read that store may read credentials directly through the data API. Credentials and per-user tokens need a separate server-only store with owner-scoped access; do not treat UI masking as protection.
- Legacy Google credential configuration writes process environment and a local environment file. Replace this with managed-secret storage; no environment file was read or modified during this audit.
- Four database-linter warnings concern authenticated execution of privileged functions. Such functions can be required for RLS and admin RPCs; inspect caller validation individually rather than revoking them indiscriminately.
- Automatic basic scans do not establish that every feature or third-party integration is secure. Connector scan remains incomplete.