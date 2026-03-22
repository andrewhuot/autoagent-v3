import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:5173';
const OUTDIR = process.env.HOME + '/Desktop/AutoAgent-v3-Screenshots';

// Get dynamic IDs from backend
const treesRes = await fetch('http://localhost:8000/api/trees/');
const trees = await treesRes.json();
const TREE_ID = trees.find(t => t.name === 'Customer Support')?.id || trees[0]?.id;

const sessRes = await fetch('http://localhost:8000/api/sessions/');
const sessions = await sessRes.json();
const SESS_ID = sessions[0]?.id;

const expRes = await fetch(`http://localhost:8000/api/experiments/?session_id=${SESS_ID}`);
const exps = await expRes.json();
const EXP_ID = exps[0]?.id;

console.log(`Tree: ${TREE_ID}, Session: ${SESS_ID}, Experiment: ${EXP_ID}`);

mkdirSync(OUTDIR, { recursive: true });

const pages = [
  ['01-briefing', '/'],
  ['02-trees', '/trees'],
  ['03-tree-detail', `/trees/${TREE_ID}`],
  ['04-health-scan', `/health/${TREE_ID}`],
  ['05-training-live', `/training/${SESS_ID}`],
  ['06-experiment', `/experiments/${EXP_ID}`],
  ['07-configure', '/configure'],
  ['08-deploy', '/deploy'],
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

for (const [name, path] of pages) {
  const page = await context.newPage();
  try {
    console.log(`Screenshotting ${name} at ${path}...`);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUTDIR}/${name}.png`, fullPage: true });
    console.log(`  ✓ ${name}.png saved`);
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    // Take screenshot anyway on error
    try {
      await page.screenshot({ path: `${OUTDIR}/${name}-error.png`, fullPage: true });
    } catch {}
  }
  await page.close();
}

await browser.close();
console.log('Done!');
