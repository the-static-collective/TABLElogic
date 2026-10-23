import test from 'node:test';
import assert from 'node:assert/strict';
import {hash,assembleEncounter,validateEncounter,makeLocalReturn,validateLocalReturn} from '../src/encounter.mjs';

const CAPS=[
 {id:'graft',name:'GRAFT',role:'Inspect independent source branches'},
 {id:'planz',name:'planZ',role:'Possibilities and plans'},
 {id:'jarvis',name:'JAR;VIS',role:'Attention and bounded proposals'}
];
const QUESTIONSHA='a'.repeat(64);
function listening(readings=[{id:'literal.carrier'}]){
 const question='Could a public project branch help a community potluck?';
 const a={schema:'tablelogic.listening-table/v0',disposition:'HOLD_HUMAN_REVIEW',question,context:null,
   original_workbench_source_commit:'53db559bbc510ad1003a0f8330d1673dcd04d7a0',
   original_jarvis_source_commit:'20fa89a340251443afa7afbdb5432ed11fce88a6',
   aperture:{raw_text:question,status:'unresolved',readings,
     gaps:[{code:'no_deterministic_fixture'}],triad:[]},
   jarvis:{disposition:'HOLD',authority:'none',externally_sent:false,user_question_matched:false},
   webz:{offline_local_fetch_only:true,live_website_unchanged:true,selected:[
     {id:'graft',name:'GRAFT',status:'LOCAL_PINNED_READ',callable:false,authority:'none'},
     {id:'planz',name:'planZ',status:'UNAVAILABLE_OFFLINE',callable:false,authority:'none'},
     {id:'jarvis',name:'JAR;VIS',status:'UNAVAILABLE_OFFLINE',callable:false,authority:'none'}]},
   graft:{status:'STAGING_HOLD',original_source_code_imported:false,admission:false},
   house_001_projection_sha256:QUESTIONSHA,
   choices:['KEEP_AS_QUESTION','INSPECT_SOURCES','DECLINE'],
   actual_user_interpretation_asserted:false,real_people_consented:false,
   external_effects:0,source_owner_admission:false,genuine_semantic_match_claimed:false,
   no_network_source_fetch:true};
 return {...a,local_sha256:hash(a)};
}
const trace=[];
const mockOriginalEngine={
 Jar:class{constructor(records){trace.push(records);this.records=records;}},
 propose:(jar,id)=>({needId:id,offerId:jar.records[1].id,action:'kinship.mock.broadcast/v0',
   id:'jarvis-proposal-v0:'+hash([id,jar.records[1].id])}),
 cross:({jar,proposal,grants})=>{
   assert.equal(grants.length,0);
   return {receipt:{kind:'HOLD',semanticEffect:'none',externalDelivery:false,
     id:'jarvis-receipt-v0:'+hash(proposal.id)},message:null};},
 MockKinshipRelay:class{}
};
function rebuild(e){const {local_sha256,...b}=e;return {...b,local_sha256:hash(b)}}

