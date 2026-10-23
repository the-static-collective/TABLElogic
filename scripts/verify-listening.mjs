#!/usr/bin/env node
/** Inspect only the bounded HOUSE-002 local view, never native owner grants. */
import {readFileSync,statSync} from 'node:fs';
import {canonical} from '../src/house.mjs';
import {createHash} from 'node:crypto';
const fail=(ok,s)=>{if(!ok)throw Error(s)};
const digest=x=>createHash('sha256').update(canonical(x)).digest('hex');
export function verifyListening(value){
 fail(value&&typeof value==='object'&&!Array.isArray(value)&&
   value.schema==='tablelogic.listening-table/v0','BAD_LISTENING_SCHEMA');
 const {local_sha256,...body}=value;
 fail(typeof local_sha256==='string'&&digest(body)===local_sha256,'LISTENING_DIGEST_CHANGED');
 fail(value.disposition==='HOLD_HUMAN_REVIEW'&&value.external_effects===0&&
   value.source_owner_admission===false&&value.real_people_consented===false&&
   value.no_network_source_fetch===true&&value.genuine_semantic_match_claimed===false,
   'UNAUTHORIZED_LISTENING_EFFECT');
 fail(value.original_workbench_source_commit==='53db559bbc510ad1003a0f8330d1673dcd04d7a0'&&
   value.original_jarvis_source_commit==='20fa89a340251443afa7afbdb5432ed11fce88a6',
   'DONOR_PIN_CHANGED');
 fail(value.question===value.aperture?.raw_text&&
   ['unresolved','narrowed'].includes(value.aperture.status)&&
   Array.isArray(value.aperture.readings)&&value.aperture.readings.length>=1&&
   Array.isArray(value.aperture.gaps)&&Array.isArray(value.aperture.triad),
   'WORKBENCH_CARRIER_CHANGED');
 fail(value.jarvis?.disposition==='HOLD'&&value.jarvis?.authority==='none'&&
   value.jarvis?.externally_sent===false&&value.jarvis?.user_question_matched===false,
   'JARVIS_PERMISSION_LAUNDERING');
 fail(value.webz?.offline_local_fetch_only===true&&
   value.webz?.live_website_unchanged===true&&
   Array.isArray(value.webz.selected)&&value.webz.selected.length===3&&
   value.webz.selected.every(s=>s.callable===false&&s.authority==='none'&&
     ['LOCAL_PINNED_READ','UNAVAILABLE_OFFLINE'].includes(s.status)),
   'WEBZ_LIVE_CLAIM');
 fail(value.graft?.status==='STAGING_HOLD'&&
   value.graft?.original_source_code_imported===false&&value.graft?.admission===false,
   'GRAFT_INCORPORATION_LAUNDERING');
 fail(Array.isArray(value.choices)&&canonical(value.choices)===
   canonical(['KEEP_AS_QUESTION','INSPECT_SOURCES','DECLINE']),
   'FORGED_ACTION_CHOICE');
 fail(value.house_001_projection_sha256?.match(/^[a-f0-9]{64}$/),'HOUSE001_LINK_MISSING');
 return value;
}
if(process.argv[1]?.endsWith('/verify-listening.mjs')){
 try{
  const path=process.argv[2];
  fail(path&&process.argv.length===3,'USAGE_LISTENING_JSON');
  fail(statSync(path).size<=256*1024,'INPUT_OVER_BUDGET');
  const x=verifyListening(JSON.parse(readFileSync(path,'utf8')));
  console.log(JSON.stringify({schema:'tablelogic.listening-local-verification/v0',
    valid:true,local_sha256:x.local_sha256,actual_native_cryptography_reverified:false,
    human_permission:false,external_effects:0},null,2));
 }catch(e){console.error('HOLD:',e.message);process.exitCode=1}
}
