#!/usr/bin/env node
const { deduplicate } = require('./report');
const path = require("path");
require('dotenv').config({ path: path.join(process.cwd(), '.env.a11y') });

const MERGE_STRATEGY = process.env.MERGE_STRATEGY || 'best';

deduplicate(MERGE_STRATEGY);