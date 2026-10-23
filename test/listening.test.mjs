import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../src/house.mjs';
import {verifyListening} from '../scripts/verify-listening.mjs';
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
function specimen(){
 const original={
   schema:'tablelogic.listening-table/v0',disposition:'HOLD_HUMAN_REVIEW',
   question:'Could a neighborhood potluck use a project branch?',
   context:null,original_workbench_source_commit:'53db559bbc510ad1003a0f8330d1673dcd04d7a0',
   original_jarvis_source_commit:'20fa89a340251443afa7afbdb5432ed11fce88a6',
   aperture:{raw_text:'Could a neighborhood potluck use a project branch?',status:'unresolved',
      readings:[{id:'literal.carrier'}],gaps:[{code:'no_deterministic_fixture'}],triad:[]},
   jarvis:{disposition:'HOLD',authority:'none',externally_sent:false,user_question_matched:false},
   webz:{offline_local_fetch_only:true,live_website_unchanged:true,
     selected:[{id:'graft',status:'LOCAL_PINNED_READ',callable:false,authority:'none'},
       {id:'planz',status:'UNAVAILABLE_OFFLINE',callable:false,authority:'none'},
       {id:'jarvis',status:'UNAVAILABLE_OFFLINE',callable:false,authority:'none'}]},
   graft:{status:'STAGING_HOLD',original_source_code_imported:false,admission:false},
   house_001_projection_sha256:'a'.repeat(64),
   choices:['KEEP_AS_QUESTION','INSPECT_SOURCES','DECLINE'],
   actual_user_interpretation_asserted:false,real_people_consented:false,
   external_effects:0,source_owner_admission:false,genuine_semantic_match_claimed:false,
   no_network_source_fetch:true
 };
 return {...original,local_sha256:hash(original)};
}
test('a local question stays held with four owner roles visible',()=>{
 const x=specimen();assert.equal(verifyListening(x),x);
});
test('unreviewed question cannot become real user interpretation',()=>{
 const x=specimen();x.jarvis.user_question_matched=true;
 assert.throws(()=>verifyListening(x),/LISTENING_DIGEST_CHANGED/);
});
test('rehashed false steward consent is still refused',()=>{
 const x=specimen();x.real_people_consented=true;
 const {local_sha256,...body}=x;x.local_sha256=hash(body);
 assert.throws(()=>verifyListening(x),/UNAUTHORIZED_LISTENING_EFFECT/);
});
test('rehashed GRAFT imported code is refused',()=>{
 const x=specimen();x.graft.original_source_code_imported=true;
 const {local_sha256,...body}=x;x.local_sha256=hash(body);
 assert.throws(()=>verifyListening(x),/GRAFT_INCORPORATION_LAUNDERING/);
});
test('rehashed JAR;VIS permission attempt is refused',()=>{
 const x=specimen();x.jarvis.disposition='MOCK_RELAYED';
 const {local_sha256,...body}=x;x.local_sha256=hash(body);
 assert.throws(()=>verifyListening(x),/JARVIS_PERMISSION_LAUNDERING/);
});
test('rehashed WebZ external act is refused',()=>{
 const x=specimen();x.webz.selected[0].callable=true;
 const {local_sha256,...body}=x;x.local_sha256=hash(body);
 assert.throws(()=>verifyListening(x),/WEBZ_LIVE_CLAIM/);
});
test('changing the source context without changing literal carrier refuses',()=>{
 const x=specimen();x.aperture.raw_text='different private source';
 const {local_sha256,...body}=x;x.local_sha256=hash(body);
 assert.throws(()=>verifyListening(x),/WORKBENCH_CARRIER_CHANGED/);
});
test('cannot introduce an execution choice disguised as a menu',()=>{
 const x=specimen();x.choices.push('EXECUTE');
 const {local_sha256,...body}=x;x.local_sha256=hash(body);
 assert.throws(()=>verifyListening(x),/FORGED_ACTION_CHOICE/);
});
