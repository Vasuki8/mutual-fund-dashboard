# Previous FundScope layout with Atlas colours

On 23 October 2026, after reviewing the Atlas adaptation, the owner clarified: keep the previous layout and use the Atlas colour theme. The layout at `514e651` is the reference for structure, spacing and typography. The supplied Atlas template supplies colours only. This correction supersedes the earlier full Atlas layout contract.

## Layout contract

- Restore the compact header and left sidebar with Explore, Compare, Watchlist, Data & backups, Methodology, Last viewed and the GitHub link. Restore the mobile menu, its expanded state and Escape handling.
- Use the fund table for the starter collection, search and Watchlist. Keep the separate 225px preview on the right above 950px; stack it below results on narrower screens. Keep 16px main padding, 22px page headings, compact cards and research tools, 4px control corners, 5px panel corners, Segoe UI/Arial text and Consolas tabular numbers.
- Keep the previous detail, metric, comparison, notes and data-status layouts. Restore the 150px preview chart. Wide tables scroll inside their containers; the page fits a 320px viewport, including visible scrollbars.
- Retain the labelled light/dark switch. Appearance persists independently of research settings and restores before mounting. The added theme control remains 44px on phones and coarse-pointer devices.

## Atlas colour palette

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#f1ece1` | `#1b2522` |
| Evidence surface | `#faf7f0` | `#24332d` |
| Text | `#26352e` | `#edf1e9` |
| Muted | `#5e6e63` | `#aebdb2` |
| Rule | `#c9d0c4` | `#455a4c` |
| Grid | `#e1e4db` | `#35483d` |
| Accent | `#25795d` | `#9ad7b1` |
| Second series | `#b85832` | `#e7ae7a` |
| Selection | `#dfe9dd` | `#304c3c` |


Apply the palette to backgrounds, panels, borders, selections, text, buttons, status indicators, heatmaps, charts and PNG exports. Charts use the panel background and repaint when appearance changes. Do not introduce the horizontal Atlas navigation or expandable starter rows.

## Behaviour and runtime

Preserve full-result sorting before pagination, the verified return-index gate, separate preview/save/compare actions, watchlists, notes, backup/restore, exports, request deduplication and cache generation guards. Retain the fund-detail hook-order fix for asynchronous history loading. Keep financial calculations, Growth/distribution gates, actual dates, missing values and source-quality notices unchanged.

GitHub remains the delivery target. Do not deploy to the former ChatGPT Site, resume its updater, change collectors or migrate stored history. Verify the Pages deployment and public UI separately from source checks. A UI release does not establish complete archive coverage.

## Interaction motion

The owner approved subtle interaction effects: 160ms preview fades and save/compare icon feedback, a 180ms mobile-menu expansion/collapse, and 160ms notification entry/exit. Values and charts update immediately. New notifications replace outgoing messages immediately; dismissed controls become inert and are hidden from assistive technology before the visual exit completes. CSS display-transition support improves the notification exit; older browsers close it immediately. The existing Reduce Motion rule disables every effect. Keep the layout, data, calculations and collection behaviour unchanged.
