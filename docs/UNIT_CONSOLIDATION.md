# ICICI Prudential Overnight Fund — unit consolidation (2022)

## Official source and scope

ICICI Prudential Asset Management Company's **Notice-cum-Addendum No. 011/07/2022**, dated 28 July 2022, states that the face value of ICICI Prudential Overnight Fund units changed from **₹100 to ₹1,000** effective **16 August 2022**. Existing investor units were adjusted proportionately; the change was not an economic return.

The announcement is reproduced in [the original AMC notice](https://fundsindia.com/blog/wp-content/uploads/2022/08/Attachment74998attachmentsChange-in-FV-Overnight-Fund.pdf). The notice excludes separate plans for unclaimed amounts. The current implementation is restricted to **MFAPI scheme code 145536, ICICI Prudential Overnight Fund – Direct Plan – Growth**.

## Calculation-only normalization

When the saved MFAPI history contains **exactly one** >40% discontinuity warning, the derived-calculation layer checks the original ascending source NAV observations. It must observe a single positive approximately **10:1** jump across the published action date, with the previous NAV on 5–15 August 2022 and the following NAV on 16–23 August 2022. It verifies the series has no duplicate dates, invalid values or additional >40% movements.

**Only then** are pre-16-August-2022 NAV values multiplied by **10** in a temporary financial-analysis copy. The latest reported NAV, raw NAV chart, raw-history CSV, saved observations, source warnings and GitHub archive records remain unchanged. Any other unexplained discontinuity, invalid NAV, conflict, unrelated scheme, IDCW option or failed boundary check preserves the blocking safety gate.

The normalized copy may feed Growth-option performance, drawdowns, monthly risk, holding periods, SIP illustration and selected-fund comparisons. These results must clearly disclose the unit adjustment. The correction is not generalized to unrelated scheme codes or inferred from a threshold alone.

## Remaining limits

- Source NAV values at the action boundary must independently satisfy the conservative 10:1 verification at runtime. A mismatch fails closed; the user will continue to see the warning rather than an invented return.
- A historical move outside this AMC-documented action still needs independent evidence. A generic large move must not be automatically repaired by dividing it away.
- The published global return index excludes unresolved source histories until its separate archive-quality policy is reviewed; this targeted update does not modify historical checkpoint accounting or certify every previously flagged record.
- This feature is a documented adjustment of one corporate action, not a claim that the data source's full mutual-fund dataset has commercial redistribution clearance.
