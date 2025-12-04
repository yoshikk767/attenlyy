// Apple Black Pro - script.js
const WEIGHTS = { L: 1.0, T: 0.25, P: 0.5, S: 0.25 };
const STORAGE_KEY = 'pp_ltps_v3';
const TT_STORAGE_KEY = 'pp_tt_v3';
const NOTIF_LOOKAHEAD_MIN = 1;

const $ = id => document.getElementById(id);

// state
let subjects = loadData();
let timetable = loadTimetable();
let notifEnabled = false;

// LOAD / SAVE
function loadData(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ return []; }
}
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects)); render(); }

function loadTimetable(){
  try{ return JSON.parse(localStorage.getItem(TT_STORAGE_KEY)) || defaultDemo(); } catch(e){ return defaultDemo(); }
}
function saveTimetable(){ localStorage.setItem(TT_STORAGE_KEY, JSON.stringify(timetable)); renderTimetable(); }

function defaultDemo(){
  return [
    { day:'Monday', hour:1, subject:'DTI', start:'08:00', end:'09:00', type:'L' },
    { day:'Monday', hour:2, subject:'DTI', start:'09:00', end:'09:50', type:'L' },
    { day:'Monday', hour:3, subject:'DM', start:'10:10', end:'11:00', type:'L' },
    { day:'Monday', hour:4, subject:'DM', start:'11:00', end:'11:40', type:'L' },
    { day:'Monday', hour:5, subject:'LSE', start:'12:20', end:'13:10', type:'L' },
    { day:'Monday', hour:6, subject:'LSE', start:'13:10', end:'14:00', type:'L' },
    { day:'Monday', hour:7, subject:'PSTJ', start:'14:10', end:'15:00', type:'P' },
    { day:'Monday', hour:8, subject:'PSTJ', start:'15:00', end:'15:50', type:'P' }
  ];
}

// util
function timeToMinutes(t){ const [h,m] = (t||'00:00').split(':').map(Number); return h*60+m; }
function nowMinutes(){ const d=new Date(); return d.getHours()*60+d.getMinutes(); }
function dayName(i){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]; }

