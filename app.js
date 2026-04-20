/* ============================================================
   SKAT TRAINER v2.4
   Änderungen ggü. v2.3:
   - Persistenter Rang: einmal erreichte Ränge bleiben erhalten,
     auch wenn der Streak bricht. Nur Difficulty-Wechsel setzt zurück.
   - Neues Feld highestRankIdx in skat_p (+ Backfill aus record).
   ============================================================ */

var SUITS = ['♦','♥','♠','♣'];
var CARD_VALS = [
  {label:'7',pts:0},{label:'8',pts:0},{label:'9',pts:0},
  {label:'10',pts:10},{label:'B',pts:2},{label:'D',pts:3},
  {label:'K',pts:4},{label:'A',pts:11}
];

var RANKS = [
  {name:'Anfänger',         min:0  },
  {name:'Skat-Bauer',       min:1  },
  {name:'Kneipen-Dübler',   min:6  },
  {name:'Kreuz-Bube',       min:12 },
  {name:'Skat-Meister',     min:36 },
  {name:'Skat-Großmeister', min:72 },
  {name:'König Skat der I.',min:180}
];
var RANK_MSGS = {
  'Skat-Bauer':       'Herzlichen Glückwunsch, Skat-Bauer! Dein erster perfekter Sieg!',
  'Kneipen-Dübler':   'Wow… 6 mal 100 % hintereinander… Bleib dran!',
  'Kreuz-Bube':       'Immerhin ein Drittel eines Spiels am Stück perfekt. Schaffst du ein ganzes?',
  'Skat-Meister':     'Ein ganzes Spiel am Stück perfekt! Dies war erst der Anfang…',
  'Skat-Großmeister': 'Skat-Großmeister! Die Karten verneigen sich vor dir.',
  'König Skat der I.':'Die Skatwelt liegt dir zu Füßen!'
};

var OB_SLIDES = [
  { icon: '🃏', title: 'Das Spiel',
    items: [
      '32 Karten werden gemischt',
      '2 Karten kommen als Skat zur Seite',
      'In 10 Runden werden je 3 Karten aufgedeckt',
      'Alle 120 Punkte verteilen sich auf beide Parteien und den Skat'
    ]
  },
  { icon: '🧠', title: 'Deine Aufgabe',
    items: [
      'Beobachte jede Runde: 3 Karten erscheinen in der Tischmitte',
      'Der rote ◀ oder ▶ Pfeil zeigt, wer die Punkte bekommt',
      'Addiere die Punkte beider Parteien im Kopf über alle 10 Runden',
      'Tipp: nutze die Kartenpunkte-Legende unten zum Nachschlagen'
    ]
  },
  { icon: '🏆', title: 'Wertung',
    items: [
      'Am Ende trägst du deine Schätzung für beide Parteien ein',
      'Du siehst wie viel % du richtig hattest',
      'Nur 100 % = Sieg und verlängert deine Siegesserie',
      'Baue deinen Rang auf – von Anfänger bis König Skat der I.'
    ]
  }
];

var state = {
  deck:[], scoreA:0, scoreB:0,
  round:1, currentCards:[], currentParty:null,
  skatPts:0, phase:'idle'
};

function createDeck() {
  var d=[];
  for(var s=0;s<SUITS.length;s++)
    for(var v=0;v<CARD_VALS.length;v++)
      d.push({suit:SUITS[s],label:CARD_VALS[v].label,pts:CARD_VALS[v].pts});
  return d;
}
function drawRandom(deck){
  var i=Math.floor(Math.random()*deck.length);
  return deck.splice(i,1)[0];
}

function calcAccuracy(ga, gb, actualA, actualB, skatPts) {
  var distributed = 120 - skatPts;
  var delta = Math.abs(ga - actualA) + Math.abs(gb - actualB);
  var pct   = 100 - (delta / distributed * 100);
  return Math.max(0, Math.round(pct));
}
function calcAccuracyA(ga, actualA, skatPts) {
  var distributed = 120 - skatPts;
  var delta = Math.abs(ga - actualA);
  var pct   = 100 - (delta / distributed * 100);
  return Math.max(0, Math.round(pct));
}

