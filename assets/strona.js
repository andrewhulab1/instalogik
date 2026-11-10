"use strict";
/* Interaktywne elementy stron z materialami. Silnik jezyka: engine.js */

function fmtIn(a){return a.join(' ');}
function fmtOut(a){return a.join(' | ');}

function setMsg(el,kind,text){el.className='msg show '+kind;el.textContent=text;}

function checkProgram(ed){
  const ta=ed.querySelector('textarea'), msg=ed.querySelector('.msg');
  const tests=JSON.parse(ed.dataset.tests||'[]');
  const txt=(ta.value||'').trim();
  if(!txt){setMsg(msg,'err','Najpierw wpisz program. / Type a program first.');return;}
  const p=parseProgram(txt);
  if(p.errors.length){
    setMsg(msg,'err','Nie rozumiem linii '+p.errors.map(e=>e.line).join(', ')+
      '. Sprawdź pisownię polecenia. / I do not understand line(s) '+p.errors.map(e=>e.line).join(', ')+'.');
    return;
  }
  if(!tests.length){setMsg(msg,'ok','Program jest poprawnie zapisany. / The program is written correctly.');return;}
  let bad=null;
  for(const t of tests){
    let got;
    try{got=outputLines(runAll(p.lines,t[0]));}catch(e){got=['(błąd / error)'];}
    const want=t[1].map(String);
    if(got.length!==want.length||got.some((v,i)=>v!==want[i])){bad={inp:t[0],want:want,got:got};break;}
  }
  if(!bad){setMsg(msg,'ok','Dobrze! Program działa na wszystkich '+tests.length+' testach. / Correct on all '+tests.length+' tests.');}
  else{setMsg(msg,'err','Jeszcze nie. Dla wejścia '+fmtIn(bad.inp)+' Twój program daje '+fmtOut(bad.got)+
    ', a powinien '+fmtOut(bad.want)+'. / Not yet: for input '+fmtIn(bad.inp)+' you print '+fmtOut(bad.got)+' instead of '+fmtOut(bad.want)+'.');}
}

function runProgram(ed){
  const ta=ed.querySelector('textarea'), msg=ed.querySelector('.msg');
  const inp=(ed.querySelector('.inp')?ed.querySelector('.inp').value:'').match(/-?\d+/g)||[];
  const p=parseProgram((ta.value||'').trim());
  if(p.errors.length){setMsg(msg,'err','Nie rozumiem linii '+p.errors.map(e=>e.line).join(', ')+'.');return;}
  let st;try{st=runAll(p.lines,inp.map(Number));}catch(e){setMsg(msg,'err','Program się zapętlił albo zabrakło danych.');return;}
  setMsg(msg,'ok','Wynik / Output: '+(outputLines(st).join(' | ')||'(nic / nothing)'));
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
