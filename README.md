# axe-playwright-report

[![npm version](https://img.shields.io/npm/v/axe-playwright-report.svg)](https://www.npmjs.com/package/axe-playwright-report)

Open-source library for generating accessibility dashboard reports with Playwright and axe-core.

![Example Dashboard Report](./assets/dashboard_example.png)

## Main Aim

The primary goal of this library is to enhance standard UI automation tests and the Page Object Pattern by enabling integrated accessibility scans. Instead of maintaining separate accessibility tests—which often duplicate the structure of regular UI tests—this library lets you trigger accessibility checks directly within your existing test flows. This approach reduces maintenance overhead when test flows change, as accessibility scans can be performed at any point in your current tests without the need for dedicated accessibility test cases.

#### ℹ️ Reasonable Remark:
> q: Page object methods are reused in multiple tests, which will create multiple reports for the same page.
>
> a: During dashboard generation, the library will automatically de-duplicate results and retain only the scan with the most accessibility issues for each page.

## Features

- **Playwright + axe-core integration**: Easily scan your web pages for accessibility issues during Playwright tests.
- **Dashboard report**: Generates a filterable HTML dashboard summarizing all accessibility findings.
- **Customizable**: Configure scan options, output directory, and screenshot capture.
- **Reuse of UI automation tests**: Leverage existing Page Object Pattern methods to run accessibility scans without duplicating test logic.

## What This Library Offers

1. **@axeScan() decorator**: Runs an accessibility scan after the method body is executed, allowing you to integrate accessibility checks seamlessly into your existing test methods.
2. **build-report command**: Generates a dashboard report with backward compatibility for reports generated with axe-core/playwright.

## Installation

```bash
npm install axe-playwright-report --save-dev
```

## Usage

### 1. Decorate your Playwright test methods

```typescript
import { axeScan } from 'axe-playwright-report';

class MyTest {
    page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    @axeScan()
    async testHomePage() {
        await this.page.goto('https://example.com');
        // ... your test logic ...
    }
}
```

- The `@axeScan()` decorator will run an accessibility scan after the decorated method.
- Results are saved as JSON in the output directory (default: `axe-playwright-report/pages`).


> ### ⚠️ **Limitations**
> The Page Object Class must contain an object of type `Page`. If you decompose the page and use `Locator` as a base for searching elements, the accessibility scan will be skipped.
>
> **Applicable ✅**: `new sideMenu(page)`
>
> **Not-applicable ❌**: `new sideMenu(page.locator('#sideMenu'))`

### 2. Configure scan options (optional)

Having accessibility env file gives you the flexibility to customize your scan settings.
With config file it allows:
- enable/disable scanning (default: `on`)
- custom output directory (default: `axe-playwright-report`)
- enable/disable screenshots capture (default: `off`)
- filter rules by axe-core tags (default: `no filtering, all rules included`)
- merge reports strategy (default: `best`)
    - `none` - keep all reports,
    - `exact` - merge only identical reports,
    - `best` - keeps the report with the most accessibility issues

Create a `.env.a11y` file in your project root:

```
SCAN=on
OUTPUT_DIR=custom-report-dir
MERGE_REPORTS=best
SCREENSHOT=on
TAGS=wcag2a,wcag2aa
```

- `SCAN`: Set to `on` to enable scanning.
- `OUTPUT_DIR`: Directory for report output (default: `axe-playwright-report`).
- `SCREENSHOT`: Set to `on` to capture screenshots of issues.
- `TAGS`: Comma-separated list of axe-core tags to filter rules.

### 3. Generate the dashboard report

After running your tests, build the dashboard:

```bash
npx axe-playwright-report build-report
```

This will generate an interactive HTML dashboard in your output directory.

> #### Backward Compatibility with Axe-core/playwright
> if you have existing reports generated with axe-core/playwright, you can still use this library to build the dashboard.
> Just place your existing JSON report files in the `axe-playwright-report/pages` directory and run the `build-report` command.

## Output

- **Dashboard**: `index.html` and supporting files in your output directory.
- **Per-page results**: JSON files for each scanned page.
- **Screenshots**: PNGs highlighting issues (if enabled).

### Example Report

Below is an example of the generated dashboard report:

![Example Report Page](./assets/report_example_1.png)
![Example Report Page Expanded](./assets/report_example_2.png)

## License

MIT