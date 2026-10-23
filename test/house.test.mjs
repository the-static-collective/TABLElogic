import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { houseProjection, validateProjection, validateInspection, digest } from '../src/house.mjs';

const z = 'a'.repeat(64);
const fixture = () => ({
  schema: 'cannon.stack-squared-native-summary/v0',
  source_records: ['PLZ-TRANCH-ROOM-001', 'PLZ-HUMAN-SUPABARDO-001'],
  source_count: 2, original_git_witnesses: 5,
  native_planz_run: true, native_planz_frame_count: 2,
  native_planz_proposals: [
    { id: 'synthetic-proposal-A', chamber: 'SENSE', sourcePlanIds: ['PLZ-TRANCH-ROOM-001'], authority: 'none', selection: 'NONE' },
    { id: 'synthetic-proposal-B', chamber: 'SENSE', sourcePlanIds: ['PLZ-HUMAN-SUPABARDO-001'], authority: 'none', selection: 'NONE' }
  ],
  native_ghot_local_system_hash: true,
  ghot_result_sha256: z, ghot_receipt_sha256: 'b'.repeat(64),
  native_relatte_signed_crossing_id: 'synthetic-crossing',
  native_relatte_receive_receipt_id: 'synthetic-receive',
  native_relatte_hold_receipt_id: 'synthetic-hold',
  signed_objects_cold_verified: 3, disposition: 'HOLD', receiver_admitted: false,
  external_effects: 0, donor_mutations: 0, git_merges: 0, production_deployed: false,
  external_owner_identity_authenticated: false,
  nonclaims: ['synthetic fixture', 'no owner consent', 'no actual receiver admission',
    'hash not act', 'not deployed'],
});

test('one five-organ table, none silently gains authority', () => {
  const view = houseProjection(fixture());
  assert.equal(view.roles.length, 5);
  assert.deepEqual(view.roles.map(x => x.organ), ['planZ', 'CANNON', 'GHoT', 'reLATTE', 'STATIC OS']);
  assert.equal(view.disposition, 'HOLD');
  assert.equal(view.verification, 'UNVERIFIED');
  assert.equal(view.table.human_consent, 'NOT_OBSERVED');
  assert.equal(view.table.owner_effect, 'NONE');
  assert(view.table.invitations.every(x => !x.authorized && !x.executed));
  assert.equal(view.roles.at(-1).state, 'PROJECTION_ONLY_NOT_INSTALLED_OR_BOOTED');
  assert.deepEqual(validateProjection(view), view);
});

test('canonical commitments are insensitive to object key order', () => {
  assert.equal(digest({ a: 1, b: 2 }), digest({ b: 2, a: 1 }));
});
test('HOLD does not become ADMIT', () => {
  const f = fixture(); f.receiver_admitted = true;
  assert.throws(() => validateInspection(f), /RECEIVER_NOT_HELD/);
});
test('external effect cannot be laundered as a source proof', () => {
  const f = fixture(); f.external_effects = 1;
  assert.throws(() => validateInspection(f), /UNEXPECTED_EFFECT/);
});
test('planZ proposal remains proposed even when selected wording changes', () => {
  const f = fixture(); f.native_planz_proposals[0].selection = 'ACCEPT';
  assert.throws(() => validateInspection(f), /PLANZ_AUTHORITY_LAUNDERING/);
});
test('cannot substitute unrelated plan records', () => {
  const f = fixture(); f.source_records[0] = 'PRIVATE_PERSON';
  assert.throws(() => validateInspection(f), /WRONG_PLAN_SOURCE/);
});
test('cannot add inferred owner grant to native source summary', () => {
  const f = fixture(); f.execution_grant = 'yes';
  assert.throws(() => validateInspection(f), /UNLICENSED_EXTRA_AUTHORITY/);
});
test('view alteration is caught without pretending cryptographic donor recheck', () => {
  const v = houseProjection(fixture());
  v.roles[4].state = 'NATIVE_BOOTED';
  assert.throws(() => validateProjection(v), /VIEW_MUTATED/);
});
test('changing source while recomputing local digest still breaks exact reconstruction', () => {
  const v = houseProjection(fixture());
  v.roles[2].state = 'CAN_RUN_SHELL';
  const body = { ...v }; delete body.projection_sha256;
  v.projection_sha256 = digest(body);
  assert.throws(() => validateProjection(v), /VIEW_CLAIMS_CHANGED/);
});
test('CLI preview, read-only view check, and create-only behavior', () => {
  const root = mkdtempSync(join(tmpdir(), 'tablelogic-test-'));
  const src = join(root, 'summary.json'), viewPath = join(root, 'view.json');
  writeFileSync(src, JSON.stringify(fixture()));
  const cli = resolve('scripts/table.mjs');
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(run(['preview', src, viewPath]).status, 0);
  const view = JSON.parse(readFileSync(viewPath, 'utf8'));
  assert.equal(view.verification, 'UNVERIFIED');
  assert.equal(run(['verify-view', viewPath]).status, 0);
  const duplicate = run(['preview', src, viewPath]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /EEXIST/);
});
test('CLI native mode cannot pass arbitrary roots and invent native verification', () => {
  const root = mkdtempSync(join(tmpdir(), 'tablelogic-bad-'));
  const roots = join(root, 'roots.json');
  writeFileSync(roots, JSON.stringify({ 'the-static-collective/CANNON': root }));
  const run = spawnSync(process.execPath, [
    resolve('scripts/table.mjs'), 'native-verify', root, 'a', 'b', roots, root
  ], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /HOLD:/);
});
