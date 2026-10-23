#!/usr/bin/env node
/** HOUSE-003: original source recheck → original JAR;VIS question-bound HOLD → return. */
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {canonical} from '../src/house.mjs';
import {verifyListening} from '../scripts/verify-listening.mjs';
import {assembleEncounter,validateEncounter,makeLocalReturn,validateLocalReturn,hash} from '../src/encounter.mjs';

const PINS={
  'static-workbench':'53db559bbc510ad1003a0f8330d1673dcd04d7a0',
  'JAR-VIS':'20fa89a340251443afa7afbdb5432ed11fce88a6',
  'webZ':'b24c863903537b84bb81816fca394280743eb406',
  'GRAFT':'5043bbe4a2a54d5007071c75a5bd265e5864fd14',
  'GRAFT-nursery':'9de927d85af8ac62a0902040197cc583e544862a'
};
const fail=(ok,msg)=>{if(!ok)throw Error(msg)};
const read=p=>{const b=readFileSync(resolve(p));fail(b.byteLength<=256*1024,'INPUT_OVERSIZE');return JSON.parse(b.toString('utf8'))};
function root(roots,name,files){
  const raw=roots['the-static-collective/'+name];
  fail(typeof raw==='string'&&existsSync(raw),'ROOT_MISSING_'+name);
  const dir=realpathSync(resolve(raw));
  const head=execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8',timeout:15000}).trim();
  fail(head===PINS[name],'PIN_MISMATCH_'+name);
  for(const f of files){
    fail(existsSync(join(dir,f)),'ORIGINAL_SOURCE_MISSING_'+name);
    execFileSync('git',['-C',dir,'diff','--quiet','HEAD','--',f],{timeout:15000});
  }
  return dir;
}
function originalAperture(workbench,l){
 const original=JSON.parse(execFileSync('python3',
   ['-B',resolve('tools/aperture.py'),l.question,...(l.context?[l.context]:[])],{
    env:{...process.env,PYTHONPATH:workbench,PYTHONDONTWRITEBYTECODE:'1'},
    encoding:'utf8',timeout:15000,maxBuffer:128*1024
   }));
 fail(canonical(original)===canonical(l.aperture),'WORKBENCH_REPLAY_DIFFERED');
}
async function originalWebz(web,graft,l){
 const worker=await import(pathToFileURL(join(web,'ask-jarvis/src/worker.mjs')).href);
 const readme=readFileSync(join(graft,'README.md'),'utf8');
 const fetcher=async url=>url==='https://raw.githubusercontent.com/the-static-collective/GRAFT/main/README.md'?
   new Response(readme,{status:200,headers:{'content-length':String(Buffer.byteLength(readme))}}):
   new Response('UNAVAILABLE_OFFLINE',{status:503});
 const answer=await worker.assemble(l.question,fetcher);
 fail(answer.schema==='ask-jarvis/return-v0'&&answer.sources.length===3,'WEBZ_REPLAY_ERROR');
 for(let i=0;i<3;i++){
   const a=answer.sources[i], b=l.webz.selected[i];
   const expectedStatus=a.id==='graft'&&a.status==='INSPECTED'?'LOCAL_PINNED_READ':'UNAVAILABLE_OFFLINE';
   fail(a.id===b.id&&a.name===b.name&&expectedStatus===b.status&&
      (b.source_sha256===null||hash(readme)===b.source_sha256),'WEBZ_SOURCE_SELECTION_DIFFERED');
 }
 return worker.CAPABILITIES;
}
async function run(args){
 fail(args.length===3,'USAGE: node tools/encounter-native.mjs LISTENING_JSON ROOTS_JSON NEW_ENCOUNTER_JSON');
 const [inputPath,rootsPath,outPath]=args;
 fail(!existsSync(resolve(outPath)),'OUTPUT_ALREADY_EXISTS');
 const l=verifyListening(read(inputPath)), roots=read(rootsPath);
 const workbench=root(roots,'static-workbench',['static_workbench/aperture.py']);
 const jar=root(roots,'JAR-VIS',['src/engine.mjs']);
 const web=root(roots,'webZ',['ask-jarvis/src/worker.mjs']);
 const graft=root(roots,'GRAFT',['README.md']);
 const nursery=root(roots,'GRAFT-nursery',['GRAFT_DONOR.md']);
 const manifest=readFileSync(join(nursery,'GRAFT_DONOR.md'),'utf8');
 fail(manifest.includes('**State:** STAGING / HOLD')&&
      manifest.includes('**PUBLIC source contents imported:** **NONE**'),'GRAFT_SOURCE_ADMISSION_FORBIDDEN');
 fail(l.graft.source_commit===undefined || l.graft.source_commit===PINS['GRAFT-nursery'],
      'GRAFT_UNVERIFIED_SOURCE');
 originalAperture(workbench,l);
 const catalog=await originalWebz(web,graft,l);
 const engine=await import(pathToFileURL(join(jar,'src/engine.mjs')).href);
 const encounter=assembleEncounter(l,catalog,engine);
 validateEncounter(encounter);
 writeFileSync(resolve(outPath),JSON.stringify(encounter,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({
   schema:encounter.schema,state:encounter.state,
   original_question_sha256:encounter.input.question_sha256,
   original_readings:encounter.input.listening.aperture.readings.map(x=>x.id),
   source_candidates:encounter.input.listening.webz.selected.map(x=>x.id),
   genuine_question_bound_hypothetical_invitations:encounter.invitations.length,
   original_jarvis_holds:encounter.invitations.filter(p=>p.disposition==='HOLD').length,
   real_human_invitations_sent:0,external_effects:0
 },null,2));
}
function review(args){
 fail(args.length===4,'USAGE: review ENCOUNTER_JSON CHOICE TARGET_ID_OR_NONE NEW_RETURN');
 const [epath,choice,target,out]=args;
 fail(!existsSync(resolve(out)),'OUTPUT_ALREADY_EXISTS');
 const e=validateEncounter(read(epath));
 const r=makeLocalReturn(e,choice,target==='NONE'?null:target);
 validateLocalReturn(e,r);
 writeFileSync(resolve(out),JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({local_return:r.choice,disposition:r.disposition,sent:false,
    authority:'none',source:e.local_sha256},null,2));
}
function verify(args){
 fail(args.length===2,'USAGE: verify-return ENCOUNTER_JSON RETURN_JSON');
 const e=validateEncounter(read(args[0]));
 const r=validateLocalReturn(e,read(args[1]));
 console.log(JSON.stringify({valid:true,local_digest_only:true,choice:r.choice,delivered:false,
   native_original_signature_reverified:false,authority:'none'},null,2));
}
try{
 const [mode,...args]=process.argv.slice(2);
 if(mode==='run')await run(args);
 else if(mode==='review')review(args);
 else if(mode==='verify-return')verify(args);
 else throw Error('USAGE run|review|verify-return');
}catch(e){console.error('HOLD:',String(e.message).slice(0,500));process.exitCode=1}
