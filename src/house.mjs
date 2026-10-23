import { createHash } from 'node:crypto';

const SCHEMA = 'cannon.stack-squared-native-summary/v0';
const VIEW = 'tablelogic.house-presence/v0';
const PLAN_IDS = ['PLZ-TRANCH-ROOM-001', 'PLZ-HUMAN-SUPABARDO-001'];
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = (condition, reason) => { if (!condition) throw new Error(reason); };

export function canonical(x) {
  if (x === null || typeof x === 'boolean' || typeof x === 'string') return JSON.stringify(x);
  if (typeof x === 'number') {
    fail(Number.isSafeInteger(x), 'INVALID_NUMBER');
    return JSON.stringify(x);
  }
  if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
  fail(object(x), 'INVALID_JSON');
  return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonical(x[k])).join(',') + '}';
}

export function digest(x) {
  return createHash('sha256').update(canonical(x), 'utf8').digest('hex');
}

// CANNON owns native verification. This checker only refuses unsafe presentation.
// A JSON object that passes here is never itself proof of an authentic donor run.
export function validateInspection(s) {
  fail(object(s) && s.schema === SCHEMA, 'WRONG_CANNON_SCHEMA');
  fail(Array.isArray(s.source_records) && canonical(s.source_records) === canonical(PLAN_IDS), 'WRONG_PLAN_SOURCE');
  fail(s.source_count === 2 && s.original_git_witnesses === 5, 'SOURCE_CENSUS_MISMATCH');
  fail(s.native_planz_run === true && s.native_planz_frame_count === 2, 'PLANZ_REPORT_MISSING');
  fail(Array.isArray(s.native_planz_proposals) && s.native_planz_proposals.length === 2, 'PLANZ_PROPOSALS_MISSING');
  for (const proposal of s.native_planz_proposals) {
    fail(object(proposal) && typeof proposal.id === 'string' && proposal.id.length > 0, 'INVALID_PROPOSAL_ID');
    fail(proposal.authority === 'none' && proposal.selection === 'NONE', 'PLANZ_AUTHORITY_LAUNDERING');
    fail(Array.isArray(proposal.sourcePlanIds) && proposal.sourcePlanIds.length > 0 &&
      proposal.sourcePlanIds.every(id => PLAN_IDS.includes(id)), 'UNATTRIBUTABLE_PROPOSAL');
  }
  fail(s.native_ghot_local_system_hash === true, 'GHOT_REPORT_MISSING');
  for (const field of ['ghot_result_sha256', 'ghot_receipt_sha256']) {
    fail(typeof s[field] === 'string' && /^[0-9a-f]{64}$/.test(s[field]), 'INVALID_HASH_' + field);
  }
  for (const field of ['native_relatte_signed_crossing_id',
    'native_relatte_receive_receipt_id', 'native_relatte_hold_receipt_id']) {
    fail(typeof s[field] === 'string' && s[field].length > 0 && s[field].length <= 256,
      'MISSING_RECEIPT_' + field);
  }
  fail(s.signed_objects_cold_verified === 3, 'EXPECTED_THREE_NATIVE_WITNESSES');
  fail(s.disposition === 'HOLD' && s.receiver_admitted === false, 'RECEIVER_NOT_HELD');
  for (const k of ['external_effects', 'donor_mutations', 'git_merges']) fail(s[k] === 0, 'UNEXPECTED_EFFECT_' + k);
  fail(s.production_deployed === false && s.external_owner_identity_authenticated === false,
    'CLAIM_EXCEEDS_SOURCE');
  fail(Array.isArray(s.nonclaims) && s.nonclaims.length >= 5 &&
    s.nonclaims.every(x => typeof x === 'string'), 'NONCLAIM_REGISTER_MISSING');
  fail(!hasOwn(s, 'owner_admitted') && !hasOwn(s, 'execution_grant'), 'UNLICENSED_EXTRA_AUTHORITY');
  return s;
}

// "NATIVE_COLD_VERIFIED" is set only by the CLI *after* a successful original
// CANNON 018 verify invocation. It is descriptive, never an owner grant.
export function houseProjection(summary, verification = 'UNVERIFIED') {
  validateInspection(summary);
  fail(['UNVERIFIED', 'NATIVE_COLD_VERIFIED'].includes(verification), 'INVALID_VERIFICATION_MODE');
  const roles = [
    { organ: 'planZ', surface: 'two original SENSE plan records and proposal candidates',
      state: 'PROPOSED_ONLY', source_ids: [...summary.source_records] },
    { organ: 'CANNON', surface: 'stack-squared-018 original Git-object and native receipt verification',
      state: verification, source_witness_count: summary.original_git_witnesses },
    { organ: 'GHoT', surface: 'original local system.hash and persisted task receipt',
      state: 'READ_ONLY_HASH_NOT_ACT', output_sha256: summary.ghot_result_sha256 },
    { organ: 'reLATTE', surface: 'original signed crossing, receiver-signed RECEIVE and R3_HOLD',
      state: 'RECEIVED_AND_HELD_NOT_ADMITTED',
      crossing_id: summary.native_relatte_signed_crossing_id,
      receive_receipt_id: summary.native_relatte_receive_receipt_id,
      hold_receipt_id: summary.native_relatte_hold_receipt_id },
    { organ: 'STATIC OS', surface: 'portable read-only HOUSE inspection candidate',
      state: 'PROJECTION_ONLY_NOT_INSTALLED_OR_BOOTED', executable_capability: false },
  ];
  const body = {
    schema: VIEW,
    title: 'THE HOUSE TAKES ATTENDANCE',
    verification, disposition: 'HOLD',
    source: { schema: summary.schema, sha256: digest(summary), inspection: summary },
    roles,
    table: {
      question: 'What could these independently owned organs make possible together?',
      invitations: summary.native_planz_proposals.map(p => ({
        source_id: p.id, plan_ids: [...p.sourcePlanIds],
        disposition: 'PROPOSAL_ONLY', attention: 'REVIEW',
        authorized: false, executed: false
      })),
      possible_next_crossing: 'HUMAN_REVIEW_REQUIRED',
      human_consent: 'NOT_OBSERVED',
      owner_effect: 'NONE',
      known_gaps: [
        'No source-backed human consent or owner ACT',
        'No admitted reLATTE receiver effect',
        'No native TABLElogic adapter installed in STATIC OS',
        'No proof of an installed or booted STATIC OS image'
      ],
    },
    projection_authority: 'none',
    native_donor_calls_by_tablelogic: 0,
  };
  return { ...body, projection_sha256: digest(body) };
}

export function validateProjection(view) {
  fail(object(view) && view.schema === VIEW && typeof view.projection_sha256 === 'string', 'BAD_VIEW');
  const { projection_sha256, ...body } = view;
  fail(digest(body) === projection_sha256, 'VIEW_MUTATED');
  const expected = houseProjection(view.source.inspection, view.verification);
  fail(canonical(view) === canonical(expected), 'VIEW_CLAIMS_CHANGED');
  return view;
}