function loadP() {
  try {
    var saved = JSON.parse(localStorage.getItem('skat_p'));
    if (!saved) return defP();
    var defs = defP();
    for (var k in defs) { if (saved[k] === undefined) saved[k] = defs[k]; }
    // Backfill: Bestands-Saves (vor v2.4) hatten kein highestRankIdx.
    // Leite den historisch erreichten Höchstrang aus dem besten Streak (record) ab.
    if (!saved.highestRankIdx && saved.record > 0) {
      saved.highestRankIdx = RANKS.indexOf(getRank(saved.record));
    }
    return saved;
  } catch(e) { return defP(); }
}
function defP() {
  return {streak:0,record:0,games:0,wins:0,
          history:[],lastWinDate:'',dayStreak:0,
          avgMode:10,onboardingSeen:false,difficulty:'normal',box1Mode:'streak',box2Mode:'today',
          highestRankIdx:0};
}
function saveP(p) {
  try {
    localStorage.setItem('skat_p',JSON.stringify(p));
  } catch(e) {
    if(typeof console!=='undefined' && console.warn)
      console.warn('[skat] Fortschritt konnte nicht gespeichert werden:', e);
    var el=document.getElementById('result');
    if(el){
      el.textContent='⚠ Fortschritt konnte nicht gespeichert werden.';
      el.className='result-display info';
    }
  }
}

function loadH() {
  try { return localStorage.getItem('skat_haptic') !== 'off'; }
  catch(e) { return true; }
}
function saveH(on) {
  try { localStorage.setItem('skat_haptic', on ? 'on' : 'off'); } catch(e){}
}
function haptic(pattern) {
  try {
    if(loadH() && typeof navigator!=='undefined' && navigator.vibrate)
      navigator.vibrate(pattern);
  } catch(e) {}
}
function getRank(s) {
  var r=RANKS[0];
  for(var i=0;i<RANKS.length;i++){if(s>=RANKS[i].min)r=RANKS[i];else break;}
  return r;
}

function todayStr() {
  return new Date().toISOString().slice(0,10);
}
function updateDayStreak(p) {
  var today = todayStr();
  if(!p.lastWinDate) {
    p.dayStreak=1; p.lastWinDate=today;
  } else if(p.lastWinDate === today) {
    /* already won today – no change */
  } else {
    var prev = new Date(today); prev.setDate(prev.getDate()-1);
    var yd   = prev.toISOString().slice(0,10);
    p.dayStreak = (p.lastWinDate === yd) ? (p.dayStreak||0)+1 : 1;
    p.lastWinDate = today;
  }
}
function getAvg(history, n) {
  var last = history.slice(-n);
  if(!last.length) return null;
  return Math.round(last.reduce(function(a,b){return a+b;},0)/last.length);
}

