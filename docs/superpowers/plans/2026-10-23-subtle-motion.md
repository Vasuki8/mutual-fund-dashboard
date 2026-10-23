# Subtle interaction motion

The owner approved the proposed preview fade, save/compare feedback, mobile menu transitions and notification transitions. Keep the existing layout and Atlas colours.

1. Keep preview content current immediately. Keep the preview and its action buttons stable; recreate only the fund-information fragment when the scheme changes, with a 160ms opacity effect; add no number counting, chart drawing or delayed data swaps.
2. Add 160ms icon feedback to successful save/compare states. Preserve existing handlers, limits and accessible pressed states.
3. Use a collapsible mobile sidebar wrapper with a 180ms grid transition; preserve desktop geometry, close-button/Escape focus and hidden navigation behaviour.
4. Extract the status notification into a small component that keeps its outgoing text for the CSS exit transition. Hide it from assistive technology and disable its close button immediately on dismissal. New messages must replace outgoing text immediately. Use a 160ms discrete display transition with an instant fallback in older browsers.
5. Keep all effects disabled by the existing Reduce Motion rule. Test notification replacement/dismissal and preview identity, run the existing suite/typecheck/builds, inspect browser behaviour and layout, review and publish through GitHub.

No dependencies, financial calculations, data providers, collection jobs or storage changes.
