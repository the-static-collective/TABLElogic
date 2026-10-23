import {createHash} from 'node:crypto';
import {canonical} from './house.mjs';
import {validateEncounter} from './encounter.mjs';

const fail = (ok, why) => {if(!ok)throw Error(why)};
const sha = value => createHash('sha256').update(
  typeof value==='string'?Buffer.from(value,'utf8'):Buffer.from(canonical(value),'utf8')).digest('hex');
const PUBLIC_PIN='03684938fceb8ff4d614413c95634220895fa404';
const KINDS=['question','invitation','door','song'];
const SCHEMA='tablelogic.feast-return/v0';

// The original webZ public author verifies its OWN evidence. TABLElogic separately
// validates its OWN original-house boundary. Their agreement is the crossing,
// not evidence that either party has borrowed the other's authority.
export async function setFeast(publicReturn, native, verifyOriginalPublic) {
  fail(typeof verifyOriginalPublic==='function' && await verifyOriginalPublic(publicReturn)===true,
    'ORIGINAL_PUBLIC_EVIDENCE_REJECTED');
  validateEncounter(native);
  fail(publicReturn?.schema==='ask-jarvis/return-v0' &&
    publicReturn.evidence?.schema==='ask-jarvis/evidence-v1' &&
    publicReturn.evidence.signature==='UNSIGNED' &&
    typeof publicReturn.receiptHash==='string'&&/^sha256:[a-f0-9]{64}$/.test(publicReturn.receiptHash),
    'UNSIGNED_ORIGINAL_PUBLIC_ONLY');
  fail(publicReturn.encounter?.schema==='ask-jarvis/encounter-v1' &&
    publicReturn.encounter.signal===native.input.question &&
    publicReturn.workbenchRequest?.task?.question===native.input.question &&
    publicReturn.workbenchRequest.dispatch==='MANUAL_EXPORT_ONLY' &&
    publicReturn.workbenchRequest.authority==='NONE' &&
    publicReturn.workbenchRequest.task.operation==='PREPARE_DRAFT',
    'QUESTION_OR_PUBLIC_HANDOFF_DIVERGED');
  fail(KINDS.includes(publicReturn.return?.kind) &&
    publicReturn.return.kind===publicReturn.workbenchRequest.task.kind &&
    publicReturn.return.status==='LOCAL_UNSIGNED_DRAFT',
    'UNAUTHORIZED_PUBLIC_ARTIFACT');
  fail(Array.isArray(publicReturn.sources)&&publicReturn.sources.length===3 &&
    publicReturn.sources.every(s=>['INSPECTED','UNAVAILABLE'].includes(s.status)&&
      (s.status!=='INSPECTED'||/^sha256:[a-f0-9]{64}$/.test(s.sha256))),
    'UNWARRANTED_SOURCE_PROOF');
  const proof={
    schema:SCHEMA,
    state:'HOLD_PUBLIC_AND_NATIVE',
    question:native.input.question,
    question_sha256:native.input.question_sha256,
    public:{
      source:'the-static-collective/webZ@'+PUBLIC_PIN,
      kind:publicReturn.return.kind,
      original_return:publicReturn,
      original_receipt_sha256:publicReturn.receiptHash,
      claim:'ORIGINAL_PUBLIC_V0_UNSIGNED_SOURCE_INSPECTION_AND_DRAFT',
      message:'One usable public draft without native execution'
    },
    native:{
      source:'the-static-collective/TABLElogic/HOUSE-003',
      encounter:native,
      original_encounter_sha256:native.local_sha256,
      state:'HOLD_HUMAN_REVIEW',
      invitations:native.invitations.map(i=>({
        id:i.id,reading_id:i.reading_id,candidate_id:i.candidate_id,
        native_jarvis_receipt_id:i.jarvis_original_hold_receipt_id,disposition:'HOLD',
        sent:false,actual_capability_call:false
      }))
    },
    crossing:{
      method:'ONE_EXACT_QUESTION_TWO_INDEPENDENT_READ_ONLY_RETURNS',
      public_evidence_digest_matches_original:true,
      original_language_interpretations_preserved:true,
      source_canon_selection:'NONE',
      native_jarvis_actual_disposition:'HOLD',
      public_draft_has_receiver:false,
      source_documents_are_not_running_capabilities:true,
      public_workbench_dispatch:'MANUAL_EXPORT_ONLY',
      permissions:'NONE',
      external_effects:0,
      message:'Source document, draft, and native hypothesis are different things. An invitation is not an ACT.'
    },
    presentation:{
      available_return_kinds:KINDS,
      return_kind:publicReturn.return.kind,
      inspect_native_optional:true,
      native_inspection_default:'COLLAPSED',
      publication:'NOT_DEPLOYED',
      choices:['KEEP_AS_QUESTION','INSPECT_EVIDENCE','DECLINE']
    },
    donor_programs_merged:false,
    permissions_inferred:false,
    independent_owner_admit:false,
    external_messages_sent:0,
    externally_published:false
  };
  return {...proof,local_sha256:sha(proof)};
}

export async function validateFeast(e, verifyOriginalPublic){
  fail(e && e.schema===SCHEMA && typeof e.local_sha256==='string','FEAST_SCHEMA');
  const {local_sha256,...body}=e;
  fail(sha(body)===local_sha256,'FEAST_LOCAL_DIGEST_CHANGED');
  const native=validateEncounter(e.native?.encounter);
  const p=e.public?.original_return;
  // Replay all contracts from originals; do not trust a digest as a producer signature.
  const rebuilt=await setFeast(p,native,verifyOriginalPublic);
  fail(canonical(e)===canonical(rebuilt),'FEAST_STRUCTURE_CHANGED');
  return e;
}