function buildChart(history) {
  var data = history.slice(-20);
  var n    = data.length;
  if(n < 2) {
    return '<p style="color:rgba(255,255,255,.3);font-size:.75rem;'
          +'text-align:center;padding:14px 0;">Noch zu wenig Daten – '
          +'spiele mindestens 2 Spiele.</p>';
  }
  var W=300,H=80,pL=24,pR=8,pT=8,pB=18;
  var cW=W-pL-pR, cH=H-pT-pB;
  var pts=data.map(function(v,i){
    return { x: pL+(n>1?i/(n-1):0.5)*cW, y: pT+cH-(v/100)*cH, v: v };
  });
  var svg='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg"'
         +' style="width:100%;display:block;">';
  [0,50,100].forEach(function(pct){
    var y=pT+cH-(pct/100)*cH;
    var col = pct===100 ? 'rgba(46,204,113,.2)' : 'rgba(255,255,255,.07)';
    var dash= pct===100 ? 'stroke-dasharray="3,3"' : '';
    svg+='<line x1="'+pL+'" y1="'+y+'" x2="'+(W-pR)+'" y2="'+y
        +'" stroke="'+col+'" stroke-width="'+(pct===100?'1.5':'1')+'" '+dash+'/>';
    svg+='<text x="'+(pL-3)+'" y="'+(y+3)+'" text-anchor="end"'
        +' font-size="7" fill="rgba(255,255,255,.28)">'+pct+'</text>';
  });
  var area=pts.map(function(p){return p.x+','+p.y;}).join(' ');
  area=pL+','+(pT+cH)+' '+area+' '+(W-pR)+','+(pT+cH);
  svg+='<polygon points="'+area+'" fill="rgba(201,162,39,.07)"/>';
  var line=pts.map(function(p){return p.x+','+p.y;}).join(' ');
  svg+='<polyline points="'+line+'" fill="none" stroke="rgba(201,162,39,.65)"'
      +' stroke-width="1.5" stroke-linejoin="round"/>';
  pts.forEach(function(p){
    var col = p.v===100 ? '#2ecc71' : p.v>=90 ? '#c9a227' : '#e74c3c';
    svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="3" fill="'+col+'"'
        +' stroke="rgba(0,0,0,.4)" stroke-width=".5"/>';
  });
  var firstNum = history.length - n + 1;
  var lastNum  = history.length;
  svg+='<text x="'+pL+'" y="'+(H-3)+'" font-size="7" fill="rgba(255,255,255,.25)">'
      +firstNum+'</text>';
  svg+='<text x="'+(W-pR)+'" y="'+(H-3)+'" text-anchor="end" font-size="7"'
      +' fill="rgba(255,255,255,.25)">'+lastNum+'</text>';
  svg+='</svg>';
  return svg;
}

function updateChart() {
  var p = loadP();
  G('chartWrap').innerHTML = buildChart(p.history);
}

function G(id){ return document.getElementById(id); }
function show(id){ G(id).classList.remove('hidden'); }
function hide(id){ G(id).classList.add('hidden'); }

function resetRevealUI() {
  ['inputA','inputB'].forEach(function(id){
    var el = G(id);
    el.classList.remove('correct','wrong','gold-glow');
  });
  ['arrowA','arrowB'].forEach(function(id){
    G(id).classList.remove('show');
  });
  ['actualA','actualB'].forEach(function(id){
    var el = G(id);
    el.classList.remove('show');
    el.textContent = '';
  });
  G('skatPunkte').classList.remove('revealed');
  clearFxLayers();
}

function revealTruth(side, actualValue) {
  var arrow = G('arrowA'); var num = G('actualA');
  if(side === 'B') { arrow = G('arrowB'); num = G('actualB'); }
  num.textContent = actualValue;
  requestAnimationFrame(function(){
    arrow.classList.add('show');
    num.classList.add('show');
  });
}

function clearFxLayers() {
  var layers = document.querySelectorAll('.fx-layer');
  for(var i=0;i<layers.length;i++) layers[i].parentNode.removeChild(layers[i]);
}

