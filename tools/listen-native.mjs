#!/usr/bin/env node
/* Source-pinned HOUSE-002. Original donor behavior, held and observable. */
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {canonical,houseProjection,validateProjection} from '../src/house.mjs';
const SHAS={
 workbench:'53db559bbc510ad1003a0f8330d1673dcd04d7a0',
 jarvis:'20fa89a340251443afa7afbdb5432ed11fce88a6',
 webz:'b24c863903537b84bb81816fca394280743eb406',
 graft:'5043bbe4a2a54d5007071c75a5bd265e5864fd14',
 nursery:'9de927d85af8ac62a0902040197cc583e544862a'
};
const names={workbench:'static-workbench',jarvis:'JAR-VIS',webz:'webZ',graft:'GRAFT',nursery:'GRAFT-nursery'};
const fail=(ok,why)=>{if(!ok)throw Error(why)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>sha(canonical(x));
function root(roots,key,file){
 const dir=roots['the-static-collective/'+names[key]];
 fail(typeof dir==='string'&&existsSync(dir),'MISSING_ROOT_'+key);
 const path=realpathSync(resolve(dir));
 const head=execFileSync('git',['-C',path,'rev-parse','HEAD'],{encoding:'utf8',timeout:10000}).trim();
 fail(head===SHAS[key],'WRONG_SOURCE_SHA_'+key);
 fail(existsSync(join(path,file)),'MISSING_NATIVE_SOURCE_'+key);
 execFileSync('git',['-C',path,'diff','--quiet','HEAD','--',file],{timeout:10000,stdio:'pipe'});
 return path;
}
function safeQuestion(v){
 fail(typeof v==='string'&&v.trim().length>=8&&v.trim().length<=260&&Buffer.byteLength(v,'utf8')<=600,'QUESTION_LENGTH');
 fail(!/[\x00-\x1f\x7f]/.test(v),'CONTROL');
 fail(!/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?1[- .]?)?\(?\d{3}\)?[- .]?\d{3}[- .]?\d{4}/.test(v),'PRIVATE_CONTACT');
 return v.trim();
}
function aperture(original,question,context){
 const child=execFileSync('python3',['-B',resolve('tools/aperture.py'),question,...(context?[context]:[])],{
   env:{...process.env,PYTHONPATH:original,PYTHONDONTWRITEBYTECODE:'1'},
   encoding:'utf8',timeout:15000,maxBuffer:256*1024,stdio:['ignore','pipe','pipe']
 });
 const x=JSON.parse(child);
 fail(x.raw_text===question&&Array.isArray(x.gaps)&&Array.isArray(x.readings)&&['unresolved','narrowed'].includes(x.status),'APERTURE_CHANGED');
 return x;
}
async function jarvis(original){
 const engine=await import(pathToFileURL(join(original,'src/engine.mjs')).href);
 const fixture=await import(pathToFileURL(join(original,'src/fixture.mjs')).href);
 const jar=fixture.gardenJar();
 const at='2026-10-23T14:00:00Z';
 const proposal=engine.propose(jar,'garden.need.produce-001',{at});
 const returned=engine.cross({jar,proposal,grants:[],relay:new engine.MockKinshipRelay(),at});
 fail(proposal?.schema==='jarvis.proposal/v0'&&returned.receipt?.kind==='HOLD'&&
  returned.receipt?.semanticEffect==='none'&&returned.message===null,'JARVIS_NOT_HELD');
 return {schema:'tablelogic.jarvis-native/v0',original_proposal_id:proposal.id,
   receipt_id:returned.receipt.id,disposition:'HOLD',reasons:returned.receipt.reasons,
   source:'original fictional gardenJar need and offer',user_question_matched:false,
   no_steward_grants:true,externally_sent:false,authority:'none'};
}
async function webz(original,graft,question){
 const worker=await import(pathToFileURL(join(original,'ask-jarvis/src/worker.mjs')).href);
 const url='https://raw.githubusercontent.com/the-static-collective/GRAFT/main/README.md';
 const readme=readFileSync(join(graft,'README.md'),'utf8');
 const fetcher=async u=>u===url?
   new Response(readme,{status:200,headers:{'content-length':String(Buffer.byteLength(readme))}}):
   new Response('OFFLINE_NOT_AVAILABLE',{status:503});
 const ret=await worker.assemble(question,fetcher);
 fail(ret.schema==='ask-jarvis/return-v0'&&ret.question===question&&ret.sources.length===3,'WEBZ_NATIVE_RETURN_CHANGED');
 const selected=ret.sources.map(s=>({
   name:s.name,id:s.id,status:s.id==='graft'&&s.status==='INSPECTED'?'LOCAL_PINNED_READ':'UNAVAILABLE_OFFLINE',
   ref:s.source,source_sha256:s.id==='graft'&&s.status==='INSPECTED'?sha(readme):null,
   authority:'none',callable:false
 }));
 fail(selected.every(s=>s.status==='UNAVAILABLE_OFFLINE'||s.id==='graft'),'WEBZ_OFFLINE_INFERENCE');
 return {schema:'tablelogic.webz-native/v0',catalog_original:'ask-jarvis/return-v0',
   original_catalog_sha:SHAS.webz,selected,
   offline_local_fetch_only:true,live_website_unchanged:true};
}
function graftNursery(original){
 const x=readFileSync(join(original,'GRAFT_DONOR.md'),'utf8');
 fail(x.startsWith('# GRAFT donor · Jubilee Campfire')&&
  x.includes('PUBLIC source contents imported:** **NONE**')&&
  x.includes('State:** STAGING / HOLD')&&x.includes('graft/circle'),'GRAFT_NOT_STAGED');
 return {schema:'tablelogic.graft-nursery/v0',title:'Jubilee Campfire',
   branch:'graft/circle',source_commit:SHAS.nursery,
   original_source_code_imported:false,status:'STAGING_HOLD',
   admission:false,role:'Human-review-only candidate nursery'};
}
async function main(){
 const argv=process.argv.slice(2);
 fail(argv.length===4||argv.length===5,'USAGE QUESTION_TXT ROOTS_JSON HOUSE_001_JSON NEW_OUTPUT [CONTEXT_TXT]');
 const [qpath,rootsPath,housePath,outPath,contextPath]=argv;
 fail(!existsSync(resolve(outPath)),'CREATE_ONLY_OUTPUT_EXISTS');
 const question=safeQuestion(readFileSync(resolve(qpath),'utf8'));
 const context=contextPath?safeQuestion(readFileSync(resolve(contextPath),'utf8')):null;
 const roots=JSON.parse(readFileSync(resolve(rootsPath),'utf8'));
 const work=root(roots,'workbench','static_workbench/aperture.py');
 const jar=root(roots,'jarvis','src/engine.mjs');
 const web=root(roots,'webz','ask-jarvis/src/worker.mjs');
 const gra=root(roots,'graft','README.md');
 const nur=root(roots,'nursery','GRAFT_DONOR.md');
 const house=validateProjection(JSON.parse(readFileSync(resolve(housePath),'utf8')));
 fail(house.verification==='NATIVE_COLD_VERIFIED'&&house.disposition==='HOLD','HOUSE001_NOT_NATIVE_HELD');
 const [w,j,v]=await Promise.all([Promise.resolve(aperture(work,question,context)),jarvis(jar),webz(web,gra,question)]);
 const body={
   schema:'tablelogic.listening-table/v0',disposition:'HOLD_HUMAN_REVIEW',
   question,context,original_workbench_source_commit:SHAS.workbench,
   aperture:w, original_jarvis_source_commit:SHAS.jarvis,jarvis:j,
   webz:v,graft:graftNursery(nur),
   house_001_projection_sha256:house.projection_sha256,
   choices:['KEEP_AS_QUESTION','INSPECT_SOURCES','DECLINE'],
   actual_user_interpretation_asserted:false,real_people_consented:false,
   external_effects:0,source_owner_admission:false,
   genuine_semantic_match_claimed:false,
   no_network_source_fetch:true,
   original_native_modules_exercised:['static_workbench.aperture.analyze_aperture',
     'jarvis.engine.propose','jarvis.engine.cross','webz.worker.assemble']
 };
 const result={...body,local_sha256:digest(body)};
 writeFileSync(resolve(outPath),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({schema:result.schema,disposition:result.disposition,
   original_aperture_readings:w.readings.map(x=>x.id),
   jarvis_demo_disposition:j.disposition,
   webz_sources:v.selected.map(x=>x.id+':'+x.status),
   graft_status:result.graft.status, external_effects:0},null,2));
}
try{await main()}catch(e){console.error('HOLD:',String(e.message).slice(0,500));process.exitCode=1}