// TIMETABLE UI
function renderTimetable(){
  const wrap = $('timetableContainer'); if(!wrap) return;
  wrap.innerHTML = '';
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  days.forEach(day=>{
    const rows = timetable.filter(r=>r.day===day).sort((a,b)=>a.hour-b.hour);
    if(rows.length===0) return;
    const h = document.createElement('h4'); h.textContent = day; h.style.color = '#cfcfcf';
    wrap.appendChild(h);
    const table = document.createElement('table'); table.className='timetable-table';
    table.innerHTML = `<thead><tr><th>H</th><th>Subject</th><th>Type</th><th>Start</th><th>End</th><th></th></tr></thead>`;
    const tb = document.createElement('tbody');
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.hour}</td>
        <td><input class="tt-edit-subject" value="${r.subject}" data-day="${r.day}" data-hour="${r.hour}"></td>
        <td><select class="tt-edit-type" data-day="${r.day}" data-hour="${r.hour}">
             <option ${r.type==='L'?'selected':''} value="L">L</option>
             <option ${r.type==='T'?'selected':''} value="T">T</option>
             <option ${r.type==='P'?'selected':''} value="P">P</option>
             <option ${r.type==='S'?'selected':''} value="S">S</option>
            </select></td>
        <td><input class="tt-edit-start" value="${r.start}" data-day="${r.day}" data-hour="${r.hour}"></td>
        <td><input class="tt-edit-end" value="${r.end}" data-day="${r.day}" data-hour="${r.hour}"></td>
        <td class="row-actions">
          <button class="mini-btn btn-sm tt-add" data-day="${r.day}" data-hour="${r.hour}">+Row</button>
          <button class="mini-btn btn-danger tt-del" data-day="${r.day}" data-hour="${r.hour}">Del</button>
        </td>
      `;
      tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table);
  });

  // bind
  document.querySelectorAll('.tt-edit-subject').forEach(n=>n.onchange=(e)=>{ updateSlotField(e,'subject');});
  document.querySelectorAll('.tt-edit-type').forEach(n=>n.onchange=(e)=>{ updateSlotField(e,'type');});
  document.querySelectorAll('.tt-edit-start').forEach(n=>n.onchange=(e)=>{ updateSlotField(e,'start');});
  document.querySelectorAll('.tt-edit-end').forEach(n=>n.onchange=(e)=>{ updateSlotField(e,'end');});
  document.querySelectorAll('.tt-add').forEach(b=>b.onclick=addAfter);
  document.querySelectorAll('.tt-del').forEach(b=>b.onclick=removeSlot);
}

function updateSlotField(e,field){
  const day=e.target.dataset.day, hour=Number(e.target.dataset.hour);
  const slot = timetable.find(s=>s.day===day && Number(s.hour)===hour);
  if(!slot) return;
  slot[field] = e.target.value;
  saveTimetable();
}

function addAfter(){ const day=this.dataset.day, after=Number(this.dataset.hour);
  timetable.push({ day, hour: after+0.1, subject:'New', start:'00:00', end:'00:00', type:'L' });
  reindexDay(day); saveTimetable();
}
function removeSlot(){ if(!confirm('Delete slot?')) return;
  timetable = timetable.filter(s=>!(s.day===this.dataset.day && Number(s.hour)===Number(this.dataset.hour)));
  saveTimetable();
}
function reindexDay(day){
  const rows = timetable.filter(r=>r.day===day).sort((a,b)=>timeToMinutes(a.start)-timeToMinutes(b.start));
  rows.forEach((r,i)=> r.hour = i+1 );
}

// add row
document.getElementById('btnAddRow')?.addEventListener('click', ()=>{ timetable.push({ day:'Monday', hour: (timetable.filter(r=>r.day==='Monday').length)+1, subject:'New', start:'00:00', end:'00:00', type:'L' }); saveTimetable(); });

// file upload/export/reset
document.getElementById('uploadTT')?.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return; const text = await f.text();
  if(f.name.endsWith('.json')){ try{ const parsed = JSON.parse(text); if(Array.isArray(parsed)){ timetable = parsed; saveTimetable(); alert('Imported'); } }catch{ alert('Invalid JSON'); } }
  else if(f.name.endsWith('.csv')){ const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    timetable = lines.map(l=>{ const [day,hour,subject,start,end,type] = l.split(',').map(s=>s.trim()); return { day, hour: Number(hour), subject, start, end, type: type||'L' }; });
    saveTimetable(); alert('CSV imported'); }
  e.target.value='';
});
document.getElementById('exportTT')?.addEventListener('click', ()=>{ const blob = new Blob([JSON.stringify(timetable,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='timetable.json'; a.click(); });
document.getElementById('resetTT')?.addEventListener('click', ()=>{ if(confirm('Clear timetable?')){ timetable = []; saveTimetable(); } });

// SUBJECTS & STATS
function getStats(s){
  let wAtt=0,wTot=0; ['L','T','P','S'].forEach(k=>{ wAtt += (s[k]?.att||0)*WEIGHTS[k]; wTot += (s[k]?.tot||0)*WEIGHTS[k]; });
  const pct = wTot===0 ? 100 : (wAtt/wTot)*100;
  let margin=0,status='safe',msg='';
  if(pct < s.req){ const needed = Math.ceil((s.req * wTot - 100 * wAtt) / (100 - s.req)); margin = needed; status='danger'; msg = `Attend ${margin} lectures`; }
  else { const bunk = Math.floor((100*wAtt - s.req*wTot)/s.req); margin = bunk; if(bunk>0){ status='safe'; msg=`Can bunk ${bunk}` } else { status='warn'; msg="On edge"; } }
  return { wAtt, wTot, pct, status, msg };
}

function render(){
  const list = $('subjectList'); if(!list) return;
  list.innerHTML = '';
  if(subjects.length===0){ list.innerHTML = `<div style="padding:18px;color:var(--muted)">No subjects yet.</div>`; updateAggregate(); return; }
  let gAtt=0,gTot=0;
  subjects.forEach((s,idx)=>{
    const st = getStats(s); gAtt += st.wAtt; gTot += st.wTot;
    const el = document.createElement('div'); el.className='subject-item';
    el.innerHTML = `
      <div class="sub-top"><div style="font-weight:700">${s.name} <span class="small">Req ${s.req}%</span></div><div style="font-weight:800">${st.pct.toFixed(1)}%</div></div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.min(st.pct,100)}%"></div></div>
      <div style="display:flex;justify-content:space-between;color:var(--muted)"><div>Weighted: ${st.wAtt.toFixed(2)}/${st.wTot.toFixed(2)}</div><div>${st.msg}</div></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="mini-btn btn-sm" onclick="quickAdd(${idx},'L')">+L</button>
        <button class="mini-btn btn-sm" onclick="quickAdd(${idx},'T')">+T</button>
        <button class="mini-btn btn-sm" onclick="quickAdd(${idx},'P')">+P</button>
        <button class="mini-btn btn-sm" onclick="quickAdd(${idx},'S')">+S</button>
        <button class="mini-btn btn-danger" style="margin-left:auto" onclick="deleteSub(${idx})">Delete</button>
      </div>
    `;
    list.appendChild(el);
  });
  updateAggregate(gAtt,gTot);
}

function updateAggregate(wAtt=0,wTot=0){
  const overallPct = wTot===0 ? 0 : (wAtt/wTot)*100;
  const ov = $('overallVal'); if(ov) ov.textContent = overallPct.toFixed(1)+'%';
  const box = $('statBox'); if(box){
    if(wTot===0) box.textContent = 'Add subjects & timetable';
    else if(overallPct < 75){ const need = Math.ceil((75*wTot - 100*wAtt)/25); box.innerHTML = `⚠ Need ~${need} lectures for 75%`; box.style.color = 'var(--danger)'; }
    else { box.innerHTML = '✅ Aggregate safe'; box.style.color = 'var(--success)'; }
  }
}

// subject events
document.getElementById('btnAdd')?.addEventListener('click', ()=>{
  const name = $('inName').value.trim(); if(!name) return alert('Enter name');
  const getVal = (id)=> Number($(id).value)||0;
  const sub = { id:Date.now(), name, req:getVal('inReq')||75, L:{att:getVal('inL_att'), tot:getVal('inL_tot')}, T:{att:getVal('inT_att'), tot:getVal('inT_tot')}, P:{att:getVal('inP_att'), tot:getVal('inP_tot')}, S:{att:getVal('inS_att'), tot:getVal('inS_tot')} };
  if(['L','T','P','S'].some(k=> sub[k].att > sub[k].tot)) return alert('Attended cannot exceed total');
  subjects.push(sub); confetti({ particleCount: 80, spread: 60, origin:{y:0.6} }); $('inName').value=''; ['inL_att','inL_tot','inT_att','inT_tot','inP_att','inP_tot','inS_att','inS_tot'].forEach(i=>{ try{ $(i).value=''; }catch{}});
  saveData();
});

window.quickAdd = (idx,type)=>{ subjects[idx][type].att++; subjects[idx][type].tot++; confetti({ particleCount:30, spread:40, origin:{y:0.7} }); saveData(); };
window.deleteSub = (idx)=>{ if(confirm('Delete?')) { subjects.splice(idx,1); saveData(); } };
window.clearData = ()=>{ if(confirm('Clear all subjects?')){ subjects=[]; saveData(); } };

// CALCULATORS - UI bindings
function renderGeneralCalc(){ const a=$('calcArea'); if(!a) return;
  a.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="gen_total" class="input small" placeholder="Total"><input id="gen_att" class="input small" placeholder="Attended"><input id="gen_req" class="input small" value="75" placeholder="Req %"><button id="gen_calc" class="btn-primary">Calc</button></div><div id="gen_out" style="margin-top:10px;color:var(--muted)"></div>`;
  $('gen_calc').onclick = ()=>{
    const total=Number($('gen_total').value)||0, att=Number($('gen_att').value)||0, req=Number($('gen_req').value)||75;
    if(total<=0) return alert('Total > 0'); const pct=(att/total)*100; let out = `Current: ${pct.toFixed(2)}%<br>`;
    if(pct < req){ const need = Math.ceil((req*total - 100*att)/(100-req)); out += `Need ${need} classes to reach ${req}%`; } else { const bunk = Math.floor((100*att - req*total)/req); out += `Can bunk ~${bunk} classes`; }
    $('gen_out').innerHTML = out;
  };
}
function renderKLCalc(){ const a=$('calcArea'); if(!a) return;
  a.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"><input id="kl_L_att" class="input small" placeholder="L %"><input id="kl_T_att" class="input small" placeholder="T %"><input id="kl_P_att" class="input small" placeholder="P %"><input id="kl_S_att" class="input small" placeholder="S %"></div><div style="margin-top:8px"><button id="kl_calc" class="btn-primary">Calculate</button></div><div id="kl_out" style="margin-top:10px;color:var(--muted)"></div>`;
  $('kl_calc').onclick = ()=>{ const L=Number($('kl_L_att').value)||0, T=Number($('kl_T_att').value)||0, P=Number($('kl_P_att').value)||0, S=Number($('kl_S_att').value)||0; const totalW = WEIGHTS.L+WEIGHTS.T+WEIGHTS.P+WEIGHTS.S; const combined = (L*WEIGHTS.L + T*WEIGHTS.T + P*WEIGHTS.P + S*WEIGHTS.S)/totalW; $('kl_out').innerHTML = `Combined: <b>${combined.toFixed(2)}%</b>`; };
}
function renderCustomCalc(){ const a=$('calcArea'); if(!a) return;
  a.innerHTML = `<div id="customRows"></div><div style="margin-top:8px;display:flex;gap:8px"><button id="addCust" class="btn-sm">Add</button><button id="runCust" class="btn-primary">Calculate</button></div><div id="custom_out" style="margin-top:10px;color:var(--muted)"></div>`;
  const rows = $('customRows');
  function add(name='X',w=100,p=100){ const r=document.createElement('div'); r.style.display='flex'; r.style.gap='8px'; r.style.marginTop='8px'; r.innerHTML = `<input class="input small name" value="${name}"><input class="input small weight" value="${w}"><input class="input small pct" value="${p}"><button class="btn-sm">Del</button>`; r.querySelector('button').onclick=()=>r.remove(); rows.appendChild(r); }
  add('L',100,100); add('T',25,75);
  $('addCust').onclick = ()=> add();
  $('runCust').onclick = ()=>{
    const items = rows.querySelectorAll('div'); let wSum=0, weighted=0;
    items.forEach(it=>{ const w=Number(it.querySelector('.weight').value)||0; const p=Number(it.querySelector('.pct').value)||0; wSum += w; weighted += w*p; });
    if(wSum===0) return alert('Total weight 0'); $('custom_out').innerHTML = `Combined: <b>${(weighted/wSum).toFixed(2)}%</b>`;
  };
}
function renderAbsentSim(){ const a=$('calcArea'); if(!a) return;
  a.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="abs_total" class="input small" placeholder="Total"><input id="abs_att" class="input small" placeholder="Attended"><input id="abs_req" class="input small" placeholder="Req" value="75"><input id="abs_leaves" class="input small" placeholder="Planned leaves"><button id="abs_run" class="btn-primary">Sim</button></div><div id="abs_out" style="margin-top:10px;color:var(--muted)"></div>`;
  $('abs_run').onclick = ()=>{ const total=Number($('abs_total').value)||0, att=Number($('abs_att').value)||0, req=Number($('abs_req').value)||75, leaves=Number($('abs_leaves').value)||0; if(total<=0) return alert('Total >0'); const after=(att/(total+leaves))*100; const need = Math.ceil((req*total - 100*att)/(100-req)); let canMiss = Math.floor((100*att - req*total)/req); if(canMiss<0) canMiss=0; $('abs_out').innerHTML = `Current: ${(att/total*100).toFixed(2)}%<br>After ${leaves} leaves: <b>${after.toFixed(2)}%</b><br>To reach ${req}%: ${need>0?need+' classes':'Already safe'}<br>Can miss: ${canMiss}`; };
}

// bind calc seg
$('calcGeneral')?.addEventListener('click', ()=>{ setActiveSeg('calcGeneral'); renderGeneralCalc(); });
$('calcKL')?.addEventListener('click', ()=>{ setActiveSeg('calcKL'); renderKLCalc(); });
$('calcCustom')?.addEventListener('click', ()=>{ setActiveSeg('calcCustom'); renderCustomCalc(); });
$('calcAbsent')?.addEventListener('click', ()=>{ setActiveSeg('calcAbsent'); renderAbsentSim(); });
function setActiveSeg(id){ document.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active')); document.getElementById(id).classList.add('active'); }

// NOTIFICATIONS & PROMPTS
document.getElementById('notifBtn')?.addEventListener('click', async ()=>{
  if(Notification.permission==='granted'){ notifEnabled=true; alert('Notifications allowed'); return; }
  const p = await Notification.requestPermission(); notifEnabled = p==='granted'; alert('Permission: '+p);
});

const checkThrottle = {};
setInterval(()=> checkUpcoming(), 15*1000); checkUpcoming();

function checkUpcoming(){
  const now = new Date(); const today = dayName(now.getDay()); const minutesNow = nowMinutes();
  timetable.forEach(slot=>{
    if(slot.day !== today) return;
    const startMin = timeToMinutes(slot.start);
    const delta = startMin - minutesNow;
    if(delta >=0 && delta <= NOTIF_LOOKAHEAD_MIN){
      const key = `${slot.day}_${slot.hour}_${slot.start}`;
      if(checkThrottle[key] && (Date.now() - checkThrottle[key] < 60*1000)) return;
      checkThrottle[key] = Date.now();
      triggerPrompt(slot);
    }
  });
}

function triggerPrompt(slot){
  if(notifEnabled && "Notification" in window && Notification.permission==='granted'){
    const n = new Notification(`${slot.subject} • ${slot.start}`, { body: 'Respond: was class conducted?' });
    n.onclick = ()=>{ n.close(); modalForSlot(slot); };
    modalForSlot(slot);
  } else modalForSlot(slot);
}

function modalForSlot(slot){
  showModal(`
    <div style="font-weight:700">${slot.subject} · ${slot.start} — ${slot.end}</div>
    <div style="margin-top:10px;color:var(--muted)">Was class conducted?</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button id="mYes" class="btn-primary">Yes</button>
      <button id="mNo" class="btn-ghost">No</button>
    </div>
  `);
  setTimeout(()=>{
    document.getElementById('mYes').onclick = ()=>{
      updateAttendanceForSlot(slot,{ conducted:true });
      showModal(`
        <div style="font-weight:700">Did you attend?</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button id="mAttYes" class="btn-primary">Yes</button>
          <button id="mAttNo" class="btn-ghost">No</button>
        </div>
      `);
      setTimeout(()=>{
        document.getElementById('mAttYes').onclick = ()=>{ updateAttendanceForSlot(slot,{attended:true}); confetti({ particleCount:30, spread:40, origin:{y:0.7}}); hideModal(); };
        document.getElementById('mAttNo').onclick = ()=>{ updateAttendanceForSlot(slot,{attended:false}); hideModal(); };
      },40);
    };
    document.getElementById('mNo').onclick = ()=> hideModal();
  },40);
}

function updateAttendanceForSlot(slot,{conducted=null,attended=null}){
  let subj = subjects.find(s=> s.name.toLowerCase()===slot.subject.toLowerCase());
  if(!subj){ subj = { id:Date.now(), name:slot.subject, req:75, L:{att:0,tot:0}, T:{att:0,tot:0}, P:{att:0,tot:0}, S:{att:0,tot:0} }; subjects.push(subj); }
  const t = (slot.type||'L').toUpperCase();
  if(conducted===true) subj[t].tot = (subj[t].tot||0)+1;
  if(attended===true) subj[t].att = (subj[t].att||0)+1;
  saveData();
}

// modal helpers
function showModal(html){
  const root = $('modalRoot'); root.style.display='flex'; $('modalContent').innerHTML = html;
  $('modalConfirm').onclick = ()=> hideModal();
  $('modalCancel').onclick = ()=> hideModal();
}
function hideModal(){ const root = $('modalRoot'); root.style.display='none'; render(); }

// simple theme toggle
document.getElementById('themeToggle')?.addEventListener('click', ()=> document.body.classList.toggle('light'));

// init
renderTimetable(); render(); renderGeneralCalc();