function fireGoldBurst(targetEl) {
  var parent = targetEl.parentNode;
  var layer = document.createElement('div');
  layer.className = 'fx-layer';
  parent.appendChild(layer);

  var cx = targetEl.offsetLeft + targetEl.offsetWidth / 2;
  var cy = targetEl.offsetTop  + targetEl.offsetHeight / 2;

  var ring = document.createElement('div');
  ring.className = 'fx-ring';
  ring.style.left = cx + 'px';
  ring.style.top  = cy + 'px';
  layer.appendChild(ring);

  setTimeout(function(){
    var N = 12;
    for(var i=0;i<N;i++){
      var ray = document.createElement('div');
      ray.className = 'fx-ray';
      var rot = (360/N)*i + (Math.random()*10 - 5);
      var len = (55 + Math.random()*30) + 'px';
      ray.style.left = cx + 'px';
      ray.style.top  = cy + 'px';
      ray.style.transform = 'rotate('+rot+'deg)';
      ray.style.setProperty('--len', len);
      ray.style.animationDelay = (Math.random()*.08) + 's';
      layer.appendChild(ray);
    }
  }, 30);

  setTimeout(function(){
    var N = 14;
    for(var i=0;i<N;i++){
      var spark = document.createElement('div');
      spark.className = 'fx-spark';
      var angle = (Math.PI*2*i)/N + (Math.random()*.4 - .2);
      var dist  = 42 + Math.random()*38;
      spark.style.left = cx + 'px';
      spark.style.top  = cy + 'px';
      spark.style.setProperty('--dx', Math.cos(angle)*dist + 'px');
      spark.style.setProperty('--dy', Math.sin(angle)*dist + 'px');
      spark.style.animationDelay = (Math.random()*.15) + 's';
      spark.style.animationDuration = (.7 + Math.random()*.4) + 's';
      layer.appendChild(spark);
    }
  }, 50);

  setTimeout(function(){
    if(layer.parentNode) layer.parentNode.removeChild(layer);
  }, 1400);
}

function mkCardFace(card, color) {
  var frag = document.createDocumentFragment();
  var top=document.createElement('div'); top.className='card-corner';
  top.innerHTML='<span class="c-label" style="color:'+color+'">'+card.label+'</span>'
               +'<span class="c-suit"  style="color:'+color+'">'+card.suit+'</span>';
  var mid=document.createElement('div'); mid.className='card-suit-center';
  mid.style.color=color; mid.textContent=card.suit;
  var bot=document.createElement('div'); bot.className='card-corner bot';
  bot.innerHTML='<span class="c-label" style="color:'+color+'">'+card.label+'</span>'
               +'<span class="c-suit"  style="color:'+color+'">'+card.suit+'</span>';
  frag.appendChild(top); frag.appendChild(mid); frag.appendChild(bot);
  return frag;
}

function mkCard(card, small) {
  var red   = card.suit==='♥' || card.suit==='♦';
  var color = red ? '#c0392b' : '#1a1a2e';
  var d = document.createElement('div');
  d.className = 'card'+(red?' red':'')+(small?' small':'');

  if(small) {
    d.appendChild(mkCardFace(card, color));
    return d;
  }

  var rot = (Math.random()*16 - 8).toFixed(1) + 'deg';
  d.style.setProperty('--rot', rot);

  var inner = document.createElement('div');
  inner.className = 'card-inner';

  var back = document.createElement('div');
  back.className = 'card-face card-back-face';

  var front = document.createElement('div');
  front.className = 'card-face card-front-face';
  front.appendChild(mkCardFace(card, color));

  inner.appendChild(back);
  inner.appendChild(front);
  d.appendChild(inner);
  return d;
}

