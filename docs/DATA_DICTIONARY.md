# Data dictionary

The canonical file is [data/index.json](../data/index.json). References use stable project keys. Dates are ISO calendar days (`YYYY-MM-DD`). Coverage describes this pilot’s review cutoff.

| Entity | Fields |
| --- | --- |
| Index | `schemaVersion`, `coverageDate`, `scope`, `licenseStatus`, `thirdPartyExclusions` |
| Case | `id` is an internal key. The applicant, public identifiers, jurisdiction, and other facts are separate claims. |
| Source | `id`, `title` as printed, `listingTitle` on the official site, `issuer`, exact `url`, `listingUrl`, `documentDate`, `meetingDate`, `retrievedAt`, `status`, `recordType`, `reviewState`, `reviewer`, `reviewDate`, `ownerReview`, `reuseNotes` |
| Claim | `id`, `caseId`, `field`, `value` as text, number, a list of text values or null, optional `unit`, `sourceId`, `locator`, `state`, `notes`, `version`. Source and review metadata follow from `sourceId`. |
| Event | `id`, `caseId`, `sourceId`, `date`, `kind`, `label`, `locator`. A `scheduled` event records a date listed in the source. |
| History entry | `date`, `version`, `claimIds` and a `note`. Keep earlier entries when revising a claim. |

## Claim states

- `documented` means the source shows the indexed fact, such as the case identifier or the roads it lists.
- `proposed` means the source describes a request or forecast.
- `not_found` means the record reviewed does not report the fact. The review may cover only one record.
- `not_researched` means the pilot did not investigate that field.
- `conflicting` requires reconciliation or explicit review before an index build will pass.
- `actual` requires authoritative evidence for the observed value. The pilot contains no actual consumption values.

`status` describes the source document, while `reviewState` describes the comparison of index entries to it. `ownerReview` records whether the owner has reviewed the source. The jurisdiction field describes the county record’s issuing authority. The listed postal locality gives no parcel-level determination.

## Export formats

CSV has one row per claim with flattened provenance, review and rights fields. Lists use ` | ` as a separator. Null becomes an empty cell. Text with spreadsheet formula prefixes receives a leading apostrophe and all cells are quoted. JSON contains the normalized index and flattened `claimRows`, with null values and arrays intact. JSON is intended for programmatic use. Use the CSV export when opening the data in a spreadsheet.
