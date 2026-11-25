# Douglas County Data Center Commons

An independent community prototype for finding and understanding public records about data center proposals in Douglas County, Georgia.

The pilot follows East Village Dothan, LLC through one county draft zoning agenda. Search for `M2026-01`, open the case, and select **View evidence** to see the source, locator, memo date, and separately listed meeting date. The case also records the limits of the review. A final decision, issued permits, and measured water or energy use remain unverified or unresearched.

## Open the demo

Open `dist/douglas-county-commons-demo.html` in a browser after running `npm run build:portable`. The interface and downloads work offline. Opening the original county PDF requires an internet connection.

For local development, install Node.js 24 LTS and npm 11, then run:

```sh
npm ci && npm run dev
```

Open the address printed by Vite. The app uses React, TypeScript, Vite, ordinary CSS, and a version-controlled JSON index. Search, filters, and exports run in the browser.

## Build and verify

```sh
npm test
npm run build
npm run build:portable
npm run test:browser
```

The portable build writes `dist/douglas-county-commons-demo.html`. Browser tests need a Chromium executable at `/usr/bin/chromium` or set `CHROMIUM_PATH`. They start a loopback preview on port 4183. Optionally set `DCCC_SCREENSHOTS` to a directory for screenshots.

## Project files

| Path | Contents |
| --- | --- |
| [data/index.json](data/index.json) | Cases, claims, timeline events, original sources, and review history |
| [src/](src/) | App, styles, validation, and CSV/JSON export |
| [tests/](tests/) | Data checks and Chromium acceptance tests using synthetic inputs only where needed |
| [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md) | Field definitions, evidence states, and export formats |
| [docs/SOURCES.md](docs/SOURCES.md) | Source review and link-only reuse register |
| [DATA_RIGHTS.md](DATA_RIGHTS.md) | Rights, exclusions, and license proposals |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Correction and review workflow |
| [BUILD_LOG.md](BUILD_LOG.md) | AI assistance, user direction, and review limits |

This is a prototype. County agencies maintain the official records. The project owner’s source review and decisions on licensing and public release are pending.
