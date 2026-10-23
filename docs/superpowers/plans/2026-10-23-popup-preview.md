# Popup fund preview implementation plan

**Goal:** Replace the side preview with a popup while retaining the compact sidebar/table and Atlas colours.

**Architecture:** Reuse FundPreview inside a native dialog, opened explicitly by a fund-name button. Home stores the opened scheme independently of the current results so Watchlist removal does not switch the preview. Native modal behavior handles focus trapping; close restores the opener or the page heading. No dependency changes.

**Scope:** Preserve analytics, sorting, archive gates, collection controls, Save/Compare and full-analysis actions. Use a 160ms entry that obeys reduced motion.

- [x] Add regressions for initial closed state, explicit opening/closing and stable fund identity after Watchlist removal.
- [x] Implement the modal lifecycle, scroll containment, accessible title, Escape/close/backdrop dismissal, focus restoration and responsive layout.
- [x] Test lifecycle behavior including a removed opener and dragging from inside to the backdrop.
- [x] Verify full tests, types, both builds and desktop/mobile browser interactions in both themes.
- [x] Independent review and fixes for effect replay, navigation focus, reduced-motion backdrop and collection-limit feedback.
- [ ] CI, merge, successful Pages deployment and public UI verification.
