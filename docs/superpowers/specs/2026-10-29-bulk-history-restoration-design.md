# Bulk history restoration design

## Goal and evidence

Continue the owner's authorized larger-batch discrepancy repair from main `056ac7d2bee9edd733d45182385152c218ece6c8` and archive checkpoint 214. Investigate all 104 remaining Growth cases. Apply only fixes supported by original source records and full-history checks.

SBI's public historical NAV service supplied 310 dated observations for SBI Infrastructure Fund, regular Growth, issuer plan `144G`, from 1 April 2009 to 15 July 2010. Its PDF agrees with all 310 JSON observations. Seven observations already exist in the saved history and agree exactly; 303 are missing. The missing interval is 6 April 2009 through 8 July 2010. The saved 4,435-point history becomes a 4,738-point calculation series with no moves above the existing 40% threshold. The NSE-hosted issuer SSD maps regular Growth to numeric code `106096` and ISIN `INF200K01CT2`.

## Approach

Extend the existing issuer-reviewed calculation basis with an explicit history-restoration variant. This preserves the existing raw-history contract while supplying the verified missing observations to financial calculations. Mutating the release archive would require the collector's normal write path; silently waiving the jump would leave the calculation history incomplete. Neither approach is selected.

Store the complete 310-row issuer window and provenance in a small checked-in data module. Require the exact source, numeric code, name, fund house, ISIN, Growth option, open-ended type and category. Require the exact one-jump warning, a valid ordered full series, all seven unchanged overlapping anchors, no source observations inside the missing interval, and the sole raw jump at the documented gap. Reject independent invalid/conflicting-source warnings. Recheck the entire merged calculation series; every original point must be retained unchanged.

The review summary and evidence link identify the 303 added observations, interval and issuer source. Existing detail, comparison, SIP and nested CSV provenance flows carry this review. Unit-adjustment flags remain separate. Current published records, archive provenance, source warnings and raw exports retain their established behavior.

## Scope and verification

Only `106096` is an implementation candidate in this design. The other 103 cases remain subject to their own evidence gates. No schedule, discovery-filter, repair-scope, storage or layout change is included. Verify positive behavior, fail-closed guards, raw-data immutability, all affected views/exports, the complete 610-history comparison cohort, the full test suite and the actual deployed artifact.
