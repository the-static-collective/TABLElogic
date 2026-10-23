'use strict';
const $=id=>document.getElementById(id);
let encounter=null,selected=null,localReturn=null,fictional=false;
const CHOICES=['KEEP_AS_QUESTION','INVITE_LOCAL_REVIEW','DECLINE'];
function hold(message){$('evidence-status').textContent='HOLD · '+message}
function canonical(x){
 if(x===null||typeof x==='boolean'||typeof x==='string')return JSON.stringify(x);
 if(typeof x==='number'){if(!Number.isSafeInteger(x))throw Error('Invalid number');return JSON.stringify(x);}
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(!x||typeof x!=='object')throw Error('Invalid object');
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
async function sha(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function verify(e){
 if(!e||e.schema!=='tablelogic.encounter/v0'||e.state!=='HOLD_HUMAN_REVIEW')throw Error('Not a HOUSE-003 encounter');
 const {local_sha256,...body}=e;
 if(local_sha256!==await sha(canonical(body)))throw Error('Local view digest changed');
 const l=e.input?.listening;
 if(!l||l.schema!=='tablelogic.listening-table/v0'||l.question!==e.input.question)throw Error('Parent question not preserved');
 const {local_sha256:sourceDigest,...sourceBody}=l;
 if(sourceDigest!==await sha(canonical(sourceBody))||sourceDigest!==e.input.listening_source_sha256)throw Error('Parent view digest changed');
 const qsha=await sha(e.input.question);
 if(qsha!==e.input.question_sha256)throw Error('Original question digest changed');
 if(!Array.isArray(e.invitations)||e.invitations.length!==3*l.aperture.readings.length||e.invitations.length>24)throw Error('Unexpected invitation count');
 const readingIDs=new Set(l.aperture.readings.map(x=>x.id));
 const sourceIDs=new Map(l.webz.selected.map(x=>[x.id,x]));
 const keys=new Set();
 for(const p of e.invitations){
   const orig=sourceIDs.get(p.candidate_id);
   if(!readingIDs.has(p.reading_id)||!orig||p.candidate_name!==orig.name||
      p.question_sha256!==qsha||p.disposition!=='HOLD'||p.authority!=='none'||
      p.actual_capability_call!==false||p.native_jarvis_fixture_used!==true||
      p.claim!=='HYPOTHETICAL_REVIEW_PAIR_NOT_A_HUMAN_NEED_OR_REAL_OFFER'||
      p.compatibility!=='DECLARED_IDENTICAL_FICTIONAL_CATEGORY_NOT_SEMANTIC_EVIDENCE')
      throw Error('Unwarranted capability or semantic claim');
   const expectedId='tablelogic.invitation.'+(await sha(canonical([qsha,p.reading_id,p.candidate_id]))).slice(0,24);
   if(p.id!==expectedId)throw Error('Invitation address changed');
   keys.add(p.reading_id+'@'+p.candidate_id);
 }
 if(keys.size!==e.invitations.length||e.execution_grants!==0||e.external_effects!==0||
    e.requests_dispatched!==0||e.owner_admission!==false||e.public_published!==false||
    e.participant_consent_observed!==false||e.proposal_selection!=='NONE')
   throw Error('Unsupported external effect or claim');
 if(canonical(e.choices)!==canonical(CHOICES))throw Error('Unexpected action controls');
 return e;
}
function text(tag,body,className){
 const x=document.createElement(tag);x.textContent=body;if(className)x.className=className;return x;
}
function render(e,sample=false){
 encounter=sample?null:e;fictional=sample;selected=null;localReturn=null;
 $('original').replaceChildren(text('strong','Exact question: '),text('span',e.input.question));
 $('organs').replaceChildren();
 const reading=e.input.listening.aperture.readings.map(x=>x.id).join(' · ');
 const positions=[
  ['Workbench','Original, unselected reading(s): '+reading],
  ['JAR;VIS','Original question-bound hypothetical review pairs; every original crossing remains HOLD.'],
  ['webZ','Candidate doors selected by the original public catalog (not callable).'],
  ['GRAFT','The public nursery is staged; no private donor code is imported.']
 ];
 for(const [name,detail] of positions){
  const card=document.createElement('article');
  card.append(text('h3',name),text('p',detail));$('organs').append(card);
 }
 $('candidates').replaceChildren();
 for(const i of e.invitations){
  const button=document.createElement('button');button.type='button';button.className='candidate';
  button.setAttribute('aria-pressed','false');
  button.append(text('span',i.candidate_name+' / '+i.reading_id,'title'),
    text('span',i.possibility),
    text('span',(i.source_lookup_status||'UNVERIFIED')+' · '+i.disposition+' · '+i.proposal_status,'chip'));
  button.onclick=()=>{
    selected=i.id;localReturn=null;
    document.querySelectorAll('.candidate').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    $('invite').disabled=false;$('decline').disabled=false;$('export').disabled=true;
    $('decision').textContent='Selected local possibility: '+i.candidate_name+' / '+i.reading_id+'. Nothing sent.';
  };
  $('candidates').append(button);
 }
 $('invite').disabled=true;$('decline').disabled=true;$('export').disabled=true;
 $('evidence-status').textContent=sample?
   'FICTIONAL PREVIEW ONLY. No original donor or verifier ran for this card.':
   'Local SHA-256 checks passed. This is NOT native cryptographic source verification or a grant.';
 $('decision').textContent='No local review choice yet.';
}
function saveFile(filename,object){
 const blob=new Blob([JSON.stringify(object,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),100);
}
$('save-question').onclick=()=>{
 const q=$('question').value.trim();
 if(q.length<8||q.length>260||/[\u0000-\u001f\u007f]/.test(q)||/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(q)){
   $('question-status').textContent='HOLD: 8–260 characters and no contact details.';return;
 }
 saveFile('unsent-table-question.json',{schema:'tablelogic.unsent-question/v0',question:q,
   status:'UNPUBLISHED_LOCAL_ONLY', human_intent_not_inferred:true,submitted:false});
 $('question-status').textContent='One local question saved, no network request.';
};
$('evidence').onchange=async event=>{
 try{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>256*1024)throw Error('Source exceeds 256 KiB');
  const e=JSON.parse(await file.text());
  await verify(e);
  render(e);
 }catch(err){encounter=null;selected=null;localReturn=null;hold(err.message);
   $('candidates').replaceChildren(text('p','Source refused; none of its invitations are available.'));
   $('invite').disabled=true;$('decline').disabled=true;$('export').disabled=true;
 }
};
$('demo').onclick=()=>{
 const question='Could a public project branch help a community potluck?';
 const e={input:{question,listening:{aperture:{readings:[{id:'literal.carrier'}]}}},
   invitations:[{id:'fictional-graft',candidate_name:'GRAFT',reading_id:'literal.carrier',
     possibility:'Inspect a public candidate branch manifest.',source_lookup_status:'UNVERIFIED_DEMO',
     disposition:'HOLD',proposal_status:'GRAFT_NURSERY_STAGING_HOLD'},
     {id:'fictional-planz',candidate_name:'planZ',reading_id:'literal.carrier',
     possibility:'Inspect published planning tools.',source_lookup_status:'UNAVAILABLE_DEMO',
     disposition:'HOLD',proposal_status:'UNVERIFIED'},
     {id:'fictional-jar',candidate_name:'JAR;VIS',reading_id:'literal.carrier',
     possibility:'Inspect the bounded attendant interface.',source_lookup_status:'UNAVAILABLE_DEMO',
     disposition:'HOLD',proposal_status:'UNVERIFIED'}]};
 render(e,true);
};
function decide(choice){
 if(!CHOICES.includes(choice))return;
 if(choice!=='KEEP_AS_QUESTION'&&!selected){$('decision').textContent='Choose a candidate first.';return}
 const id=choice==='KEEP_AS_QUESTION'?null:selected;
 localReturn={choice,invitation_id:id};
 $('export').disabled=false;
 $('decision').textContent=(fictional?'Fictional ':'')+'LOCAL '+choice.replaceAll('_',' ')+
  ' recorded in page memory. No request or invitation was sent.';
}
$('keep').onclick=()=>decide('KEEP_AS_QUESTION');
$('invite').onclick=()=>decide('INVITE_LOCAL_REVIEW');
$('decline').onclick=()=>decide('DECLINE');
$('export').onclick=async()=>{
 if(!localReturn){$('decision').textContent='No local choice recorded.';return}
 // Preview-only returns have no proof parent and cannot impersonate a native view.
 if(fictional){
  saveFile('fictional-local-return.json',{schema:'tablelogic.fictional-local-return/v0',
    choice:localReturn.choice,invitation_id:localReturn.invitation_id,
    native_source_verified:false,issued:false,sent:false});
  return;
 }
 const choice=localReturn.choice, invitation_id=localReturn.invitation_id;
 const payload={schema:'tablelogic.local-review-return/v0',
   parent_encounter_sha256:encounter.local_sha256,
   original_question_sha256:encounter.input.question_sha256,
   invitation_id,choice,disposition:choice==='DECLINE'?'LOCALLY_DECLINED':'UNSENT_LOCAL_REVIEW',
   human_operator_assertion:'UNAUDITED_LOCAL_CHOICE',source_execution_reverified:false,
   real_human_consent_verification:false,delivered:false,receiver:'NONE',external_effects:0,owner_authority:'none'};
 saveFile('unsigned-local-review-return.json',{...payload,local_sha256:await sha(canonical(payload))});
 $('decision').textContent='Unsigned local receipt exported. No native action or communication occurred.';
};
