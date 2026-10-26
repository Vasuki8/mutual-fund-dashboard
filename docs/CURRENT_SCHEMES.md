# Currently reporting scheme directory

This is a conservative **directory filter**, not a declaration of purchase eligibility.

## Manual input and limitations

The owner supplied AMFI's SchemeData2710260104SS.csv dated 26 October 2026. It contains 16,472 scheme-code rows: 10,306 Open Ended, 6,087 Close Ended, and 79 Interval Fund. The derived numeric-only roster contains 10,273 open-ended scheme codes with a known launch date no later than 26 October. It excludes 14 future launches and 19 entries with unknown launch dates. This is a manual snapshot and needs future manual review.

The original CSV and its names, ISINs, categories, dates, and minimum amounts are not committed. The sheet has no purchase-allowed or redemption-allowed flag. Its Closure Date field is NOT a reliable fund-closure flag; some old open-ended plans have a closure date equal to launch date.

## Display rule

Explore and global search show a scheme only when:
1. Its exact scheme code is in the manually supplied open-ended roster.
2. MFAPI still lists the code in its latest catalogue.
3. It has a positive latest NAV with a valid reporting date in the past seven UTC calendar days.

If the verified shared catalogue cannot load, the public explorer/search must not silently fall back to all MFAPI schemes or the six historic starter examples. Results are labelled **recently NAV-reporting open-ended schemes**. That is NOT evidence that new purchases are currently permitted. A licensed purchase-enabled source, such as BSE StAR MF, is required to verify transactability.

All historical NAV records, fund-level links, saved watchlists, comparison items and quality warnings remain unchanged. This filter does not alter collection, publish raw AMFI files or make requests to AMFI.

## Rights and maintenance

AMFI has said automated website downloading is not permitted. The original sheet was manually supplied. Commercial redistribution permission for a comprehensive scheme-code roster has not been established, even if the original source CSV is not reproduced. **Do not merge this public-website feature until the intended reuse is authorized.** New schemes require a later manually supplied, approved roster and a reviewed update; never automate AMFI downloading.
