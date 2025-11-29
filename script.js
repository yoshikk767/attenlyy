// --- Constants ---
const WEIGHTS = { L: 1.0, T: 0.25, P: 0.5, S: 0.25 };
const STORAGE_KEY = 'pp_ltps_data';

// --- DOM Helper ---
const $ = id => document.getElementById(id);

// --- State Management ---
let subjects = loadData();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let data = JSON.parse(raw);
  if (data.length > 0 && data[0].att !== undefined) {
    // Quiet migration from older versions
    return data.map(s => ({
      id: Math.random().toString(36), name: s.name, req: s.req || 75,
      L: { att: s.att, tot: s.total }, T: { att: 0, tot: 0 }, P: { att: 0, tot: 0 }, S: { att: 0, tot: 0 }
    }));
  }
  return data;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
  render();
}

// --- Logic ---
function getStats(s) {
  let wAtt = 0, wTot = 0;
  ['L','T','P','S'].forEach(type => {
    wAtt += (s[type].att * WEIGHTS[type]);
    wTot += (s[type].tot * WEIGHTS[type]);
  });

  const pct = wTot === 0 ? 100 : (wAtt / wTot) * 100;
  
  // Prediction Logic (Standardized to Lecture Hours i.e., weight 1.0)
  let margin = 0, status = 'safe', msg = '';
  if (pct < s.req) {
    const needed = (s.req * wTot - 100 * wAtt) / (100 - s.req);
    margin = Math.ceil(needed); 
    status = 'danger';
    msg = `Attend <b>${margin}</b> more Lectures`;
  } else {
    const bunkable = (100 * wAtt - s.req * wTot) / s.req;
    margin = Math.floor(bunkable);
    if (margin > 0) {
      status = 'safe'; msg = `Can bunk <b>${margin}</b> Lectures`;
    } else {
      status = 'warn'; msg = `On edge! Don't skip.`;
    }
  }
  return { wAtt, wTot, pct, status, msg };
}

function render() {
  const list = $('subjectList');
  list.innerHTML = '';
  let globalWAtt = 0, globalWTot = 0;

  if(subjects.length === 0) {
    list.innerHTML = `<div style="text-align:center; color:var(--muted); padding:40px;">No subjects added yet.</div>`;
  }

  subjects.forEach((s, idx) => {
    const stats = getStats(s);
    globalWAtt += stats.wAtt;
    globalWTot += stats.wTot;

    const div = document.createElement('div');
    div.className = 'subject-item';
    div.innerHTML = `
      <div class="sub-top">
        <div class="sub-name">${s.name} <span style="font-size:12px; color:var(--muted); font-weight:400">Req: ${s.req}%</span></div>
        <div class="sub-pct ${stats.status}">${stats.pct.toFixed(2)}%</div>
      </div>
      <div class="progress-track">
        <div class="progress-fill bg-${stats.status}" style="width: ${stats.pct}%"></div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:12px">
        <span style="color:var(--muted)">Weighted: ${stats.wAtt.toFixed(2)} / ${stats.wTot.toFixed(2)}</span>
        <span class="${stats.status}">${stats.msg}</span>
      </div>
      <div class="control-row">
        <button class="mini-btn btn-ghost" onclick="quickAdd(${idx}, 'L')">+L</button>
        <button class="mini-btn btn-ghost" onclick="quickAdd(${idx}, 'T')">+T</button>
        <button class="mini-btn btn-ghost" onclick="quickAdd(${idx}, 'P')">+P</button>
        <button class="mini-btn btn-ghost" onclick="quickAdd(${idx}, 'S')">+S</button>
        <button class="mini-btn btn-ghost" style="margin-left:auto; border-color:var(--danger); color:var(--danger)" onclick="deleteSub(${idx})">Del</button>
      </div>
    `;
    list.appendChild(div);
  });

  // Overall Score
  const overallPct = globalWTot === 0 ? 0 : (globalWAtt / globalWTot) * 100;
  $('overallVal').textContent = overallPct.toFixed(1) + '%';
  const circle = $('overallCircle');
  
  if(overallPct >= 75) {
      circle.style.borderColor = 'var(--success)';
  } else if(overallPct >= 65) {
      circle.style.borderColor = 'var(--warning)';
  } else {
      circle.style.borderColor = 'var(--danger)';
  }
  
  // Stat Box
  if (subjects.length > 0) {
    if(overallPct < 75) {
      const recoverNeeded = Math.ceil((75 * globalWTot - 100 * globalWAtt) / 25);
      $('statBox').innerHTML = `⚠️ Aggregate low. Need ~<b>${recoverNeeded}</b> more Lecture hours to hit 75%.`;
      $('statBox').style.color = 'var(--danger)';
    } else {
      $('statBox').innerHTML = `✅ Aggregate safe! Enjoy the confetti.`;
      $('statBox').style.color = 'var(--success)';
    }
  }
}

// --- Event Listeners ---

$('btnAdd').onclick = () => {
  const name = $('inName').value.trim();
  if (!name) return alert("Enter subject name");

  const getVal = (id) => Number($(id).value) || 0;
  const newSub = {
    id: Date.now(), name: name, req: getVal('inReq') || 75,
    L: { att: getVal('inL_att'), tot: getVal('inL_tot') },
    T: { att: getVal('inT_att'), tot: getVal('inT_tot') },
    P: { att: getVal('inP_att'), tot: getVal('inP_tot') },
    S: { att: getVal('inS_att'), tot: getVal('inS_tot') },
  };

  if(['L','T','P','S'].some(k => newSub[k].att > newSub[k].tot)) 
      return alert("Attended cannot be greater than Total.");

  subjects.push(newSub);
  
  // Confetti Blast for adding!
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

  $('inName').value = '';
  ['L','T','P','S'].forEach(t => { $(`in${t}_att`).value = ''; $(`in${t}_tot`).value = ''; });
  saveData();
};

// Attached to window so inline onclick HTML works
window.quickAdd = (idx, type) => {
  subjects[idx][type].att++;
  subjects[idx][type].tot++;
  
  // Mini Confetti for attending
  confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 }, colors: ['#6366f1', '#ec4899'] });
  
  saveData();
};

window.deleteSub = (idx) => {
  if(confirm("Delete this subject?")) {
    subjects.splice(idx, 1);
    saveData();
  }
};

window.clearData = () => {
  if(confirm("Wipe all data?")) { subjects = []; saveData(); }
};

$('themeToggle').onclick = () => { document.body.classList.toggle('light'); }

// Init
render();