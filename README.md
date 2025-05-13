# @sunrise/axe-playwright-report

Open-source library for generating accessibility dashboard reports with Playwright and axe-core.

## Main Aim

The primary goal of this library is to enhance standard UI automation tests and the Page Object Pattern by enabling integrated accessibility scans. Instead of maintaining separate accessibility tests—which often duplicate the structure of regular UI tests—this library lets you trigger accessibility checks directly within your existing test flows. This approach reduces maintenance overhead when test flows change, as accessibility scans can be performed at any point in your current tests without the need for dedicated accessibility test cases.

#### ℹ️ Reasonable Remark: 
> Page object methods are reused in multiple tests, which will create multiple reports for the same page.
> 
> During dashboard generation, the library will automatically de-duplicate results and retain only the scan with the most accessibility issues for each page.

## Features

- **Playwright + axe-core integration**: Easily scan your web pages for accessibility issues during Playwright tests.
- **Dashboard report**: Generates a filterable HTML dashboard summarizing all accessibility findings.
- **CLI tool**: Build and view reports with a single command.
- **Customizable**: Configure scan options, output directory, and screenshot capture.
- **Reuse of UI automation tests**: Leverage existing Page Object Pattern methods to run accessibility scans without duplicating test logic.

## What This Library Offers

1. **@axe() decorator**: Runs an accessibility scan before the method body is executed, allowing you to integrate accessibility checks seamlessly into your existing test methods.
2. **axe-report-build command**: Generates a dashboard report with backward compatibility for reports generated with axe-core/playwright.

## Installation

```bash
npm install sunrise-axe-report --save-dev
```

## Usage

### 1. Decorate your Playwright test methods

```typescript
import { axe } from 'sunrise-axe-report';

class MyTest {
  page: Page;

  @axe()
  async testHomePage() {
    await this.page.goto('https://example.com');
    // ... your test logic ...
  }
}
```

- The `@axe()` decorator will run an accessibility scan before the decorated method.
- Results are saved as JSON in the output directory (default: `sunrise-axe-dashboard/pages`).


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
- custom output directory (default: `sunrise-axe-dashboard`)
- enable/disable screenshots capture (default: `off`)
- filter rules by axe-core tags (default: `no filtering, all rules included`)

Create a `.env.a11y` file in your project root:

```
SCAN=on
OUTPUT_DIR=custom-report-dir
SCREENSHOT=on
TAGS=wcag2a,wcag2aa
```

- `SCAN`: Set to `on` to enable scanning.
- `OUTPUT_DIR`: Directory for report output (default: `sunrise-axe-dashboard`).
- `SCREENSHOT`: Set to `on` to capture screenshots of issues.
- `TAGS`: Comma-separated list of axe-core tags to filter rules.

### 3. Generate the dashboard report

After running your tests, build the dashboard:

```bash
npx sunrise-axe-report-build
```

This will generate an interactive HTML dashboard in your output directory.

> #### Backward Compatibility with Axe-core/playwright
> if you have existing reports generated with axe-core/playwright, you can still use this library to build the dashboard. 
> Just place your existing JSON report files in the `sunrise-axe-dashboard/pages` directory before running the `sunrise-axe-report-build` command.

## CLI

- `sunrise-axe-report-build`: Aggregates all scan results and builds the dashboard HTML.

## Output

- **Dashboard**: `index.html` and supporting files in your output directory.
- **Per-page results**: JSON files for each scanned page.
- **Screenshots**: PNGs highlighting issues (if enabled).

## License

MIT