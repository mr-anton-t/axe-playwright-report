#!/usr/bin/env node
const args = process.argv.slice(2);
const command = args[0];
const build = require('./buildReport.js');
const path = require("path");

if (command === 'build-report') {
    build.main()
} else if (command === 'merge-reports') {
    const path = require("path");
    require('dotenv').config({ path: path.join(process.cwd(), '.env.a11y') });
    const MERGE_STRATEGY = process.env.MERGE_STRATEGY || 'best';
    console.log('Merging accessibility reports using strategy:', MERGE_STRATEGY);
    build.deduplicate(MERGE_STRATEGY);
    console.log('Done');
} else if (command === 'test') {
    build.main()
    if (args.length > 1){
        if (args[1].includes("--allow-failure")) {
            build.test(true)
        }
    }
    else {
        build.test()
    }
} else {
    if (args.length > 0) console.log(`Unknown command: ${command}\n`);
    console.log('Available commands:');
    console.log('  build-report   - Build accessibility report');
    console.log('  merge-reports  - Merge accessibility reports');
    console.log('  test           - Check accessibility baselines');
    console.log('');
    console.log('Usage: npx axe-playwright-report <command>');
    process.exit(1);
}