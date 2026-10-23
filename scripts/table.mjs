#!/usr/bin/env node
/** TABLElogic is a read-only projection over owner-produced evidence, never a grant. */
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { houseProjection, validateProjection } from '../src/house.mjs';

const usage = [
  'node scripts/table.mjs preview CANNON_PUBLIC_INSPECTION.json [NEW_HOUSE_VIEW.json]',
  'node scripts/table.mjs native-verify CANNON_ROOT PLAN LOADOUT ROOTS NATIVE_OUTPUT_DIR [NEW_HOUSE_VIEW.json]',
  'node scripts/table.mjs verify-view HOUSE_VIEW.json',
].join('\n');
const read = path => {
  if (statSync(path).size > 512 * 1024) throw Error('INPUT_TOO_LARGE');
  return JSON.parse(readFileSync(path, 'utf8'));
};
const write = (view, path) => {
  const contents = JSON.stringify(view, null, 2) + '\n';
  if (path) {
    writeFileSync(resolve(path), contents, { flag: 'wx', mode: 0o600 });
    process.stdout.write('Created read-only view: ' + resolve(path) + '\n');
  } else process.stdout.write(contents);
};
try {
  const [op, ...args] = process.argv.slice(2);
  if (op === 'preview' && [1, 2].includes(args.length)) {
    write(houseProjection(read(resolve(args[0])), 'UNVERIFIED'), args[1]);
  } else if (op === 'native-verify' && [5, 6].includes(args.length)) {
    const [rootPath, planPath, loadoutPath, rootsPath, outputDir, viewPath] = args;
    const cannonRoot = realpathSync(resolve(rootPath));
    const roots = read(resolve(rootsPath));
    if (realpathSync(roots['the-static-collective/CANNON']) !== cannonRoot)
      throw Error('CANNON_ROOT_MISMATCH');
    // Invoke the ORIGINAL fixed CANNON 018 verifier with no shell.
    // Its source pin, native PlanZ replay, GHoT receipt checks and actual reLATTE
    // P-256 signature verification are owned by CANNON and their donors.
    execFileSync(process.execPath, [
      join(cannonRoot, 'scripts/stack-squared-018.mjs'),
      'verify', resolve(planPath), resolve(loadoutPath),
      resolve(rootsPath), resolve(outputDir)
    ], {
      cwd: cannonRoot, timeout: 120000, maxBuffer: 2 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    write(houseProjection(read(join(resolve(outputDir), 'public-inspection.json')),
      'NATIVE_COLD_VERIFIED'), viewPath);
  } else if (op === 'verify-view' && args.length === 1) {
    // Verifies only TABLElogic projection integrity, NEVER native signatures.
    const view = validateProjection(read(resolve(args[0])));
    process.stdout.write(JSON.stringify({
      schema: 'tablelogic.local-view-check/v0',
      projection_sha256: view.projection_sha256,
      projection_valid: true,
      native_signatures_reverified: false,
      authority: 'none'
    }, null, 2) + '\n');
  } else {
    process.stderr.write(usage + '\n');
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write('HOLD: ' + String(error.message).slice(0, 600) + '\n');
  process.exitCode = 1;
}