function updateStats() {
  var p=loadP();
  var currentIdx = RANKS.indexOf(getRank(p.streak));
  var displayIdx = Math.max(currentIdx, p.highestRankIdx || 0);
  var r = RANKS[displayIdx];
  G('statRang').textContent = r.name;

  var b1mode = p.box1Mode || 'streak';
  var b1 = G('statBox1Val');
  if(b1mode === 'streak') {
    G('statBox1Label').textContent = 'Serie';
    b1.textContent = p.streak;
  } else {
    G('statBox1Label').textContent = 'Rekord';
    b1.textContent = p.record;
  }
  if(b1mode === 'streak' && p.streak >= 5) b1.classList.add('streak-glow');
  else                                     b1.classList.remove('streak-glow');

  var today = todayStr();
  var won   = p.lastWinDate === today;
  var b2mode = p.box2Mode || 'today';
  var b2 = G('statBox2Val');
  if(b2mode === 'today') {
    G('statBox2Label').textContent = 'Heute';
    if(won) {
      b2.innerHTML = '<span class="fire-emoji">🔥</span> '+(p.dayStreak||1);
      b2.classList.add('fire');
    } else {
      b2.textContent = '—';
      b2.classList.remove('fire');
    }
  } else if(b2mode === 'wins') {
    G('statBox2Label').textContent = 'Siege ges.';
    b2.textContent = p.wins||0;
    b2.classList.remove('fire');
  } else {
    G('statBox2Label').textContent = 'Spiele';
    b2.textContent = p.games;
    b2.classList.remove('fire');
  }

  var mode = p.avgMode || 10;
  var real = Math.min(p.history.length, mode);
  G('statAvgLabel').textContent = 'Ø '+real;
  var avg = getAvg(p.history, mode);
  G('statAvg').textContent = avg !== null ? avg+' %' : '—';
}

function showRankModal(title, msg) {
  G('modalTitle').textContent = title;
  G('modalMsg').textContent   = msg;
  show('modal');
}

function renderTable() {
  var t=G('tischmitte'); t.innerHTML='';
  var cards=[];
  for(var i=0;i<state.currentCards.length;i++){
    var c=mkCard(state.currentCards[i],false);
    t.appendChild(c);
    cards.push(c);
  }
  requestAnimationFrame(function(){
    for(var i=0;i<cards.length;i++) cards[i].classList.add('flipped');
  });
}

var obSlide = 0;

function showOnboarding() {
  obSlide = 0;
  renderSlide();
  show('onboarding');
}

function renderSlide() {
  var s = OB_SLIDES[obSlide];
  G('obIcon').textContent  = s.icon;
  G('obTitle').textContent = s.title;
  var ul = G('obList'); ul.innerHTML = '';
  s.items.forEach(function(item){
    var li=document.createElement('li'); li.textContent=item; ul.appendChild(li);
  });
  var dots=G('obDots'); dots.innerHTML='';
  OB_SLIDES.forEach(function(_,i){
    var dot=document.createElement('div');
    dot.className='onboard-dot'+(i===obSlide?' active':'');
    dots.appendChild(dot);
  });
  var isLast = obSlide === OB_SLIDES.length-1;
  G('obNext').textContent = isLast ? 'Los geht\'s! 🎴' : 'Weiter →';
}

function closeOnboarding() {
  hide('onboarding');
  var p=loadP(); p.onboardingSeen=true; saveP(p);
}

G('obNext').addEventListener('click', function(){
  if(obSlide < OB_SLIDES.length-1){ obSlide++; renderSlide(); }
  else closeOnboarding();
});
G('obSkip').addEventListener('click', closeOnboarding);
G('btnInfo').addEventListener('click', showOnboarding);

function toggleSection(bodyId, arrowId) {
  var body  = G(bodyId);
  var arrow = G(arrowId);
  var open  = body.classList.toggle('open');
  arrow.classList.toggle('open', open);
}

G('btnLegend').addEventListener('click', function(){ toggleSection('legendBody','legendArrow'); });
G('btnLegendIcon').addEventListener('click', function(){ toggleSection('legendBody','legendArrow'); });
G('btnVerlauf').addEventListener('click',   function(){ toggleSection('verlaufBody','verlaufArrow'); updateChart(); });

G('statAvgBox').addEventListener('click', function(){
  var p=loadP();
  var modes=[10,20,50];
  var cur=modes.indexOf(p.avgMode||10);
  p.avgMode=modes[(cur+1)%modes.length];
  saveP(p); updateStats();
});
G('statBox1').addEventListener('click', function(){
  var p=loadP();
  p.box1Mode = (p.box1Mode||'streak')==='streak' ? 'record' : 'streak';
  saveP(p); updateStats();
});
G('statBox2').addEventListener('click', function(){
  var p=loadP();
  var modes=['today','wins','games'];
  var cur=modes.indexOf(p.box2Mode||'today');
  p.box2Mode=modes[(cur+1)%modes.length];
  saveP(p); updateStats();
});

