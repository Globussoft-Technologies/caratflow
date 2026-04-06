import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface CoverageSummaryEntry {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

interface CoverageSummary {
  total: {
    lines: CoverageSummaryEntry;
    statements: CoverageSummaryEntry;
    functions: CoverageSummaryEntry;
    branches: CoverageSummaryEntry;
  };
}

interface PackageCoverage {
  name: string;
  path: string;
  thresholds: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

const packages: PackageCoverage[] = [
  {
    name: '@caratflow/utils',
    path: 'packages/utils/coverage/coverage-summary.json',
    thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
  },
  {
    name: '@caratflow/api',
    path: 'apps/api/coverage/coverage-summary.json',
    thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
  },
];

const rootDir = resolve(__dirname, '..');

function pad(str: string, len: number): string {
  return str.padEnd(len);
}

function padNum(num: number, len: number): string {
  return `${num.toFixed(1)}%`.padStart(len);
}

function main(): void {
  console.log('\n=== CaratFlow Coverage Report ===\n');

  const header = `${pad('Package', 22)} ${pad('Lines', 10)} ${pad('Functions', 10)} ${pad('Branches', 10)} ${pad('Statements', 10)} Status`;
  console.log(header);
  console.log('-'.repeat(header.length));

  let allPassing = true;

  for (const pkg of packages) {
    const summaryPath = resolve(rootDir, pkg.path);

    if (!existsSync(summaryPath)) {
      console.log(`${pad(pkg.name, 22)} -- no coverage data found --`);
      allPassing = false;
      continue;
    }

    const raw = readFileSync(summaryPath, 'utf-8');
    const summary: CoverageSummary = JSON.parse(raw);
    const { lines, functions, branches, statements } = summary.total;

    const belowThreshold: string[] = [];
    if (lines.pct < pkg.thresholds.lines) belowThreshold.push('lines');
    if (functions.pct < pkg.thresholds.functions) belowThreshold.push('functions');
    if (branches.pct < pkg.thresholds.branches) belowThreshold.push('branches');
    if (statements.pct < pkg.thresholds.statements) belowThreshold.push('statements');

    const status = belowThreshold.length === 0 ? 'PASS' : 'FAIL';
    if (belowThreshold.length > 0) allPassing = false;

    console.log(
      `${pad(pkg.name, 22)} ${padNum(lines.pct, 10)} ${padNum(functions.pct, 10)} ${padNum(branches.pct, 10)} ${padNum(statements.pct, 10)} ${status}`
    );

    if (belowThreshold.length > 0) {
      console.log(`  Below threshold: ${belowThreshold.join(', ')}`);
    }
  }

  console.log('-'.repeat(header.length));
  console.log(`\nOverall: ${allPassing ? 'ALL PASSING' : 'SOME BELOW THRESHOLD'}\n`);

  if (!allPassing) {
    process.exit(1);
  }
}

main();
