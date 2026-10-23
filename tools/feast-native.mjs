#!/usr/bin/env node
/** HOUSE-004: a real webZ public artifact and an independently held native TABLElogic encounter. */
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateEncounter} from '../src/encounter.mjs';
import {setFeast,validateFeast} from '../src/feast.mjs';

const WEBZ='03684938fceb8ff4d614413c95634220895fa404';
const SOURCE_ROOTS={
 'GHoT':'the-static-collective/GHoT',
 'planZ':'the-static-collective/planZ',
 'CANNON':'the-static-collective/CANNON',
 'reLATTE':'the-static-collective/reLATTE',
 'static-workbench':'the-static-collective/static-workbench',
 'JAR-VIS':'the-static-collective/JAR-VIS',
 'TABLElogic':'the-static-collective/TABLElogic-main-source'
};
const fail=(ok,msg)=>{if(!ok)throw Error(msg)};
function read(path){
 const bytes=readFileSync(resolve(path));
 fail(bytes.byteLength<=1024*1024,'OVER_BUDGET_LOCAL_INPUT');
 return JSON.parse(bytes.toString('utf8'));
}
function publicSource(roots){
 const dir=roots['the-static-collective/webZ-public-return-002'];
 fail(typeof dir==='string'&&existsSync(dir),'ORIGINAL_PR78_SOURCE_MISSING');
 const root=realpathSync(resolve(dir));
 const head=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',timeout:10000}).trim();
 fail(head===WEBZ,'PR78_EXACT_SOURCE_PIN_MISMATCH');
 for(const file of ['ask-jarvis/src/worker.mjs','ask-jarvis/src/registry.mjs',
    'ask-jarvis/src/encounter.mjs','ask-jarvis/public/evidence.mjs']){
   execFileSync('git',['-C',root,'diff','--quiet','HEAD','--',file],{timeout:10000});
 }
 return root;
}
async function modules(root){
 const base=pathToFileURL(join(root,'ask-jarvis/src/worker.mjs')).href;
 const reg=pathToFileURL(join(root,'ask-jarvis/src/registry.mjs')).href;
 const proof=pathToFileURL(join(root,'ask-jarvis/public/evidence.mjs')).href;
 const [worker,registry,evidence]=await Promise.all([import(base),import(reg),import(proof)]);
 fail(typeof worker.assemble==='function'&&typeof registry.sourceUrl==='function'&&
   Array.isArray(registry.CAPABILITIES)&&typeof evidence.verifyReturn==='function',
   'ORIGINAL_PR78_API_MISSING');
 return {worker,registry,evidence};
}

function sourceReader(roots,registry){
 const candidates=new Map(registry.CAPABILITIES.map(c=>[registry.sourceUrl(c),c]));
 fail(candidates.size===registry.CAPABILITIES.length,'DUPLICATE_CATALOG_URL');
 fail(registry.CAPABILITIES.length===7 &&
   registry.CAPABILITIES.every(c=>/^[a-f0-9]{40}$/.test(c.ref)&&c.path==='README.md'),
   'PR78_OWNER_CATALOG_SCOPE_CHANGED');
 const seen=[];
 const reader=async (url)=>{
   const c=candidates.get(url);
   fail(c,'UNLISTED_SOURCE_URL_BLOCKED');
   const key=SOURCE_ROOTS[c.repo], raw=roots[key];
   const unavailable=()=>new Response('UNAVAILABLE_OFFLINE',{status:503});
   if(typeof raw!=='string'||!existsSync(raw)){seen.push({id:c.id,status:'UNAVAILABLE_LOCAL_ROOT'});return unavailable();}
   const root=realpathSync(resolve(raw));
   try{
     // Source-verified reader: exact *original Git object*, no network, no mutable HEAD.
     // Git's object database, not the worktree or a mock document, supplies the bytes.
     const available=execFileSync('git',['-C',root,'cat-file','-t',c.ref],{
       encoding:'utf8',timeout:10000}).trim();
     if(available!=='commit')throw Error('NOT_EXACT_COMMIT');
     const bytes=execFileSync('git',['-C',root,'show',c.ref+':'+c.path],{
       timeout:10000,maxBuffer:96*1024});
     if(bytes.byteLength>90000||bytes.byteLength===0)throw Error('OVERSIZE_OR_EMPTY');
     seen.push({id:c.id,status:'ORIGINAL_GIT_OBJECT_INSPECTED',commit:c.ref,bytes:bytes.byteLength});
     return new Response(bytes,{status:200,headers:{'content-length':String(bytes.byteLength)}});
   }catch{
     seen.push({id:c.id,status:'UNAVAILABLE_ORIGINAL_GIT_OBJECT',commit:c.ref});
     return unavailable();
   }
 };
 return {reader,seen};
}
async function run([encounterPath,rootsPath,kind,outputPath]){
 fail(['question','invitation','door','song'].includes(kind),'RETURN_KIND');
 fail(typeof outputPath==='string'&&!existsSync(resolve(outputPath)),'CREATE_ONLY_FILE_EXISTS');
 const native=validateEncounter(read(encounterPath)),roots=read(rootsPath);
 const root=publicSource(roots),original=await modules(root);
 const {reader,seen}=sourceReader(roots,original.registry);
 const publicReturn=await original.worker.assemble(native.input.question,reader,{kind});
 fail(await original.evidence.verifyReturn(publicReturn),'ORIGINAL_PUBLIC_UNVERIFIED');
 fail(publicReturn.sources.every(s=>seen.some(x=>x.id===s.id)),'PUBLIC_UNOBSERVED_SOURCE');
 const feast=await setFeast(publicReturn,native,original.evidence.verifyReturn);
 await validateFeast(feast,original.evidence.verifyReturn);
 const serialized=JSON.stringify(feast,null,2)+'\n';
 fail(Buffer.byteLength(serialized,'utf8')<=1024*1024,'OVER_BUDGET_FEAST');
 writeFileSync(resolve(outputPath),serialized,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({
   schema:feast.schema,status:feast.state,kind,
   question_sha256:feast.question_sha256,
   public_receipt:feast.public.original_receipt_sha256,
   original_native_encounter:feast.native.original_encounter_sha256,
   native_proposals:feast.native.invitations.length,
   exact_public_documents:seen.filter(x=>x.status==='ORIGINAL_GIT_OBJECT_INSPECTED').length,
   unavailable_documents:seen.filter(x=>x.status!=='ORIGINAL_GIT_OBJECT_INSPECTED').length,
   native_jarvis_receipts_sent:0,external_effects:0
 },null,2));
}
async function verify([feastPath,rootsPath]){
 const roots=read(rootsPath),root=publicSource(roots),original=await modules(root);
 const feast=await validateFeast(read(feastPath),original.evidence.verifyReturn);
 console.log(JSON.stringify({
   schema:'tablelogic.feast-local-cold-check/v0',valid:true,
   exact_original_public_verifier:true,exact_local_question_binding:true,
   local_sha256:feast.local_sha256,
   original_native_signature_reverification_here:false,
   producer_identity_cryptographically_authenticated:false,
   human_consent:false,external_effects:0
 },null,2));
}
try{
 const [command,...args]=process.argv.slice(2);
 if(command==='run')await run(args);
 else if(command==='verify')await verify(args);
 else throw Error('USAGE: run ENCOUNTER_JSON ROOTS_JSON KIND NEW_FEAST_JSON | verify FEAST_JSON ROOTS_JSON');
}catch(e){console.error('HOLD:',String(e.message).slice(0,700));process.exitCode=1}