function getDiff() { return loadP().difficulty || 'normal'; }

var DIFF_DESCS = {
  easy:   'Nur der Wert von Meine Partei muss stimmen.',
  normal: 'Beide Werte müssen exakt stimmen.',
  hard:   '5 Sek. pro Runde · 20 Sek. für die Schätzung am Ende.'
};

var TIMER_CIRC = 175.93;
var _timerRaf = null;
var _timerStart = 0;
var _timerDur = 0;
var _timerCb = null;

function clearTimer() {
  if(_timerRaf){ cancelAnimationFrame(_timerRaf); _timerRaf=null; }
  _timerCb = null;
  G('timerWrap').classList.add('hidden');
  var txt=G('timerDisplay');
  txt.textContent=''; txt.className='timer-text';
  var fg=G('timerRingFg');
  if(fg){ fg.setAttribute('stroke-dashoffset','0'); fg.setAttribute('stroke','#c9a227'); }
}

function startTimer(secs, onExpire) {
  clearTimer();
  _timerStart = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
  _timerDur   = secs*1000;
  _timerCb    = onExpire;
  G('timerWrap').classList.remove('hidden');
  var txt = G('timerDisplay');
  txt.textContent = secs;
  txt.className = 'timer-text';

  function tick() {
    var now = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
    var elapsed = now - _timerStart;
    var progress = Math.min(1, elapsed / _timerDur);
    var remaining = Math.max(0, _timerDur - elapsed);
    var fg = G('timerRingFg');
    if(fg){
      fg.setAttribute('stroke-dashoffset', (TIMER_CIRC * progress).toFixed(2));
      var color = '#c9a227';
      if(progress >= .8)      color = '#e74c3c';
      else if(progress >= .5) color = '#e08e2a';
      fg.setAttribute('stroke', color);
    }
    var secsLeft = Math.ceil(remaining/1000);
    txt.textContent = secsLeft;
    if(progress >= .8) txt.className = 'timer-text urgent';
    else               txt.className = 'timer-text';

    if(progress >= 1){
      var cb = _timerCb;
      clearTimer();
      if(cb) cb();
      return;
    }
    _timerRaf = requestAnimationFrame(tick);
  }
  _timerRaf = requestAnimationFrame(tick);
}

function openSettings() {
  var p=loadP(), d=p.difficulty||'normal';
  ['diffEasy','diffNormal','diffHard'].forEach(function(id){ G(id).classList.remove('active'); });
  G(d==='easy'?'diffEasy':d==='hard'?'diffHard':'diffNormal').classList.add('active');
  G('diffDesc').textContent=DIFF_DESCS[d];
  G('hapticToggle').checked = loadH();
  hide('resetConfirm');
  show('settingsOverlay');
}

function setDiff(d) {
  clearTimer();
  var p=loadP();
  if(p.difficulty !== d){
    p.highestRankIdx = 0;
    p.streak = 0;
  }
  p.difficulty=d; saveP(p);
  ['diffEasy','diffNormal','diffHard'].forEach(function(id){ G(id).classList.remove('active'); });
  G(d==='easy'?'diffEasy':d==='hard'?'diffHard':'diffNormal').classList.add('active');
  G('diffDesc').textContent=DIFF_DESCS[d];
  updateStats();
}

G('btnSettings').addEventListener('click', openSettings);
G('btnSettingsClose').addEventListener('click', function(){ hide('settingsOverlay'); });
G('diffEasy').addEventListener('click',   function(){ setDiff('easy'); });
G('diffNormal').addEventListener('click', function(){ setDiff('normal'); });
G('diffHard').addEventListener('click',   function(){ setDiff('hard'); });
G('hapticToggle').addEventListener('change', function(){ saveH(this.checked); haptic(20); });