test('same literal question binds 3 source doors to original JAR;VIS held proposals',()=>{
 trace.length=0;
 const e=assembleEncounter(listening(),CAPS,mockOriginalEngine);
 assert.equal(validateEncounter(e),e);
 assert.equal(e.invitations.length,3);
 assert.deepEqual(e.invitations.map(i=>i.candidate_id),['graft','planz','jarvis']);
 assert(e.invitations.every(i=>i.question_sha256===hash(e.input.question)));
 assert(e.invitations.every(i=>i.disposition==='HOLD'&&!i.actual_capability_call));
 assert(trace.every(pair=>pair[0].id.startsWith('tablelogic.question.')&&
   pair[1].label.startsWith('Hypothetical source-inspection candidate')));
 assert.equal(e.invitations[0].nursery_status,'STAGING_HOLD');
 assert.equal(e.invitations[1].nursery_status,null);
});
test('distinct Workbench readings remain independent invitations, never selected',()=>{
 const e=assembleEncounter(listening([{id:'bank.financial'},{id:'bank.river'},{id:'bank.maneuver'}]),CAPS,mockOriginalEngine);
 assert.equal(e.invitations.length,9);
 assert.equal(e.input.multiple_readings_preserved,true);
 assert.equal(e.proposal_selection,'NONE');
 assert.equal(new Set(e.invitations.map(x=>x.id)).size,9);
 validateEncounter(e);
});
test('human may locally invite review or decline; neither sends or grants consent',()=>{
 const e=assembleEncounter(listening(),CAPS,mockOriginalEngine);
 const chosen=e.invitations[0].id;
 for(const choice of ['INVITE_LOCAL_REVIEW','DECLINE','KEEP_AS_QUESTION']){
   const r=makeLocalReturn(e,choice,choice==='KEEP_AS_QUESTION'?null:chosen);
   assert.equal(validateLocalReturn(e,r),r);
   assert.equal(r.delivered,false);assert.equal(r.receiver,'NONE');assert.equal(r.external_effects,0);
 }
 assert.throws(()=>makeLocalReturn(e,'EXECUTE',chosen),/UNSUPPORTED_LOCAL_CHOICE/);
 assert.throws(()=>makeLocalReturn(e,'INVITE_LOCAL_REVIEW','stale'),/UNKNOWN_OR_STALE_INVITATION/);
});
test('forged permission is refused even when attacker recomputes local digest',()=>{
 const e=assembleEncounter(listening(),CAPS,mockOriginalEngine);
 const x=rebuild({...e,participant_consent_observed:true});
 assert.throws(()=>validateEncounter(x),/ENCOUNTER_UNAUTHORIZED_AUTHORITY/);
});
test('rehashed attempted real capability call or fake matching is refused',()=>{
 const e=assembleEncounter(listening(),CAPS,mockOriginalEngine);
 const p=e.invitations.map(x=>({...x}));p[0].actual_capability_call=true;
 assert.throws(()=>validateEncounter(rebuild({...e,invitations:p})),/ENCOUNTER_PROPOSAL_LAUNDERED/);
 p[0].actual_capability_call=false;p[0].claim='REAL_SERVICE_MATCH';
 assert.throws(()=>validateEncounter(rebuild({...e,invitations:p})),/ENCOUNTER_PROPOSAL_LAUNDERED/);
});
test('candidate swap and raw question swap cannot become same encounter',()=>{
 const e=assembleEncounter(listening(),CAPS,mockOriginalEngine);
 let invitations=e.invitations.map(x=>({...x}));invitations[0].candidate_id='unknown';
 assert.throws(()=>validateEncounter(rebuild({...e,invitations})),/ENCOUNTER_PROPOSAL_LAUNDERED/);
 const input={...e.input,question:'A different question'};
 assert.throws(()=>validateEncounter(rebuild({...e,input})),/ENCOUNTER_PARENT_CHANGED/);
});
test('local review return is bound to exact encounter and can only be unsigned',()=>{
 const e=assembleEncounter(listening(),CAPS,mockOriginalEngine);
 const r=makeLocalReturn(e,'INVITE_LOCAL_REVIEW',e.invitations[0].id);
 const altered=rebuild({...e,operator_message:'changed prose'});
 assert.throws(()=>validateLocalReturn(altered,r),/RETURN_SOURCE_STALE_OR_MUTATED/);
 const {local_sha256,...body}=r; const x={...body,delivered:true};
 assert.throws(()=>validateLocalReturn(e,{...x,local_sha256:hash(x)}),/RETURN_AUTHORITY_LAUNDERED/);
});
test('stale read-only listening source is refused',()=>{
 const l=listening();l.webz.selected[0].callable=true;
 assert.throws(()=>assembleEncounter(l,CAPS,mockOriginalEngine),/LISTENING_DIGEST_CHANGED/);
});
