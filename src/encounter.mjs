import {createHash} from 'node:crypto';
import {canonical} from './house.mjs';
import {verifyListening} from '../scripts/verify-listening.mjs';

const fail = (condition,why) => {if (!condition) throw Error(why)};
export const hash = x => createHash('sha256').update(typeof x==='string'?Buffer.from(x,'utf8'):Buffer.from(canonical(x),'utf8')).digest('hex');
const schema = 'tablelogic.encounter/v0';
const choices = ['KEEP_AS_QUESTION','INVITE_LOCAL_REVIEW','DECLINE'];
const fixtureClock = '2026-10-23T14:00:00.000Z';
const sourceStatus = ['LOCAL_PINNED_READ','UNAVAILABLE_OFFLINE'];

export function assembleEncounter(listening, capabilities, engine){
  verifyListening(listening);
  fail(Array.isArray(capabilities) && capabilities.length>=3 && capabilities.length<=32,'INVALID_ORIGINAL_WEBZ_CATALOG');
  fail(engine && typeof engine.Jar==='function' && typeof engine.propose==='function' &&
    typeof engine.cross==='function' && typeof engine.MockKinshipRelay==='function','ORIGINAL_JARVIS_REQUIRED');
  const byId=new Map(capabilities.map(c=>[c.id,c]));
  fail(byId.size===capabilities.length,'DUPLICATE_ORIGINAL_CAPABILITY');
  const qsha=hash(listening.question);
  const readings=listening.aperture.readings;
  fail(readings.length>0 && readings.length<=8 && readings.every(x=>typeof x.id==='string' &&
    /^[a-z][a-z0-9.-]{0,63}$/i.test(x.id)) && new Set(readings.map(x=>x.id)).size===readings.length,
    'AMBIGUOUS_READING_SCOPE');
  fail(listening.webz.selected.length===3,'EXPECTED_THREE_WEBZ_CANDIDATES');
  const entries=[];
  for(const reading of readings){
    for(const selection of listening.webz.selected){
      const declaration=byId.get(selection.id);
      fail(declaration && declaration.name===selection.name &&
        sourceStatus.includes(selection.status) && selection.callable===false && selection.authority==='none',
        'WEBZ_CANDIDATE_NOT_SOURCE_OWNED');
      const key=reading.id+'@'+selection.id;
      const stem=qsha.slice(0,20)+'.'+hash(key).slice(0,16);
      // Distinct self-contained **hypothetical** records that reference a particular
      // question. These are *not* real persons, requests, available services or offers.
      const need={
        schema:'jarvis.particular/v0',id:'tablelogic.question.'+stem,
        kind:'need',steward:'fictional-question-witness',
        category:'question-attention-fixture',region:'tablelogic-offline-fixture',quantity:1,
        unit:'review',status:'open',
        label:'Hypothetical review slot for exact original question sha256:'+qsha
      };
      const offer={
        schema:'jarvis.particular/v0',id:'tablelogic.catalog.'+stem,
        kind:'offer',steward:'fictional-catalog-witness-'+selection.id,
        category:'question-attention-fixture',region:'tablelogic-offline-fixture',quantity:1,
        unit:'review',status:'open',
        label:'Hypothetical source-inspection candidate '+declaration.name
      };
      const jar=new engine.Jar([need,offer]);
      const proposal=engine.propose(jar,need.id,{at:fixtureClock});
      fail(proposal && proposal.needId===need.id && proposal.offerId===offer.id &&
        proposal.action==='kinship.mock.broadcast/v0','ORIGINAL_JARVIS_PROPOSAL_MISMATCH');
      const held=engine.cross({jar,proposal,grants:[],relay:new engine.MockKinshipRelay(),at:fixtureClock});
      fail(held.receipt?.kind==='HOLD' && held.receipt?.semanticEffect==='none' &&
        held.receipt?.externalDelivery===false && held.message===null,'ORIGINAL_JARVIS_HOLD_REFUSED');
      const status=selection.id==='graft'?
        'GRAFT_NURSERY_STAGING_HOLD':selection.status==='LOCAL_PINNED_READ'?
        'READ_ONLY_PUBLIC_SOURCE': 'UNAVAILABLE_SOURCE_CHECK';
      entries.push({
        id:'tablelogic.invitation.'+hash([qsha,reading.id,selection.id]).slice(0,24),
        question_sha256:qsha,reading_id:reading.id,
        candidate_id:selection.id,candidate_name:declaration.name,
        published_role:declaration.role,
        source_lookup_status:selection.status,
        possibility:'Inspect this catalog item while preserving the original question and reading.',
        claim:'HYPOTHETICAL_REVIEW_PAIR_NOT_A_HUMAN_NEED_OR_REAL_OFFER',
        compatibility:'DECLARED_IDENTICAL_FICTIONAL_CATEGORY_NOT_SEMANTIC_EVIDENCE',
        jarvis_original_proposal_id:proposal.id,
        jarvis_original_hold_receipt_id:held.receipt.id,
        jarvis_original_action_kind:proposal.action,
        disposition:'HOLD',
        actual_capability_call:false,
        native_jarvis_fixture_used:true,
        authority:'none',
        nursery_status:selection.id==='graft' ? listening.graft.status : null,
        proposal_status:status,
        eligible_local_choice:choices
      });
    }
  }
  fail(new Set(entries.map(x=>x.id)).size===entries.length,'INVITATION_COLLISION');
  const content={
    schema,
    title:'THE TABLE LISTENS, THEN INVITES REVIEW',
    input:{
      question:listening.question,
      question_sha256:qsha,
      listening_source_sha256:listening.local_sha256,
      listening,
      original_workbench_status:listening.aperture.status,
      multiple_readings_preserved:readings.length>1,
    },
    contributions:{
      workbench:'Original source APERTURE readings remain alternative interpretations, not adopted intentions.',
      jarvis:'Original engine proposes exact hypothetical question-attention pairs and returns native HOLD without grants.',
      webz:'Original query-selected public capability names are candidate review doors only.',
      graft:'Public nursery manifest may describe a held candidate; not imported source or permission.',
      tablelogic:'Explicitly binds one original question, alternate readings, and selected source doors.'
    },
    invitations:entries,
    choices,
    state:'HOLD_HUMAN_REVIEW',
    execution_grants:0,
    external_effects:0,
    requests_dispatched:0,
    public_published:false,
    proposal_selection:'NONE',
    owner_admission:false,
    participant_consent_observed:false,
    native_model_called:false,
    signer_authorized:false,
    source_claim_limit:'ORIGINAL_PROGRAMS_EXERCISED_ONLY_IN_EXACT_SPECIMEN',
    operator_message:'Invitation means local review opportunity only; nothing was sent to a named person or organization.'
  };
  return {...content,local_sha256:hash(content)};
}

