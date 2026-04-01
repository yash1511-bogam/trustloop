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
        const map = { dashboard:'dashboard', incidents:'incidents', analytics:'analytics', settings:'ws-general', 'new-incident':'incidents', triage:'incidents', 'draft-update':'incidents', team:'ws-team', billing:'ws-billing', 'api-keys':'sec-apikeys', audit:'sec-audit', sso:'ws-general', changelog:'dashboard' };
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
    if (user) {
      this.enterDashboard(user);
      const savedView = sessionStorage.getItem('tl:view');
      if (savedView) this.navTo(savedView);
    }
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
    el.style.gap = Math.max(2, Math.round(size * 0.06)) + 'px';
    el.style.alignItems = 'flex-end';
    letters.forEach(l => {
      const w = Math.round(l.w * scale);
      const h = Math.round(l.h * scale);
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

  renderSmallLogo(id, size) {
    const el = document.getElementById(id);
    if (!el || el.children.length > 0) return;
    this.renderLogo(id, size || 22, false);
  },

  // ═══ Screens ═══
  showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    sessionStorage.setItem('tl:screen', id);
    if (id === 'screen-auth') {
      this.renderSmallLogo('auth-logo', 32);
    }
    if (id === 'screen-dashboard') {
      this.renderSmallLogo('sidebar-logo', 20);
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
  toggleSidebar() {
    document.querySelector('.shell')?.classList.toggle('sidebar-collapsed');
  },

  toggleGroup(name) {
    const el = document.querySelector(`.nav-group[data-group="${name}"]`);
    if (!el) return;
    // Don't close if it contains the active page
    if (el.classList.contains('open') && el.querySelector('.nav-item.active')) return;
    el.classList.toggle('open');
  },

  async enterDashboard(user) {
    const el = (s) => document.querySelector(s);
    if (el('#user-name')) el('#user-name').textContent = user.name || user.email;
    if (el('#user-email')) el('#user-email').textContent = user.email || '';
    if (el('#user-avatar')) el('#user-avatar').textContent = (user.name || user.email || 'U')[0].toUpperCase();
    if (el('#sidebar-ws-name')) el('#sidebar-ws-name').textContent = user.workspaceName || 'Workspace';
    this.showScreen('screen-dashboard');
    this.loadDashboard();
  },

  async logout() {
    if (window.trustloop) await window.trustloop.logout();
    sessionStorage.removeItem('tl:screen');
    sessionStorage.removeItem('tl:view');
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
    sessionStorage.setItem('tl:view', page);
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    $$('.view').forEach(v => v.classList.remove('active'));
    // Auto-open the group containing the active page
    const activeLink = document.querySelector(`.nav-item[data-page="${page}"]`);
    const group = activeLink?.closest('.nav-group');
    if (group) group.classList.add('open');
    $(`#view-${page}`)?.classList.add('active');
    const loaders = {
      dashboard: () => this.loadDashboard(),
      incidents: () => this.loadIncidents(),
      analytics: () => this.loadAnalytics(),
      profile: () => this.loadProfile(),
      'ws-general': () => this.loadWsGeneral(),
      'ws-overview': () => this.loadWsOverview(),
      'ws-team': () => this.loadWsTeam(),
      'ws-billing': () => this.loadWsBilling(),
      'int-ai': () => this.loadIntAi(),
      'int-webhooks': () => this.loadIntWebhooks(),
      'int-oncall': () => this.loadIntOnCall(),
      'sec-apikeys': () => this.loadSecApiKeys(),
      'sec-audit': () => this.loadSecAudit(),
      'sec-sso': () => this.loadSecSso(),
    };
    if (loaders[page]) loaders[page]();
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
      const stats = [
        { label:'Total incidents', value:counts.total, color:'#d4622b', bg:'rgba(212,98,43,0.10)' },
        { label:'Open', value:counts.open, color:'#e8944a', bg:'rgba(232,148,74,0.10)' },
        { label:'P1 critical', value:counts.p1, color:'#c2571f', bg:'rgba(194,87,31,0.10)' },
        { label:'Resolved (7d)', value:counts.resolved7d, color:'#f0b27a', bg:'rgba(240,178,122,0.12)' },
      ];
      $('#incident-stat-grid').innerHTML = stats.map(s=>`<div class="stat-card"><div class="stat-icon" style="background:${s.bg};color:${s.color}">●</div><div class="stat-value" style="font-size:28px">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('');
    }
    if (list?.items?.length) {
      $('#incidents-list').innerHTML = list.items.map(inc=>`<div class="incident-row" onclick="app.openIncident('${inc.id}')" style="cursor:pointer">
        <div class="incident-title">${this.esc(inc.title)}</div>
        <span class="badge badge-${(inc.severity||'P3').toLowerCase()}">${inc.severity||'P3'}</span>
        <span class="badge badge-${(inc.status||'OPEN').toLowerCase()}">${inc.status||'OPEN'}</span>
        <span class="incident-meta">${inc.owner?.name||'Unassigned'}</span>
        <span class="incident-time">${this.timeAgo(inc.createdAt)}</span>
      </div>`).join('');
    } else {
      $('#incidents-list').innerHTML = '<p class="muted">No incidents found.</p>';
    }
  },

  async openIncident(id) {
    if (!window.trustloop) return;
    const data = await window.trustloop.incidentDetail(id);
    if (!data) return;
    this._currentIncidentId = id;
    const inc = data.incident;
    const owners = data.owners || [];
    const isP1 = inc.severity === 'P1';
    const meta = [
      { label:'Owner', value: inc.owner?.name || 'Unassigned' },
      { label:'Customer', value: inc.customerName || inc.customerEmail || 'Unknown' },
      { label:'Ticket ref', value: inc.sourceTicketRef || '—' },
      { label:'Model version', value: inc.modelVersion || '—' },
    ];
    const timeline = inc.events?.length ? inc.events.map(e => `<div class="timeline-event">
      <div class="timeline-dot" style="background:${e.eventType==='NOTE'?'var(--info)':e.eventType.includes('STATUS')?'var(--signal)':'var(--ghost)'}"></div>
      <div class="timeline-body"><div class="timeline-head"><span>${this.esc(e.eventType)}${e.actor?.name ? ' · '+this.esc(e.actor.name) : ''}</span><span>${new Date(e.createdAt).toLocaleString()}</span></div><p>${this.esc(e.body)}</p></div>
    </div>`).join('') : '<p class="muted">No timeline events yet.</p>';
    const ownerOpts = owners.map(o => `<option value="${o.id}"${o.id===inc.ownerUserId?' selected':''}>${this.esc(o.name)} (${o.role})</option>`).join('');
    const postMortem = inc.postMortem ? `<div class="settings-card"><h3>Post-Mortem</h3><span class="badge badge-sm">${inc.postMortem.status}</span>${inc.postMortem.author ? ` <span style="color:var(--ghost);font-size:12px">by ${this.esc(inc.postMortem.author.name)}</span>` : ''}<h4 style="margin:8px 0 4px;font-size:14px">${this.esc(inc.postMortem.title)}</h4><p style="color:var(--subtext);font-size:13px;white-space:pre-wrap">${this.esc(inc.postMortem.body)}</p></div>` : '<div class="settings-card"><h3>Post-Mortem</h3><p class="muted">No post-mortem yet.</p></div>';

    $$('.view').forEach(v => v.classList.remove('active'));
    let detail = $('#view-incident-detail');
    if (!detail) { detail = document.createElement('div'); detail.id = 'view-incident-detail'; detail.className = 'view'; $('.main-content').appendChild(detail); }
    detail.classList.add('active');
    detail.innerHTML = `
      <div class="page-head"><button class="btn btn-ghost btn-sm" onclick="app.navTo('incidents')">← Back</button></div>
      <div class="dash-hero${isP1?' dash-hero-p1':''}">
        <span class="badge badge-${inc.severity.toLowerCase()}">${inc.severity}</span>
        <span class="badge">${inc.status}</span>
        ${inc.category ? `<span class="badge">${this.esc(inc.category)}</span>` : ''}
        <h1 class="page-title" style="font-size:24px;margin-top:8px">${this.esc(inc.title)}</h1>
        <p style="color:var(--subtext);margin-top:4px">${this.esc(inc.description||'')}</p>
      </div>
      <div class="stat-grid stat-grid-4">${meta.map(m => `<div class="stat-card"><div class="stat-label">${m.label}</div><div class="stat-value" style="font-size:14px;font-weight:600">${this.esc(m.value)}</div></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;margin-top:16px">
        <div class="settings-card"><h3>Timeline</h3><p class="muted" style="margin-bottom:8px">${inc.events?.length||0} events</p>${timeline}
          <div style="margin-top:12px;display:flex;gap:8px"><input class="input" id="note-input" placeholder="Add a note…" style="flex:1" /><button class="btn btn-primary" onclick="app.addNote()">Add</button></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="settings-card"><h3>Actions</h3>
            <div class="form-group"><label class="form-label">Status</label><select class="input" id="inc-status">${['NEW','INVESTIGATING','MONITORING','RESOLVED'].map(s=>`<option${s===inc.status?' selected':''}>${s}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Severity</label><select class="input" id="inc-severity">${['P1','P2','P3','P4'].map(s=>`<option${s===inc.severity?' selected':''}>${s}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Owner</label><select class="input" id="inc-owner">${ownerOpts}</select></div>
            <button class="btn btn-primary" style="margin-top:8px" onclick="app.updateCurrentIncident()">Update</button>
            <span id="inc-msg" class="form-msg"></span>
          </div>
          ${postMortem}
        </div>
      </div>`;
  },

  async updateCurrentIncident() {
    if (!this._currentIncidentId) return;
    const data = {};
    const status = $('#inc-status')?.value; if (status) data.status = status;
    const severity = $('#inc-severity')?.value; if (severity) data.severity = severity;
    const owner = $('#inc-owner')?.value; if (owner) data.ownerUserId = owner;
    await window.trustloop.updateIncident(this._currentIncidentId, data);
    const el = $('#inc-msg'); if (el) { el.textContent = '✓ Updated'; setTimeout(() => el.textContent = '', 2000); }
  },

  async addNote() {
    if (!this._currentIncidentId) return;
    const input = $('#note-input'); if (!input?.value?.trim()) return;
    await window.trustloop.addIncidentEvent(this._currentIncidentId, input.value.trim());
    input.value = '';
    this.openIncident(this._currentIncidentId);
  },

  showCreateIncident() {
    const form = $('#create-incident-form');
    if (form) { form.classList.toggle('hidden'); return; }
    const el = document.createElement('div');
    el.id = 'create-incident-form';
    el.className = 'settings-card';
    el.style.marginBottom = '16px';
    el.innerHTML = `<h3>Log a new AI failure</h3><p class="muted" style="margin-bottom:12px">Capture customer impact, route ownership, and open the incident record immediately.</p>
      <div class="form-group"><label class="form-label">Title</label><input class="input" id="new-inc-title" required /></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="input" id="new-inc-desc" rows="3"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label class="form-label">Severity</label><select class="input" id="new-inc-sev"><option>P1</option><option>P2</option><option selected>P3</option><option>P4</option></select></div>
        <div class="form-group"><label class="form-label">Customer name</label><input class="input" id="new-inc-cust" /></div>
      </div>
      <div class="form-group"><label class="form-label">Customer email</label><input class="input" id="new-inc-email" type="email" /></div>
      <button class="btn btn-primary" onclick="app.createIncident()">Create incident</button>
      <button class="btn btn-ghost" onclick="$('#create-incident-form').classList.add('hidden')">Cancel</button>`;
    $('#incidents-list').parentNode.insertBefore(el, $('#incident-stat-grid').nextSibling);
  },

  async createIncident() {
    const title = $('#new-inc-title')?.value?.trim();
    if (!title) return;
    await window.trustloop.createIncident({
      title,
      description: $('#new-inc-desc')?.value?.trim() || '',
      severity: $('#new-inc-sev')?.value || 'P3',
      customerName: $('#new-inc-cust')?.value?.trim() || null,
      customerEmail: $('#new-inc-email')?.value?.trim() || null,
    });
    $('#create-incident-form')?.classList.add('hidden');
    this.loadIncidents();
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

  fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '—'; },

  row(label, value) { return `<div class="settings-row"><span class="settings-label">${label}</span><span class="settings-value">${this.esc(String(value ?? '—'))}</span></div>`; },

  async loadProfile() {
    if (!window.trustloop) return;
    const p = await window.trustloop.getProfile();
    if (!p) return;
    $('#profile-content').innerHTML = `
      <p class="page-kicker">Account</p>
      <div class="settings-card"><h3>Responder profile</h3>
        <p class="muted" style="margin-bottom:12px">Keep your name and phone number current for urgent incident communications.</p>
        <div class="form-group"><label class="form-label">Name</label><input class="input" id="profile-name" value="${this.esc(p.name||'')}" /></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="input" id="profile-phone" value="${this.esc(p.phone||'')}" placeholder="+1 555 000 0000" /></div>
        ${this.row('Email', p.email)}${this.row('Role', p.role)}${this.row('Joined', this.fmtDate(p.createdAt))}
        <button class="btn btn-primary" style="margin-top:12px" onclick="app.saveProfile()">Save changes</button>
        <span id="profile-msg" class="form-msg"></span>
      </div>`;
  },
  async saveProfile() {
    const name = $('#profile-name')?.value?.trim();
    const phone = $('#profile-phone')?.value?.trim();
    if (!name) return;
    await window.trustloop.updateProfile({ name, phone: phone || null });
    const el = $('#profile-msg'); if (el) { el.textContent = '✓ Saved'; setTimeout(() => el.textContent = '', 2000); }
  },

  async loadWsGeneral() {
    if (!window.trustloop) return;
    const ws = await window.trustloop.workspaceGeneral();
    if (!ws) return;
    const slack = ws.slackTeamId ? `Connected (${ws.slackChannelId||'—'})` : 'Not connected';
    $('#ws-general-content').innerHTML = `<p class="page-kicker">Workspace</p>
      <div class="settings-card"><h3>General</h3>
        <div class="form-group"><label class="form-label">Workspace name</label><input class="input" id="ws-name-input" value="${this.esc(ws.name||'')}" /></div>
        ${this.row('Slug', ws.slug)}${this.row('Plan', (ws.planTier||'starter').toUpperCase())}
        ${this.row('Status page', ws.statusPageEnabled ? 'Enabled' : 'Disabled')}
        ${this.row('Slack', slack)}
        ${this.row('Compliance mode', ws.complianceMode ? 'Enabled' : 'Disabled')}
        ${ws.customDomain ? this.row('Custom domain', ws.customDomain + (ws.customDomainVerified ? ' ✓' : ' (unverified)')) : ''}
        ${this.row('Created', this.fmtDate(ws.createdAt))}
        <button class="btn btn-primary" style="margin-top:12px" onclick="app.saveWsGeneral()">Save</button>
        <span id="ws-general-msg" class="form-msg"></span>
      </div>`;
  },
  async saveWsGeneral() {
    const name = $('#ws-name-input')?.value?.trim();
    if (!name) return;
    await window.trustloop.workspaceUpdate({ name });
    const el = $('#ws-general-msg'); if (el) { el.textContent = '✓ Saved'; setTimeout(() => el.textContent = '', 2000); }
  },

  async loadWsOverview() {
    if (!window.trustloop) return;
    const d = await window.trustloop.workspaceOverview();
    if (!d) return;
    const stats = [
      { label:'AI keys', value:d.keyCount, sub:'Active provider connections' },
      { label:'Routes', value:d.workflowCount, sub:'Configured workflow mappings' },
      { label:'Members', value:d.memberCount, sub:'Current team members' },
      { label:'Invites', value:d.inviteCount, sub:'Pending workspace invites' },
      { label:'Integrations', value:d.webhookCount, sub:'Active webhook connections' },
      { label:'Plan', value:(d.planTier||'starter').toUpperCase(), sub:d.billingStatus||'No billing status yet' },
    ];
    $('#ws-overview-content').innerHTML = `<p class="page-kicker">Settings</p>
      <div class="settings-card"><h3>Workspace snapshot</h3><p class="muted" style="margin-bottom:12px">Current counts for keys, routing, access, and live integrations.</p>
      <div class="stat-grid stat-grid-3">${stats.map(s => `<div class="stat-card"><div class="stat-value" style="font-size:28px">${s.value}</div><div class="stat-label">${s.label}</div><div class="stat-sub">${s.sub}</div></div>`).join('')}</div></div>`;
  },

  async loadWsTeam() {
    if (!window.trustloop) return;
    const data = await window.trustloop.workspaceTeam();
    if (!data) return;
    const members = data.members.map(m => `<div class="settings-row">
      <span class="settings-label"><strong>${this.esc(m.name||'Unnamed')}</strong> <span style="color:var(--ghost)">${this.esc(m.email)}</span>${m.phone ? ` · ${this.esc(m.phone)}` : ''}</span>
      <span class="settings-value"><span class="badge badge-sm">${m.role}</span></span>
    </div>`).join('');
    const invites = data.invites.length ? data.invites.map(i => `<div class="settings-row">
      <span class="settings-label">${this.esc(i.email)}</span>
      <span class="settings-value"><span class="badge badge-sm">${i.role}</span> · Expires ${this.fmtDate(i.expiresAt)}</span>
    </div>`).join('') : '<p class="muted">No pending invites.</p>';
    $('#ws-team-content').innerHTML = `<p class="page-kicker">Workspace</p>
      <div class="settings-card"><h3>Team management</h3><p class="muted" style="margin-bottom:12px">Invite teammates, assign roles, and remove members.</p>${members}</div>
      <div class="settings-card"><h3>Pending Invites</h3>${invites}</div>`;
  },

  async loadWsBilling() {
    if (!window.trustloop) return;
    const ws = await window.trustloop.workspaceBilling();
    if (!ws) return;
    const b = ws.billing;
    const plan = (ws.planTier||'starter').toUpperCase();
    const status = b?.status || 'No subscription';
    const trial = ws.trialEndsAt ? `Ends ${this.fmtDate(ws.trialEndsAt)}` : '—';
    const usage = ws.usage || {};
    const quota = ws.quota || {};
    const usageBar = (label, used, max) => {
      const pct = max > 0 ? Math.min(100, (used/max)*100) : 0;
      return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--subtext);margin-bottom:4px"><span>${label}</span><span>${used||0} / ${max||'∞'}</span></div><div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;background:var(--signal)"></div></div></div>`;
    };
    $('#ws-billing-content').innerHTML = `<p class="page-kicker">Workspace</p>
      <div class="settings-card"><h3>Billing</h3>
        ${this.row('Plan', plan)}${this.row('Status', status)}${this.row('Trial', trial)}
        ${b ? this.row('Period', this.fmtDate(b.currentPeriodStart) + ' → ' + this.fmtDate(b.currentPeriodEnd)) : ''}
        ${b?.lastPaymentAmount ? this.row('Last payment', `${(b.lastPaymentAmount/100).toFixed(2)} ${b.lastPaymentCurrency||'USD'}`) : ''}
        ${b?.canceledAt ? this.row('Canceled', this.fmtDate(b.canceledAt) + (b.cancelReason ? ` (${b.cancelReason})` : '')) : ''}
      </div>
      <div class="settings-card"><h3>Today's usage</h3>
        ${usageBar('Incidents created', usage.incidentsCreated, quota.incidentsPerDay)}
        ${usageBar('Triage runs', usage.triageRuns, quota.triageRunsPerDay)}
        ${usageBar('Customer updates', usage.customerUpdates, quota.customerUpdatesPerDay)}
        ${usageBar('Reminder emails', usage.reminderEmailsSent, quota.reminderEmailsPerDay)}
      </div>`;
  },

  async loadIntAi() {
    if (!window.trustloop) return;
    const data = await window.trustloop.integrationsAi();
    if (!data) return;
    const hc = { HEALTHY:'#22c55e', UNHEALTHY:'#ef4444', UNKNOWN:'var(--ghost)' };
    const keys = data.keys.length ? data.keys.map(k => `<div class="settings-row">
      <span class="settings-label"><strong>${k.provider}</strong> <span style="color:var(--ghost)">···${k.keyLast4||'????'}</span></span>
      <span class="settings-value"><span style="color:${hc[k.healthStatus]||'var(--ghost)'}">● ${k.healthStatus||'UNKNOWN'}</span>${k.lastVerifiedAt ? ' · Verified ' + this.fmtDate(k.lastVerifiedAt) : ''}</span>
    </div>`).join('') : '<p class="muted">No AI keys configured. Bring your own keys for OpenAI, Gemini, and Anthropic.</p>';
    const wf = data.workflows.length ? data.workflows.map(w => `<div class="settings-row"><span class="settings-label">${w.workflowType}</span><span class="settings-value">${w.provider} / ${w.model}</span></div>`).join('') : '<p class="muted">No workflow mappings configured.</p>';
    $('#int-ai-content').innerHTML = `<p class="page-kicker">Integrations</p>
      <div class="settings-card"><h3>AI provider keys</h3><p class="muted" style="margin-bottom:12px">Bring your own keys for OpenAI, Gemini, and Anthropic with explicit workflow mapping.</p>${keys}</div>
      <div class="settings-card"><h3>Workflow settings</h3>${wf}</div>`;
  },

  async loadIntWebhooks() {
    if (!window.trustloop) return;
    const hooks = await window.trustloop.integrationsWebhooks();
    if (!hooks?.length) { $('#int-webhooks-content').innerHTML = `<p class="page-kicker">Integrations</p><div class="settings-card"><h3>Webhook integrations</h3><p class="muted">Configure signed inbound secrets for Datadog, PagerDuty, Sentry, and AI observability sources.</p></div>`; return; }
    const rows = hooks.map(h => `<div class="settings-row">
      <span class="settings-label"><strong>${this.esc(h.provider)}</strong></span>
      <span class="settings-value">${h.active ? '<span style="color:#22c55e">● Active</span>' : '<span style="color:var(--ghost)">○ Inactive</span>'} · ${this.fmtDate(h.createdAt)}</span>
    </div>`).join('');
    $('#int-webhooks-content').innerHTML = `<p class="page-kicker">Integrations</p>
      <div class="settings-card"><h3>Webhook integrations</h3><p class="muted" style="margin-bottom:12px">Configure signed inbound secrets for Datadog, PagerDuty, Sentry, and AI observability sources.</p>${rows}</div>`;
  },

  async loadIntOnCall() {
    if (!window.trustloop) return;
    const data = await window.trustloop.integrationsOnCall();
    if (!data) { $('#int-oncall-content').innerHTML = '<div class="settings-card"><p class="muted">Unable to load on-call data.</p></div>'; return; }
    const members = data.members?.length ? data.members.map(m => `<div class="settings-row">
      <span class="settings-label">${this.esc(m.name||m.email)} ${m.phone ? `<span style="color:var(--ghost)">${this.esc(m.phone)}</span>` : '<span style="color:var(--warning)">No phone</span>'}</span>
      <span class="settings-value"><span class="badge badge-sm">${m.role}</span></span>
    </div>`).join('') : '<p class="muted">No team members.</p>';
    $('#int-oncall-content').innerHTML = `<p class="page-kicker">Integrations</p>
      <div class="settings-card"><h3>On-call rotation</h3>
        <p class="muted" style="margin-bottom:12px">Review the current escalation schedule for P1 incidents and verify who will be paged next.</p>
        ${this.row('On-call enabled', data.onCallEnabled ? 'Yes' : 'No')}
      </div>
      <div class="settings-card"><h3>Escalation roster</h3>${members}</div>`;
  },

  async loadSecApiKeys() {
    if (!window.trustloop) return;
    const keys = await window.trustloop.securityApiKeys();
    if (!keys?.length) { $('#sec-apikeys-content').innerHTML = `<p class="page-kicker">Security</p><div class="settings-card"><h3>Workspace API keys</h3><p class="muted">No API keys. Issue scoped bearer keys for automation and revoke them when no longer needed.</p></div>`; return; }
    const rows = keys.map(k => `<div class="settings-row">
      <span class="settings-label"><strong>${this.esc(k.name||'Unnamed')}</strong> <span style="color:var(--ghost);font-family:monospace;font-size:12px">${this.esc(k.keyPrefix||'')}…</span></span>
      <span class="settings-value">${k.isActive ? '<span style="color:#22c55e">● Active</span>' : '<span style="color:var(--ghost)">○ Inactive</span>'}${k.lastUsedAt ? ' · Used ' + this.timeAgo(k.lastUsedAt) : ' · Never used'}${k.expiresAt ? ' · Exp ' + this.fmtDate(k.expiresAt) : ''}</span>
    </div>`).join('');
    $('#sec-apikeys-content').innerHTML = `<p class="page-kicker">Security</p>
      <div class="settings-card"><h3>Workspace API keys</h3><p class="muted" style="margin-bottom:12px">Issue scoped bearer keys for automation and revoke them cleanly when no longer needed.</p>${rows}</div>`;
  },

  async loadSecAudit() {
    if (!window.trustloop) return;
    const data = await window.trustloop.securityAudit();
    if (!data?.items?.length) { $('#sec-audit-content').innerHTML = `<p class="page-kicker">Security</p><div class="settings-card"><p class="muted">No audit activity yet. Privileged workspace actions will appear here as your team configures TrustLoop.</p></div>`; return; }
    const rows = data.items.map((e,i) => `<tr${i%2===1?' style="background:rgba(10,11,13,0.5)"':''}>
      <td style="white-space:nowrap;color:var(--subtext);font-size:12px">${new Date(e.createdAt).toLocaleString()}</td>
      <td>${this.esc(e.actorUser?.name || e.actorApiKey?.name || 'System')}</td>
      <td><span class="badge badge-sm">${this.esc(e.action)}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:var(--subtext)">${this.esc(e.summary||'')}</td>
      <td style="font-family:monospace;font-size:11px;color:var(--subtext)">${e.ipAddress||'—'}</td>
    </tr>`).join('');
    $('#sec-audit-content').innerHTML = `<p class="page-kicker">Security</p>
      <div class="table-shell" style="overflow-x:auto"><table class="data-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Summary</th><th>IP</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  },

  async loadSecSso() {
    if (!window.trustloop) return;
    const data = await window.trustloop.securitySso();
    if (!data) { $('#sec-sso-content').innerHTML = `<p class="page-kicker">Security</p><div class="settings-card"><h3>Enterprise single sign-on</h3><p class="muted">Connect your identity provider to enforce SAML-based authentication for all workspace members.</p>${this.row('SAML SSO', 'Not configured')}</div>`; return; }
    $('#sec-sso-content').innerHTML = `<p class="page-kicker">Security</p>
      <div class="settings-card"><h3>Enterprise single sign-on</h3>
        <p class="muted" style="margin-bottom:12px">Connect your identity provider to enforce SAML-based authentication for all workspace members.</p>
        ${this.row('Status', data.samlEnabled ? 'Enabled' : 'Disabled')}
        ${this.row('Metadata URL', data.samlMetadataUrl || '—')}
        ${this.row('Organization ID', data.samlOrganizationId || '—')}
        ${this.row('Connection ID', data.samlConnectionId || '—')}
      </div>`;
  },

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
