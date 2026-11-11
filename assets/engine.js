"use strict";
/* Silnik jezyka InstaLogik - ten sam, ktory dziala w symulatorze. */
const MAX_STEPS = 100000, MAX_ROWS = 1500;

function normOps(s){return s.replace(/<=|=</g,'≤').replace(/>=|=>/g,'≥').replace(/!=|<>/g,'≠').replace(/==/g,'=');}

function parseProgram(text){
  const lines=[], errors=[];
  text.split(/\r?\n/).forEach((raw,i)=>{
    let s=raw.replace(/^\s*\d+\s*[.)]\s+/,'').trim();
    if(!s) return;
    s=normOps(s.replace(/\s+/g,' '));
    const n=lines.length+1; let m;
    const V='([A-Da-d]|\\d+)', X='([A-Da-d])', T='(następnej|nastepnej|końca|konca|\\d+)';
    const up=v=>/^[a-d]$/i.test(v)?v.toUpperCase():v;
    const tg=t=>/^nast/i.test(t)?'next':(/^ko[ńn]/i.test(t)?'end':parseInt(t,10));
    let ins=null;
    if(m=s.match(new RegExp('^wczytaj do '+X+'$','i'))) ins={op:'read',a:up(m[1])};
    else if(m=s.match(new RegExp('^ustaw '+X+' na '+V+'$','i'))) ins={op:'set',a:up(m[1]),b:up(m[2])};
    else if(m=s.match(new RegExp('^zwi[ęe]ksz '+X+' o '+V+'$','i'))) ins={op:'inc',a:up(m[1]),b:up(m[2])};
    else if(m=s.match(new RegExp('^zmniejsz '+X+' o '+V+'$','i'))) ins={op:'dec',a:up(m[1]),b:up(m[2])};
    else if(m=s.match(new RegExp('^wypisz pude[łl]ko '+X+'$','i'))) ins={op:'out',a:up(m[1])};
    else if(m=s.match(/^wypisz napis ['"‘’](.*)['"‘’]$/i)) ins={op:'txt',t:m[1]};
    else if(/^przejd[źz] do nowej linii$/i.test(s)) ins={op:'nl'};
    else if(m=s.match(/^skocz do (ko[ńn]ca|\d+)$/i)) ins={op:'jmp',t:tg(m[1])};
    else if(m=s.match(new RegExp('^je[żz]eli '+X+' (=|≠|<|>|≤|≥) '+V+' skocz do '+T+' inaczej skocz do '+T+'$','i')))
      ins={op:'if',a:up(m[1]),c:m[2],b:up(m[3]),t1:tg(m[4]),t2:tg(m[5])};
    if(!ins){ errors.push({line:n,raw:raw.trim(),msg:'Nie rozumiem tego polecenia / Unknown command'}); ins={op:'bad'}; }
    ins.text=s; lines.push(ins);
  });
  return {lines,errors};
}

const CMP={'=':(a,b)=>a===b,'≠':(a,b)=>a!==b,'<':(a,b)=>a<b,'>':(a,b)=>a>b,'≤':(a,b)=>a<=b,'≥':(a,b)=>a>=b};

function newState(prog,inputs){
  return {prog,inp:inputs.slice(),box:{A:0,B:0,C:0,D:0},pc:1,out:[''],steps:0,rows:[],done:prog.length===0,error:null,warn:null};
}
function val(st,v){return /^[A-D]$/.test(v)?st.box[v]:parseInt(v,10);}
function target(st,t){return t==='next'?st.pc+1:(t==='end'?st.prog.length+1:t);}

function stepOnce(st){
  if(st.done) return;
  if(st.pc<1||st.pc>st.prog.length){st.done=true;return;}
  if(++st.steps>MAX_STEPS){st.error='Program działa zbyt długo (ponad '+MAX_STEPS+' kroków) – możliwa nieskończona pętla. / Program runs too long – possible infinite loop.';st.done=true;return;}
  const ins=st.prog[st.pc-1]; let next=st.pc+1, printed='';
  switch(ins.op){
    case 'read': if(!st.inp.length){st.error='Linia '+st.pc+': brak danych wejściowych. / Line '+st.pc+': not enough input numbers.';st.done=true;return;}
      st.box[ins.a]=st.inp.shift(); break;
    case 'set': st.box[ins.a]=val(st,ins.b); break;
    case 'inc': st.box[ins.a]+=val(st,ins.b); break;
    case 'dec': st.box[ins.a]-=val(st,ins.b);
      if(st.box[ins.a]<0&&!st.warn) st.warn='Linia '+st.pc+': w pudełku '+ins.a+' jest liczba ujemna ('+st.box[ins.a]+'). W konkursie unikaj ujemnych wyników. / Line '+st.pc+': box '+ins.a+' went negative. Avoid negative values in the contest.'; break;
    case 'out': printed=String(st.box[ins.a]); st.out[st.out.length-1]+=printed; break;
    case 'txt': printed="'"+ins.t+"'"; st.out[st.out.length-1]+=ins.t; break;
    case 'nl': st.out.push(''); printed='↵'; break;
    case 'jmp': next=target(st,ins.t); break;
    case 'if': next=CMP[ins.c](st.box[ins.a],val(st,ins.b))?target(st,ins.t1):target(st,ins.t2); break;
  }
  const line=st.pc;
  if(st.rows.length<MAX_ROWS) st.rows.push({n:st.rows.length+1,line,text:ins.text,box:{...st.box},printed});
  if(next<1||next>st.prog.length+1){st.error='Linia '+line+': skok do nieistniejącej linii '+next+'. / Line '+line+': jump to a line that does not exist ('+next+').';st.done=true;return;}
  st.pc=next; if(st.pc>st.prog.length) st.done=true;
}

function runAll(prog,inputs){
  const st=newState(prog,inputs); while(!st.done) stepOnce(st);
  return st;
}
function outputLines(st){const o=st.out.slice(); if(o.length&&o[o.length-1]==='') o.pop(); return o;}

/* ---------- diagnostyka bledow: co dokladnie jest nie tak w linii ---------- */
const POLECENIA = ['Wczytaj do A','Ustaw A na 5','Zwiększ A o 3','Zmniejsz A o 3',
  'Wypisz pudełko A','Wypisz napis \'TAK\'','Przejdź do nowej linii','Skocz do 7',
  'Skocz do końca','Jeżeli A ≤ 5 skocz do następnej inaczej skocz do 9'];

function diagnozaLinii(raw){
  const s = raw.replace(/^\s*\d+\s*[.)]\s+/,'').trim().replace(/\s+/g,' ');
  const L = s.toLowerCase();
  const zle = (p,e)=>({pl:p,en:e});

  if(/^wczytaj/.test(L)){
    if(!/^wczytaj do /.test(L)) return zle('po „Wczytaj” musi być „do” i nazwa pudełka, np. Wczytaj do A.',
      'after “Wczytaj” you need “do” and a box name, e.g. Wczytaj do A.');
    const b=s.slice(11).trim();
    if(!/^[A-Da-d]$/.test(b)) return zle('„'+b+'” to nie jest pudełko. Pudełka to tylko A, B, C i D.',
      '“'+b+'” is not a box. The boxes are only A, B, C and D.');
  }
  if(/^ustaw/.test(L)){
    if(/=/.test(s)) return zle('w tym języku nie używamy znaku „=”. Napisz: Ustaw A na 5.',
      'this language does not use “=”. Write: Ustaw A na 5.');
    if(!/ na /.test(L)) return zle('brakuje słowa „na”. Napisz: Ustaw A na 5.','the word “na” is missing. Write: Ustaw A na 5.');
  }
  if(/^(zwiększ|zwieksz|zmniejsz)/.test(L) && !/ o /.test(L))
    return zle('brakuje słowa „o” i liczby. Napisz: Zwiększ A o 3.','the word “o” and a number are missing. Write: Zwiększ A o 3.');
  if(/^wypisz/.test(L)){
    if(/^wypisz napis/.test(L) && !/['"‘’]/.test(s))
      return zle('napis trzeba ująć w apostrofy. Napisz: Wypisz napis \'TAK\'.','text must be in quotes. Write: Wypisz napis \'TAK\'.');
    if(!/^wypisz (pude[łl]ko|napis)/.test(L))
      return zle('po „Wypisz” musi być „pudełko” albo „napis”. Napisz: Wypisz pudełko A.',
        'after “Wypisz” you need “pudełko” or “napis”. Write: Wypisz pudełko A.');
    const b=s.replace(/^wypisz pude[łl]ko /i,'').trim();
    if(/^wypisz pude/i.test(s) && !/^[A-Da-d]$/.test(b))
      return zle('„'+b+'” to nie jest pudełko. Pudełka to tylko A, B, C i D.','“'+b+'” is not a box. The boxes are only A, B, C and D.');
  }
  if(/^skocz/.test(L) && !/^skocz do (ko[ńn]ca|\d+)$/.test(L))
    return zle('po „Skocz do” musi być numer linii albo słowo „końca”. Napisz: Skocz do 7.',
      'after “Skocz do” you need a line number or the word “końca”. Write: Skocz do 7.');
  if(/^je[żz]eli/.test(L)){
    if(!/inaczej skocz do/.test(L))
      return zle('warunek musi mieć obie drogi. Dopisz na końcu: inaczej skocz do 9.',
        'a condition needs both branches. Add at the end: inaczej skocz do 9.');
    if(!/[=≠<>≤≥]/.test(s))
      return zle('brakuje znaku porównania: =, ≠, <, >, ≤ albo ≥.','a comparison sign is missing: =, ≠, <, >, ≤ or ≥.');
  }
  if(/^przejd/.test(L) && !/^przejd[źz] do nowej linii$/.test(L))
    return zle('to polecenie brzmi dokładnie: Przejdź do nowej linii.','the command is exactly: Przejdź do nowej linii.');

  const pierwsze = L.split(' ')[0];
  const znane = ['wczytaj','ustaw','zwiększ','zwieksz','zmniejsz','wypisz','przejdź','przejdz','skocz','jeżeli','jezeli'];
  const odl = (a,b)=>{const d=[];for(let i=0;i<=a.length;i++){d[i]=[i];for(let j=1;j<=b.length;j++)d[i][j]=i===0?j:
    Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));}return d[a.length][b.length];};
  let best=null,bd=99; znane.forEach(k=>{const d=odl(pierwsze,k); if(d<bd){bd=d;best=k;}});
  if(best && bd<=2 && bd>0)
    return zle('nie znam słowa „'+pierwsze+'”. Czy chodziło o „'+best.charAt(0).toUpperCase()+best.slice(1)+'”?',
      'I do not know the word “'+pierwsze+'”. Did you mean “'+best.charAt(0).toUpperCase()+best.slice(1)+'”?');
  return zle('to nie jest żadne z poleceń języka. Dozwolone są: '+POLECENIA.slice(0,7).join('; ')+'.',
    'this is not one of the language commands. The allowed ones are: '+POLECENIA.slice(0,7).join('; ')+'.');
}
