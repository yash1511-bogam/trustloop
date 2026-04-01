const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const app = {
  _loginMethodId: null,
  _registerMethodId: null,

  init() {
    // Tab only cycles through visible text inputs
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const inputs = [...document.querySelectorAll('input:not([type=hidden])')].filter(el => el.offsetParent !== null);
      if (!inputs.length) return;
      e.preventDefault();
      const i = inputs.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? inputs.length - 1 : i - 1) : (i < 0 || i >= inputs.length - 1 ? 0 : i + 1);
      inputs[next].focus();
    });
    this.renderLogo('landing-logo', 80);
    setTimeout(() => $('#btn-continue').classList.add('visible'), 3200);
    window.addEventListener('resize', () => {
      $('#landing-logo').innerHTML = '';
      this.renderLogo('landing-logo', 80);
    });
    this.checkSession();
    if (window.trustloop) {
      window.trustloop.onNavigate((page) => {
        const map = { dashboard:'dashboard', incidents:'incidents', analytics:'analytics', settings:'dashboard', 'new-incident':'incidents', triage:'incidents', 'draft-update':'incidents', team:'dashboard', billing:'dashboard', 'api-keys':'dashboard', audit:'dashboard', sso:'dashboard', changelog:'dashboard' };
        if (map[page]) this.navTo(map[page]);
      });
      window.trustloop.onOAuthCallback(() => this.checkSession());
      window.trustloop.isDev().then(dev => { if (dev) $('#btn-dev-skip').style.display = ''; });
    }
  },

  async devSkip() {
    if (!window.trustloop) return;
    const user = await window.trustloop.devLogin();
    if (user) this.enterDashboard(user);
  },

  async checkSession() {
    if (!window.trustloop) return;
    const user = await window.trustloop.getSession();
    if (user) this.enterDashboard(user);
  },

  // ═══ Logo ═══
  renderLogo(id, baseSize, animated) {
    if (animated === undefined) animated = true;
    const letters = [
      { src: '../../assets/Logo/T.svg', w: 60, h: 83 },
      { src: '../../assets/Logo/r.svg', w: 60, h: 60 },
      { src: '../../assets/Logo/u.svg', w: 60, h: 60 },
      { src: '../../assets/Logo/s.svg', w: 60, h: 60 },
      { src: '../../assets/Logo/2nd-t.svg', w: 72, h: 83 },
      { src: '../../assets/Logo/L.svg', w: 60, h: 83, ml: 0.3 },
      { src: '../../assets/Logo/%E2%88%9E.svg', w: 106, h: 62, animated: true },
      { src: '../../assets/Logo/p.svg', w: 60, h: 82 },
    ];
    const el = document.getElementById(id);
    if (!el) return;
    const size = baseSize || 60;
    const scale = size / 83;
    el.style.gap = Math.max(1, Math.round(size * 0.04)) + 'px';
    letters.forEach(l => {
      const w = Math.round(l.w * scale);
      if (l.animated && animated) {
        const wrap = document.createElement('div');
        wrap.className = 'infinity-letter';
        wrap.style.width = w + 'px';
        if (l.ml) wrap.style.marginLeft = Math.round(l.ml * size) + 'px';
        ['inf-white','inf-orange','inf-white-top'].forEach(cls => {
          const img = document.createElement('img');
          img.src = l.src; img.className = cls;
          img.style.width = w + 'px'; img.style.height = 'auto'; img.draggable = false;
          wrap.appendChild(img);
        });
        el.appendChild(wrap);
      } else {
        const img = document.createElement('img');
        img.src = l.src; img.style.width = w + 'px'; img.style.height = 'auto';
        if (l.ml) img.style.marginLeft = Math.round(l.ml * size) + 'px';
        img.draggable = false; el.appendChild(img);
      }
    });
  },

  renderSmallLogo(id) {
    const el = document.getElementById(id);
    if (!el || el.children.length > 0) return;
    this.renderLogo(id, 20, false);
  },

  // ═══ Screens ═══
  showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    if (id === 'screen-auth') {
      this.renderSmallLogo('auth-logo');
    }
    if (id === 'screen-dashboard') {
      this.renderSmallLogo('sidebar-logo');
    }
  },

  // ═══ Auth mode toggle (Sign In ↔ Sign Up) ═══
  switchAuthMode(mode) {
    $$('.auth-mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    $('.auth-mode-tabs').classList.toggle('register', mode === 'register');
    $$('.auth-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(mode === 'login' ? 'auth-login' : 'auth-register')?.classList.add('active');
    this.clearMessages('login');
    this.clearMessages('register');
  },

  // ═══ Login method tab (Social / Email) ═══
  loginTab(tab) {
    $$('#auth-login .auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $$('#auth-login .auth-tab-content').forEach(c => c.classList.remove('active'));
    $(`#login-${tab}`)?.classList.add('active');
  },

  // ═══ Messages ═══
  showError(prefix, msg) {
    $(`#${prefix}-message`)?.classList.add('hidden');
    const el = $(`#${prefix}-error`);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  },
  showMessage(prefix, msg) {
    $(`#${prefix}-error`)?.classList.add('hidden');
    const el = $(`#${prefix}-message`);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  },
  clearMessages(prefix) {
    $(`#${prefix}-error`)?.classList.add('hidden');
    $(`#${prefix}-message`)?.classList.add('hidden');
  },

  // ═══ Login ═══
  async loginSendOtp(e) {
    e.preventDefault();
    this.clearMessages('login');
    const email = $('#login-email-input').value.trim();
    if (!email) return false;
    $('#login-send-btn').disabled = true;
    $('#login-send-btn').textContent = 'Sending code...';
    try {
      const r = await window.trustloop.sendOtp(email);
      this._loginMethodId = r.methodId;
      this.showMessage('login', 'Verification code sent to your email.');
      $('#login-verify-form').classList.remove('hidden');
      $('#login-code-input').focus();
    } catch (err) {
      this.showError('login', err.message || 'Unable to send verification code.');
    }
    $('#login-send-btn').disabled = false;
    $('#login-send-btn').textContent = 'Send verification code';
    return false;
  },

  async loginVerifyOtp(e) {
    e.preventDefault();
    this.clearMessages('login');
    const code = $('#login-code-input').value.trim();
    if (!code || !this._loginMethodId) return false;
    try {
      const r = await window.trustloop.verifyOtp(this._loginMethodId, code);
      if (r.success && r.user) this.enterDashboard(r.user);
      else this.showError('login', 'Invalid verification code.');
    } catch (err) {
      this.showError('login', err.message || 'Verification failed.');
    }
    return false;
  },

  async oauthLogin(provider, intent) {
    const workspaceName = intent === 'register' ? ($('#reg-company')?.value?.trim() || undefined) : undefined;
    if (window.trustloop) await window.trustloop.oauthStart(provider, intent || 'login', workspaceName);
  },

  // ═══ Register ═══
  async registerStart(e) {
    e.preventDefault();
    this.clearMessages('register');
    const opts = {
      workspaceName: $('#reg-company').value.trim(),
      name: $('#reg-name').value.trim(),
      email: $('#reg-email').value.trim(),
    };
    $('#reg-send-btn').disabled = true;
    $('#reg-send-btn').textContent = 'Sending code...';
    try {
      const r = await window.trustloop.registerStart(opts);
      if (r.error) { this.showError('register', r.error); }
      else {
        this._registerMethodId = r.methodId;
        this.showMessage('register', 'Verification code sent to your email.');
        $('#register-verify-form').classList.remove('hidden');
        $('#reg-code-input').focus();
      }
    } catch (err) {
      this.showError('register', err.message || 'Unable to start registration.');
    }
    $('#reg-send-btn').disabled = false;
    $('#reg-send-btn').textContent = 'Send verification code';
    return false;
  },

  async registerVerify(e) {
    e.preventDefault();
    this.clearMessages('register');
    const code = $('#reg-code-input').value.trim();
    if (!code || !this._registerMethodId) return false;
    try {
      const r = await window.trustloop.registerVerify(this._registerMethodId, code);
      if (r.success && r.user) this.enterDashboard(r.user);
      else this.showError('register', r.error || 'Verification failed.');
    } catch (err) {
      this.showError('register', err.message || 'Verification failed.');
    }
    return false;
  },

  // ═══ Dashboard ═══
  async enterDashboard(user) {
    $('#user-name').textContent = user.name || user.email;
    $('#user-workspace').textContent = user.workspaceName || 'Workspace';
    $('#user-avatar').textContent = (user.name || user.email || 'U')[0].toUpperCase();
    this.showScreen('screen-dashboard');
    this.loadDashboard();
  },

  async logout() {
    if (window.trustloop) await window.trustloop.logout();
    this._loginMethodId = null;
    this._registerMethodId = null;
    $$('form').forEach(f => f.reset());
    $$('.auth-error, .auth-success').forEach(el => el.classList.add('hidden'));
    $('#login-verify-form')?.classList.add('hidden');
    $('#register-verify-form')?.classList.add('hidden');
    this.switchAuthMode('login');
    this.showScreen('screen-auth');
  },

  navTo(page) {
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${page}`)?.classList.add('active');
    if (page === 'dashboard') this.loadDashboard();
    if (page === 'incidents') this.loadIncidents();
    if (page === 'analytics') this.loadAnalytics();
  },

  async loadDashboard() {
    if (!window.trustloop) return;
    const data = await window.trustloop.dashboardData();
    if (!data) return;
    const { counts, snapshot, recentIncidents } = data;
    const stats = [
      { label:'Open incidents', value:counts.open, icon:'⚠', color:'#d4622b', bg:'rgba(212,98,43,0.10)', sub:`${counts.p1} P1 critical`, trend:counts.created7d>counts.resolved?'warn':'good', trendText:counts.created7d>0?`+${counts.created7d} this week`:'No new this week' },
      { label:'Resolved (7d)', value:counts.resolved, icon:'✓', color:'#e8944a', bg:'rgba(232,148,74,0.10)', sub:`${counts.total} total all-time`, trend:'good', trendText:counts.resolved>0?`${counts.resolved} closed`:'None yet' },
      { label:'Avg resolution', value:`${counts.avgResolutionHours.toFixed(1)}h`, icon:'⏱', color:'#c2571f', bg:'rgba(194,87,31,0.10)', sub:'Last 30 days', trend:counts.avgResolutionHours<24?'good':'warn', trendText:counts.avgResolutionHours<24?'Under target':'Above target' },
    ];
    $('#stat-grid').innerHTML = stats.map(s => `<div class="stat-card"><div class="stat-top"><div class="stat-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div><span class="stat-trend stat-trend-${s.trend}">${s.trend==='warn'?'↑':'↓'} ${s.trendText}</span></div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div><div class="stat-sub">${s.sub}</div></div>`).join('');
    this.renderVelocityChart(counts);
    const triage = snapshot?.triageCoveragePct ?? 0;
    const update = snapshot?.customerUpdateCoveragePct ?? 0;
    this.renderCoverageDonut(triage, update);
    if (recentIncidents?.length) {
      $('#recent-incidents').innerHTML = recentIncidents.map(inc => `<div class="incident-row"><div class="incident-title">${this.esc(inc.title)}</div><span class="badge badge-${(inc.severity||'P3').toLowerCase()}">${inc.severity||'P3'}</span><span class="badge badge-${(inc.status||'OPEN').toLowerCase()}">${inc.status||'OPEN'}</span><span class="incident-time">${this.timeAgo(inc.createdAt)}</span></div>`).join('');
    } else {
      $('#recent-incidents').innerHTML = '<p class="muted">No incidents yet.</p>';
    }
  },

  renderVelocityChart(counts) {
    const bars = [{label:'P1 Critical',value:counts.p1,color:'#ef4444'},{label:'Open',value:counts.open,color:'#f97316'},{label:'Resolved',value:counts.resolved,color:'#22c55e'},{label:'Created',value:counts.created7d,color:'#6366f1'}];
    const max = Math.max(...bars.map(b=>b.value),1);
    const ml=36,mr=12,mt=12,mb=36,w=500,h=280;
    const plotW=w-ml-mr, plotH=h-mt-mb, barW=plotW/bars.length, pad=barW*0.225;
    let svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;
    [0,0.25,0.5,0.75,1].forEach(t => { const y=mt+plotH*(1-t); svg+=`<line x1="${ml}" x2="${w-mr}" y1="${y}" y2="${y}" stroke="var(--rim)" stroke-dasharray="4 4"/><text x="${ml-6}" y="${y+4}" text-anchor="end" fill="var(--ghost)" font-size="12">${Math.round(max*t)}</text>`; });
    bars.forEach((bar,i) => { const barH=(bar.value/max)*plotH, x=ml+i*barW+pad, bw=barW-pad*2; svg+=`<rect x="${x}" y="${mt+plotH-barH}" width="${bw}" height="${barH}" rx="6" fill="${bar.color}"/>`; if(barH>20) svg+=`<text x="${x+bw/2}" y="${mt+plotH-barH+16}" text-anchor="middle" fill="#fff" font-size="12" font-weight="600">${bar.value}</text>`; svg+=`<text x="${x+bw/2}" y="${h-mb+18}" text-anchor="middle" fill="var(--ghost)" font-size="12">${bar.label}</text>`; });
    svg+='</svg>';
    $('#velocity-chart').innerHTML = svg;
  },

  renderCoverageDonut(triage, update) {
    const r=54,c=2*Math.PI*r,gap=c*0.02;
    const tL=(triage/100)*c-gap, uL=(update/100)*c-gap, avg=Math.round((triage+update)/2);
    let svg=`<svg width="140" height="140" viewBox="0 0 140 140"><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--rim)" stroke-width="12"/><circle cx="70" cy="70" r="${r}" fill="none" stroke="#8b5cf6" stroke-width="12" stroke-dasharray="${tL} ${c-tL}" stroke-dashoffset="${c*0.25}" stroke-linecap="round"/><circle cx="70" cy="70" r="${r}" fill="none" stroke="#06b6d4" stroke-width="12" stroke-dasharray="${uL} ${c-uL}" stroke-dashoffset="${c*0.25-tL-gap}" stroke-linecap="round"/><text x="70" y="66" text-anchor="middle" fill="var(--title)" font-size="22" font-weight="700">${avg}%</text><text x="70" y="84" text-anchor="middle" fill="var(--ghost)" font-size="11">avg coverage</text></svg>`;
    svg+=`<div style="display:flex;flex-direction:column;gap:8px;font-size:13px;margin-top:16px"><div style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#8b5cf6;display:inline-block"></span><span style="color:var(--subtext)">Triage</span><span style="margin-left:auto;font-weight:600;color:var(--title)">${triage}%</span></div><div style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:#06b6d4;display:inline-block"></span><span style="color:var(--subtext)">Updates</span><span style="margin-left:auto;font-weight:600;color:var(--title)">${update}%</span></div></div>`;
    $('#coverage-chart').innerHTML = svg;
  },

  async loadIncidents() {
    if (!window.trustloop) return;
    const [counts, list] = await Promise.all([window.trustloop.incidentsCounts(), window.trustloop.listIncidents()]);
    if (counts) {
      $('#incident-stat-grid').innerHTML = [{label:'Total',value:counts.total},{label:'Open',value:counts.open},{label:'P1 Critical',value:counts.p1},{label:'Resolved (7d)',value:counts.resolved7d}].map(s=>`<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('');
    }
    if (list?.items?.length) {
      $('#incidents-list').innerHTML = list.items.map(inc=>`<div class="incident-row"><div class="incident-title">${this.esc(inc.title)}</div><span class="badge badge-${(inc.severity||'P3').toLowerCase()}">${inc.severity||'P3'}</span><span class="badge badge-${(inc.status||'OPEN').toLowerCase()}">${inc.status||'OPEN'}</span><span class="incident-time">${this.timeAgo(inc.createdAt)}</span></div>`).join('');
    } else {
      $('#incidents-list').innerHTML = '<p class="muted">No incidents found.</p>';
    }
  },

  async loadAnalytics() {
    if (!window.trustloop) return;
    const data = await window.trustloop.analyticsSummary();
    if (!data) { $('#analytics-content').innerHTML = '<p class="muted">No analytics data.</p>'; return; }
    const { byStatus, bySeverity } = data;
    const maxS = Math.max(...byStatus.map(s=>s._count),1);
    const maxV = Math.max(...bySeverity.map(s=>s._count),1);
    const sC = {OPEN:'#f97316',INVESTIGATING:'#d97706',RESOLVED:'#22c55e',MONITORING:'#6366f1'};
    const vC = {P1:'#ef4444',P2:'#f97316',P3:'#3b82f6',P4:'#6b7280'};
    const bar = (items,max,colors,key) => items.map(s=>`<div class="analytics-bar-row"><div class="analytics-bar-label">${s[key]}</div><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${(s._count/max)*100}%;background:${colors[s[key]]||'var(--signal)'}"></div></div><div class="analytics-bar-value">${s._count}</div></div>`).join('');
    $('#analytics-content').innerHTML = `<div class="analytics-grid"><div class="analytics-card"><h3>By Status</h3>${bar(byStatus,maxS,sC,'status')||'<p class="muted">No data</p>'}</div><div class="analytics-card"><h3>By Severity</h3>${bar(bySeverity,maxV,vC,'severity')||'<p class="muted">No data</p>'}</div></div>`;
  },

  esc(str) { const d=document.createElement('div'); d.textContent=str||''; return d.innerHTML; },

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const mins = Math.floor((Date.now()-new Date(dateStr).getTime())/60000);
    if (mins<1) return 'just now';
    if (mins<60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs<24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  },
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
