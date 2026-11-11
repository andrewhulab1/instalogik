"use strict";
/* Interaktywne elementy stron z materialami. Silnik jezyka: engine.js */

function fmtIn(a){return a.join(' ');}
function fmtOut(a){return a.join(' | ');}

function setMsg(el,kind,text){el.className='msg show '+kind;el.textContent=text;}


/* zamienia liste bledow parsera na zrozumiale wyjasnienie */
function opiszBledy(errs){
  return errs.slice(0,3).map(e=>{
    const d = (typeof diagnozaLinii==='function') ? diagnozaLinii(e.raw||'') : null;
    const naglowek = 'Linia '+e.line+'  «'+(e.raw||'')+'»';
    return d ? naglowek+'\n'+d.pl+'\n'+d.en : naglowek+'\nNie rozumiem tego polecenia. / Unknown command.';
  }).join('\n\n') + (errs.length>3 ? '\n\n…oraz '+(errs.length-3)+' dalszych linii. / …and '+(errs.length-3)+' more lines.' : '');
}

function checkProgram(ed){
  const ta=ed.querySelector('textarea'), msg=ed.querySelector('.msg');
  const tests=JSON.parse(ed.dataset.tests||'[]');
  const txt=(ta.value||'').trim();
  if(!txt){setMsg(msg,'err','Najpierw wpisz program. / Type a program first.');return;}
  const p=parseProgram(txt);
  if(p.errors.length){setMsg(msg,'err',opiszBledy(p.errors));return;}
  if(!tests.length){setMsg(msg,'ok','Program jest poprawnie zapisany. / The program is written correctly.');return;}
  let bad=null, wyk=null, ostrz=null;
  for(const t of tests){
    let st;
    try{st=runAll(p.lines,t[0].slice());}catch(e){wyk={inp:t[0],msg:'Coś poszło nie tak przy uruchamianiu. / Something went wrong while running.'};break;}
    if(st.error){wyk={inp:t[0],msg:st.error};break;}
    if(st.warn&&!ostrz)ostrz=st.warn;
    const got=outputLines(st), want=t[1].map(String);
    if(got.length!==want.length||got.some((v,i)=>v!==want[i])){bad={inp:t[0],want:want,got:got};break;}
  }
  if(wyk){setMsg(msg,'err','Program zatrzymał się dla wejścia '+fmtIn(wyk.inp)+'.\n'+wyk.msg);return;}
  if(!bad){setMsg(msg,'ok','Dobrze! Program działa na wszystkich '+tests.length+' testach. / Correct on all '+tests.length+' tests.'+(ostrz?'\n\nUwaga: '+ostrz:''));}
  else{setMsg(msg,'err','Jeszcze nie. Dla wejścia '+fmtIn(bad.inp)+' Twój program daje '+fmtOut(bad.got)+
    ', a powinien '+fmtOut(bad.want)+'. / Not yet: for input '+fmtIn(bad.inp)+' you print '+fmtOut(bad.got)+' instead of '+fmtOut(bad.want)+'.');}
}

function runProgram(ed){
  const ta=ed.querySelector('textarea'), msg=ed.querySelector('.msg');
  const inp=(ed.querySelector('.inp')?ed.querySelector('.inp').value:'').match(/-?\d+/g)||[];
  const p=parseProgram((ta.value||'').trim());
  if(p.errors.length){setMsg(msg,'err',opiszBledy(p.errors));return;}
  let st;try{st=runAll(p.lines,inp.map(Number));}catch(e){setMsg(msg,'err','Coś poszło nie tak przy uruchamianiu programu. / Something went wrong while running the program.');return;}
  if(st.error){setMsg(msg,'err',st.error);return;}
  setMsg(msg,'ok','Wynik / Output: '+(outputLines(st).join(' | ')||'(nic / nothing)')+(st.warn?'\n\nUwaga: '+st.warn:''));
}

document.addEventListener('click',e=>{
  const b=e.target.closest('button[data-act]');if(!b)return;
  const ed=b.closest('.ed');
  if(b.dataset.act==='check')checkProgram(ed);
  if(b.dataset.act==='run')runProgram(ed);
  if(b.dataset.act==='clear'){ed.querySelector('textarea').value='';const m=ed.querySelector('.msg');m.className='msg';m.textContent='';}
});

/* zapisywanie pracy ucznia w przegladarce */
(function(){
  const key='instalogik:'+location.pathname;
  let store={};
  try{store=JSON.parse(localStorage.getItem(key)||'{}');}catch(e){store={};}
  const fields=[...document.querySelectorAll('textarea,td input')];
  fields.forEach((f,i)=>{if(store[i]!==undefined)f.value=store[i];});
  let t=null;
  document.addEventListener('input',()=>{
    clearTimeout(t);
    t=setTimeout(()=>{
      try{const o={};fields.forEach((f,i)=>{if(f.value)o[i]=f.value;});localStorage.setItem(key,JSON.stringify(o));}catch(e){}
    },400);
  });
  const btn=document.getElementById('wyczysc');
  if(btn)btn.addEventListener('click',()=>{
    if(!confirm('Wyczyścić wszystkie wpisane odpowiedzi na tej stronie? / Clear all your answers on this page?'))return;
    fields.forEach(f=>f.value='');
    document.querySelectorAll('.msg').forEach(m=>{m.className='msg';m.textContent='';});
    try{localStorage.removeItem(key);}catch(e){}
  });
})();