G('btnReset').addEventListener('click', function(){
  show('resetConfirm');
});
G('btnResetNo').addEventListener('click', function(){ hide('resetConfirm'); });
G('btnResetYes').addEventListener('click', function(){
  var fresh=defP();
  fresh.onboardingSeen=true;
  saveP(fresh);
  hide('settingsOverlay');
  updateStats();
  updateChart();
  G('result').textContent=''; G('result').className='result-display';
});

function startGame() {
  clearTimer();
  state.deck=createDeck(); state.scoreA=0; state.scoreB=0;
  state.round=1; state.currentCards=[]; state.currentParty=null;
  state.skatPts=0; state.phase='playing';

  var p=loadP(); p.games++; saveP(p);

  G('inputA').value=''; G('inputB').value='';
  G('inputA').disabled=false; G('inputB').disabled=false;
  G('skatPunkte').textContent='? Pkt.';
  G('skatCards').innerHTML='<div class="card-back"></div><div class="card-back"></div>';
  G('result').textContent=''; G('result').className='result-display';
  G('indicatorA').className='side-indicator left'; G('indicatorB').className='side-indicator right';
  G('gameTable').className='game-table';
  G('btnStart').textContent='Neustart';

  resetRevealUI();

  show('btnWeiter'); hide('btnLoesen');
  updateStats();
  nextRound();
}

function nextRound() {
  var pts=0, drawn=[];
  for(var i=0;i<3;i++){var c=drawRandom(state.deck); pts+=c.pts; drawn.push(c);}
  var party=Math.random()<0.5?'A':'B';
  if(party==='A') state.scoreA+=pts; else state.scoreB+=pts;
  state.currentCards=drawn; state.currentParty=party;
  G('roundDisplay').textContent='Runde '+state.round+' / 10';
  renderTable();
  state.round++;
  G('indicatorA').className='side-indicator left'+(party==='A'?' active':'');
  G('indicatorB').className='side-indicator right'+(party==='B'?' active':'');
  var tbl=G('gameTable');
  tbl.classList.remove('active-a','active-b');
  tbl.classList.add(party==='A' ? 'active-a' : 'active-b');
  if(state.deck.length===2){
    hide('btnWeiter'); show('btnLoesen');
    if(getDiff()==='hard') startTimer(20, function(){ if(state.phase==='playing') solve(); });
  } else {
    if(getDiff()==='hard') startTimer(5, function(){ if(state.phase==='playing') nextRound(); });
  }
}

