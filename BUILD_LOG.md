# Build log

## November 25, 2026

- The project owner authorized public publication of the GitHub repository and live demo before completing her own fact-check. Owner review remains pending.

- Codex downloaded the original county PDF and compared page 1 with the index. The two dates, applicant, IDs, proposed uses, requests, and location matched. Added the draft-reported 703-acre lot size and the requested RP to CC Future Land Use Map change.
- At the owner’s direction, applied Apache-2.0 to original code, CC0 1.0 to original index contributions where the project holds rights, and CC BY 4.0 to original guide and methodology.

## November 23, 2026

- **Project direction from the project owner’s brief:** A county-specific, single-case public-records prototype for residents. The brief identified the starting draft agenda, required provenance and unknowns, proposed the stack and licenses, and set release and contact boundaries. The owner asked Codex to continue with the MVP.
- **Codex contribution:** Compared the accessible original PDF text and county listing with indexed facts, developed the interface and local build, implemented validation and data export, wrote documentation, and ran automated checks. The hero landscape was AI-generated and is labeled illustrative.
- **Data review:** The live index has one real case, one draft source and ten claims, including three null fields. Source comparison was performed by Codex. The owner’s source review, resident interviews, and additional research were pending at the time.
- **Test data:** Synthetic dates, URLs, duplicate claims, formula-like values and HTML-like text are used only in automated tests.
- **Release:** Local source and a portable HTML demo. The initial release was private.
- **Verification:** TypeScript and production build passed. Five data tests passed. Chromium passed search, filters, downloads, keyboard navigation and focus restoration, automated axe checks, 320px and 390px overflow checks, and rendering of synthetic HTML-like text as inert text. The self-contained demo was tested in a network-disabled browser context with its HTML supplied directly because the workspace browser blocks local-file navigation.
