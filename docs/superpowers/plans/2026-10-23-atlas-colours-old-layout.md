# Previous layout with Atlas colours

Goal: follow the owner's correction: keep the previous layout and use the Atlas colour theme.

1. Restore the layout at `514e651`: sidebar, header structure, starter/search/Saved table, right-hand preview, compact cards, spacing and typography. Keep the current theme switch, theme persistence, canvas colours and fund-loading fix.
2. Keep Atlas light/dark colour tokens. Use the panel colour behind charts. Remove the superseded expandable-band component and its tests. Add a regression for the restored starter table and selected preview; preserve all global sorting tests.
3. Update the UI contract and active direction. Run the full test suite, typecheck and both builds. Check desktop and phone layouts, both themes, menu/keyboard navigation and table selection in the browser.
4. Obtain independent source review, submit the change to GitHub, and verify successful Pages publication and the public UI.

No data source, financial calculation, archive, stored history, collection workflow or activation gate changes.