export function validateEncounter(e){
  fail(e && typeof e==='object' && e.schema===schema,'ENCOUNTER_SCHEMA');
  const {local_sha256,...payload}=e;
  fail(typeof local_sha256==='string' && hash(payload)===local_sha256,'ENCOUNTER_DIGEST_CHANGED');
  verifyListening(e.input?.listening);
  fail(e.input.question===e.input.listening.question &&
    e.input.question_sha256===hash(e.input.question) &&
    e.input.listening_source_sha256===e.input.listening.local_sha256 &&
    e.input.original_workbench_status===e.input.listening.aperture.status &&
    e.input.multiple_readings_preserved===(e.input.listening.aperture.readings.length>1),
    'ENCOUNTER_PARENT_CHANGED');
  fail(e.state==='HOLD_HUMAN_REVIEW'&&e.execution_grants===0&&e.external_effects===0&&
    e.requests_dispatched===0&&e.public_published===false&&e.proposal_selection==='NONE'&&
    e.owner_admission===false&&e.participant_consent_observed===false&&
    e.native_model_called===false&&e.signer_authorized===false,'ENCOUNTER_UNAUTHORIZED_AUTHORITY');
  fail(Array.isArray(e.invitations)&&e.invitations.length===
    3*e.input.listening.aperture.readings.length &&
    e.invitations.length<=24 &&
    canonical(e.choices)===canonical(choices),'ENCOUNTER_SELECTION_CHANGED');
  const read=new Set(e.input.listening.aperture.readings.map(x=>x.id));
  const sources=new Map(e.input.listening.webz.selected.map(x=>[x.id,x]));
  const names=new Set();
  for(const p of e.invitations){
    fail(read.has(p.reading_id)&&sources.has(p.candidate_id) &&
      p.question_sha256===e.input.question_sha256&&
      p.id==='tablelogic.invitation.'+hash([e.input.question_sha256,p.reading_id,p.candidate_id]).slice(0,24) &&
      p.candidate_name===sources.get(p.candidate_id).name&&
      p.source_lookup_status===sources.get(p.candidate_id).status&&
      p.disposition==='HOLD'&&p.authority==='none'&&
      p.actual_capability_call===false&&p.native_jarvis_fixture_used===true &&
      p.claim==='HYPOTHETICAL_REVIEW_PAIR_NOT_A_HUMAN_NEED_OR_REAL_OFFER' &&
      p.compatibility==='DECLARED_IDENTICAL_FICTIONAL_CATEGORY_NOT_SEMANTIC_EVIDENCE' &&
      p.jarvis_original_action_kind==='kinship.mock.broadcast/v0' &&
      typeof p.jarvis_original_proposal_id==='string'&&p.jarvis_original_proposal_id.startsWith('jarvis-proposal-v0:')&&
      typeof p.jarvis_original_hold_receipt_id==='string'&&p.jarvis_original_hold_receipt_id.startsWith('jarvis-receipt-v0:')&&
      canonical(p.eligible_local_choice)===canonical(choices),'ENCOUNTER_PROPOSAL_LAUNDERED');
    fail(p.nursery_status===(p.candidate_id==='graft'?e.input.listening.graft.status:null),'NURSERY_IMPORT_LAUNDERED');
    const key=p.reading_id+'@'+p.candidate_id;
    fail(!names.has(key),'DUPLICATED_INVITATION');
    names.add(key);
  }
  return e;
}
export function makeLocalReturn(e,choice,invitationId=null){
  validateEncounter(e);
  fail(choices.includes(choice),'UNSUPPORTED_LOCAL_CHOICE');
  const target=invitationId===null?null:e.invitations.find(p=>p.id===invitationId);
  fail(invitationId===null||target,'UNKNOWN_OR_STALE_INVITATION');
  fail(choice==='KEEP_AS_QUESTION'||target,'TARGET_REQUIRED');
  const payload={
    schema:'tablelogic.local-review-return/v0',
    parent_encounter_sha256:e.local_sha256,
    original_question_sha256:e.input.question_sha256,
    invitation_id:target?.id??null,
    choice,
    disposition:choice==='DECLINE'?'LOCALLY_DECLINED':'UNSENT_LOCAL_REVIEW',
    human_operator_assertion:'UNAUDITED_LOCAL_CHOICE',
    source_execution_reverified:false,
    real_human_consent_verification:false,
    delivered:false,
    receiver:'NONE',
    external_effects:0,
    owner_authority:'none'
  };
  return {...payload,local_sha256:hash(payload)};
}
export function validateLocalReturn(e,r){
  validateEncounter(e);
  fail(r && r.schema==='tablelogic.local-review-return/v0','RETURN_SCHEMA');
  const {local_sha256,...payload}=r;
  fail(local_sha256===hash(payload)&&r.parent_encounter_sha256===e.local_sha256&&
    r.original_question_sha256===e.input.question_sha256,'RETURN_SOURCE_STALE_OR_MUTATED');
  fail(choices.includes(r.choice)&&
    (r.invitation_id===null||e.invitations.some(p=>p.id===r.invitation_id))&&
    (r.choice==='KEEP_AS_QUESTION'||r.invitation_id!==null) &&
    r.disposition===(r.choice==='DECLINE'?'LOCALLY_DECLINED':'UNSENT_LOCAL_REVIEW') &&
    r.human_operator_assertion==='UNAUDITED_LOCAL_CHOICE' &&
    r.source_execution_reverified===false&&r.real_human_consent_verification===false&&
    r.delivered===false&&r.receiver==='NONE'&&r.external_effects===0&&r.owner_authority==='none',
    'RETURN_AUTHORITY_LAUNDERED');
  return r;
}