function solve() {
  var ra=G('inputA').value.trim(), rb=G('inputB').value.trim();
  if(ra===''||rb===''){
    G('result').textContent='Bitte beide Felder ausfüllen!';
    G('result').className='result-display info'; return;
  }
  if(!/^\d+$/.test(ra) || !/^\d+$/.test(rb)){
    G('result').textContent='Nur ganze Zahlen zwischen 0 und 120!';
    G('result').className='result-display info'; return;
  }
  var ga=parseInt(ra,10), gb=parseInt(rb,10);
  if(ga<0||ga>120||gb<0||gb>120){
    G('result').textContent='Werte müssen zwischen 0 und 120 liegen!';
    G('result').className='result-display info'; return;
  }

  var s1=state.deck[0], s2=state.deck[1];
  state.skatPts = s1.pts+s2.pts;
  G('skatPunkte').textContent=state.skatPts+' Pkt.';
  G('skatCards').innerHTML='';
  G('skatCards').appendChild(mkCard(s1,true));
  G('skatCards').appendChild(mkCard(s2,true));

  G('inputA').disabled=true; G('inputB').disabled=true;
  hide('btnLoesen');
  G('btnStart').textContent='Nächste Runde';

  G('skatPunkte').classList.add('revealed');

  var aOk = (ga === state.scoreA);
  var bOk = (gb === state.scoreB);
  var bothExact = aOk && bOk;

  var inA = G('inputA'), inB = G('inputB');
  if(bothExact){
    inA.classList.add('gold-glow');
    inB.classList.add('gold-glow');
  } else {
    inA.classList.add(aOk ? 'correct' : 'wrong');
    inB.classList.add(bOk ? 'correct' : 'wrong');
    if(!aOk) revealTruth('A', state.scoreA);
    if(!bOk) revealTruth('B', state.scoreB);
  }

  if(bothExact){
    setTimeout(function(){
      fireGoldBurst(inA);
      fireGoldBurst(inB);
    }, 250);
  }

  var diff = getDiff();
  var acc, correct;
  if(diff === 'easy') {
    acc     = calcAccuracyA(ga, state.scoreA, state.skatPts);
    correct = aOk;
  } else {
    acc     = calcAccuracy(ga, gb, state.scoreA, state.scoreB, state.skatPts);
    correct = (acc === 100);
  }

  if(correct){
    G('result').textContent='✓ 100 %';
    G('result').className='result-display correct';
  } else if(acc >= 80){
    G('result').textContent=acc+' %';
    G('result').className='result-display near';
  } else {
    G('result').textContent=acc+' %';
    G('result').className='result-display wrong';
  }

  var tbl = G('gameTable');
  tbl.classList.remove('active-a','active-b');

  if(correct)       haptic([50,30,50]);
  else if(acc >= 80) haptic([80]);
  else               haptic([200]);

  var p=loadP();
  var prevDisplayIdx = Math.max(RANKS.indexOf(getRank(p.streak)), p.highestRankIdx || 0);
  var oldRec=p.record;

  if(correct){
    p.streak++; p.wins=(p.wins||0)+1;
    if(p.streak>p.record) p.record=p.streak;
    var achievedIdx = RANKS.indexOf(getRank(p.streak));
    if(achievedIdx > (p.highestRankIdx || 0)) p.highestRankIdx = achievedIdx;
    updateDayStreak(p);
  } else {
    var hadStreak = p.streak > 0;
    p.streak=0;
    if(hadStreak){
      var sb = G('statBox1Val');
      sb.classList.remove('shake');
      void sb.offsetWidth;
      sb.classList.add('shake');
    }
  }

  p.history.push(acc);
  if(p.history.length>50) p.history.shift();

  saveP(p);
  updateStats();
  updateChart();
  state.phase='solved';

  if(correct){
    var newRank = RANKS[p.highestRankIdx || 0];
    if(p.highestRankIdx > prevDisplayIdx && RANK_MSGS[newRank.name]){
      setTimeout(function(){ showRankModal('🎉 '+newRank.name+'!',RANK_MSGS[newRank.name]); },700);
    } else if(p.streak>oldRec && p.streak>1){
      var growth=p.streak-oldRec;
      var msg=growth>1
        ?p.streak+' hintereinander! '+growth+' mehr als dein letzter Rekord!'
        :'Und nochmal steigt dein Rekord um einen!';
      setTimeout(function(){ showRankModal('⭐ Neuer Rekord!',msg); },700);
    }
  }
}

G('btnStart').addEventListener('click',  startGame);
G('btnWeiter').addEventListener('click', function(){ haptic(20); clearTimer(); nextRound(); });
G('btnLoesen').addEventListener('click', function(){ clearTimer(); solve(); });
G('modalClose').addEventListener('click', function(){ hide('modal'); });
G('inputA').addEventListener('keydown', function(e){ if(e.key==='Enter') G('inputB').focus(); });
G('inputB').addEventListener('keydown', function(e){ if(e.key==='Enter'&&state.phase!=='idle') solve(); });

updateStats();
updateChart();
var _p = loadP();
if(!_p.onboardingSeen) showOnboarding();
