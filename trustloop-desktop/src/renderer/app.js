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

    }
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
    // Fetch plan tier for feature gating
    const ws = await window.trustloop.workspaceGeneral?.();
    this._planTier = (ws?.planTier || 'starter').toLowerCase();
    const planEl = el('#sidebar-plan');
    if (planEl) planEl.textContent = this._planTier.toUpperCase();
    this.loadDashboard();
  },

  _featureAllowed(feature) {
    const t = this._planTier || 'starter';
    const gates = { saml:['enterprise'], compliance:['pro','enterprise'], on_call:['pro','enterprise'], api_keys:['pro','enterprise'], webhooks:['starter','pro','enterprise'], ai_keys:['starter','pro','enterprise'] };
    return (gates[feature]||[]).includes(t);
  },

  _planBadge(feature, label) {
    if (this._featureAllowed(feature)) return '';
    return ` <span style="display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:1px 6px;border-radius:999px;border:1px solid rgba(217,119,6,0.24);background:rgba(217,119,6,0.08);font-size:10px;font-weight:600;color:var(--warning);vertical-align:middle">🔒 ${label} · <a style="text-decoration:underline;cursor:pointer" onclick="app.navTo('ws-billing')">Upgrade</a></span>`;
  },

  _gateWrap(feature, label, html) {
    if (this._featureAllowed(feature)) return html;
    return `<div style="pointer-events:none;user-select:none;opacity:0.4;filter:blur(0.5px)">${html}</div>`;
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
    const { counts, snapshot } = data;
    const stats = [
      { label:'Open incidents', value:counts.open, icon:'⚠', color:'#d4622b', bg:'rgba(212,98,43,0.10)', sub:`${counts.p1} P1 critical`, trend:counts.created7d>counts.resolved?'up':'down', trendText:counts.created7d>0?`+${counts.created7d} this week`:'No new this week' },
      { label:'Resolved (7d)', value:counts.resolved, icon:'✓', color:'#e8944a', bg:'rgba(232,148,74,0.10)', sub:`${counts.total} total all-time`, trend:'up', trendText:counts.resolved>0?`${counts.resolved} closed`:'None yet' },
      { label:'Avg resolution', value:`${counts.avgResolutionHours.toFixed(1)}h`, icon:'⏱', color:'#c2571f', bg:'rgba(194,87,31,0.10)', sub:'Last 30 days', trend:counts.avgResolutionHours<24?'down':'up', trendText:counts.avgResolutionHours<24?'Under target':'Above target' },
    ];
    $('#stat-grid').innerHTML = stats.map(s => `<div class="stat-card"><div class="stat-top"><div class="stat-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div><span class="stat-trend stat-trend-${s.trend==='down'?'good':'warn'}">${s.trend==='up'?'↑':'↓'} ${s.trendText}</span></div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div><div class="stat-sub">${s.sub}</div></div>`).join('');
    this.renderVelocityChart(counts);
    const triage = snapshot?.triageCoveragePct ?? 0;
    const update = snapshot?.customerUpdateCoveragePct ?? 0;
    this.renderCoverageDonut(triage, update);
    this.renderOnboarding(data.onboarding);
  },

  renderOnboarding(ob) {
    let el = $('#onboarding-checklist');
    if (!ob || ob.dismissed) { if (el) el.remove(); return; }
    const steps = [
      { id:'hasIncident', label:'Create your first incident', desc:'Log an incident manually or route one in from a webhook.', page:'incidents', icon:'🚨' },
      { id:'hasTriaged', label:'Run AI triage', desc:'Let the system propose severity, owner, and safe next steps.', page:'incidents', icon:'🤖' },
      { id:'hasAiKey', label:'Add an AI provider key', desc:'Connect OpenAI, Gemini, or Anthropic before the next incident lands.', page:'int-ai', icon:'🤖' },
      { id:'hasSlack', label:'Connect Slack', desc:'Keep responders aligned with alerting and approved status updates.', page:'int-webhooks', icon:'💬' },
      { id:'hasWebhook', label:'Set up a webhook integration', desc:'Accept incidents from Datadog, Sentry, PagerDuty, or custom sources.', page:'int-webhooks', icon:'🔌' },
    ];
    const done = steps.filter(s => ob[s.id]).length;
    if (done === steps.length) { if (el) el.remove(); return; }
    const pct = (done / steps.length) * 100;
    const items = steps.map(s => {
      const isDone = ob[s.id];
      return `<li class="onboard-step${isDone?' onboard-done':''}" onclick="app.navTo('${s.page}')">
        <span class="onboard-icon">${isDone ? '✓' : s.icon}</span>
        <div><p class="onboard-label${isDone?' onboard-struck':''}">${s.label}</p><p class="onboard-desc">${s.desc}</p></div>
      </li>`;
    }).join('');
    const html = `<div class="onboard-head">
      <div><h2 class="section-title">Operational readiness checklist</h2><p class="section-desc">Complete the essentials before your first customer-facing AI incident hits the queue.</p>
        <div class="onboard-bar"><div class="onboard-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="onboard-actions"><span class="badge badge-info">${done}/${steps.length} complete</span><button class="btn btn-ghost btn-sm" onclick="app.dismissOnboarding()">✕ Dismiss</button></div>
    </div><ul class="onboard-grid">${items}</ul>`;
    if (!el) {
      el = document.createElement('div'); el.id = 'onboarding-checklist'; el.className = 'onboard-shell';
      const view = $('#view-dashboard');
      view.insertBefore(el, view.children[1]);
    }
    el.innerHTML = html;
  },

  async dismissOnboarding() {
    if (window.trustloop) await window.trustloop.dismissOnboarding();
    const el = $('#onboarding-checklist');
    if (el) el.remove();
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

  _incidentPage: 1,

  async loadIncidents(page) {
    if (!window.trustloop) return;
    this._incidentPage = page || 1;
    const filters = {
      status: $('#filter-status')?.value || undefined,
      severity: $('#filter-severity')?.value || undefined,
      category: $('#filter-category')?.value || undefined,
      owner: $('#filter-owner')?.value || undefined,
      q: $('#filter-search')?.value?.trim() || undefined,
      page: this._incidentPage,
    };
    const [counts, list] = await Promise.all([window.trustloop.incidentsCounts(), window.trustloop.listIncidents(filters)]);
    // Populate owner dropdown from members
    if (list?.members) {
      const sel = $('#filter-owner');
      const cur = sel?.value || '';
      if (sel) sel.innerHTML = '<option value="">All</option>' + list.members.map(m => `<option value="${m.id}"${m.id===cur?' selected':''}>${this.esc(m.name)}</option>`).join('');
    }
    if (counts) {
      const stats = [
        { label:'Total incidents', value:counts.total, icon:'☰', color:'#d4622b', bg:'rgba(212,98,43,0.10)' },
        { label:'Open', value:counts.open, icon:'⚠', color:'#e8944a', bg:'rgba(232,148,74,0.10)' },
        { label:'P1 critical', value:counts.p1, icon:'⚡', color:'#c2571f', bg:'rgba(194,87,31,0.10)' },
        { label:'Resolved (7d)', value:counts.resolved7d, icon:'✓', color:'#f0b27a', bg:'rgba(240,178,122,0.12)' },
      ];
      $('#incident-stat-grid').innerHTML = stats.map(s=>`<div class="stat-card"><div class="stat-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div><div class="stat-value" style="font-size:28px">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('');
    }
    this.renderIncidentQueue(list);
    // Pagination
    const pg = $('#incidents-pagination');
    if (pg && list) {
      pg.innerHTML = `<button class="btn btn-ghost btn-sm" ${this._incidentPage<=1?'disabled':''}onclick="app.loadIncidents(${this._incidentPage-1})">← Previous</button><span class="muted" style="font-size:12px">Page ${list.page} of ${list.pages||1}</span><button class="btn btn-ghost btn-sm" ${this._incidentPage>=list.pages?'disabled':''}onclick="app.loadIncidents(${this._incidentPage+1})">Next →</button>`;
    }
  },

  renderIncidentQueue(list) {
    const q = $('#incidents-queue');
    if (!q) return;
    if (!list?.items?.length) {
      const hasFilters = ['filter-status','filter-severity','filter-category','filter-owner','filter-search'].some(id => document.getElementById(id)?.value);
      q.innerHTML = `<div class="settings-card" style="text-align:center;padding:32px"><p style="font-size:16px;font-weight:600;color:var(--title)">All clear</p><p class="muted">No open incidents.</p>${hasFilters?'<button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="app.resetIncidentFilters()">Clear filters</button>':''}</div>`;
      return;
    }
    const sevClass = s => s==='P1'?'badge-p1':s==='P2'?'badge-p2':'badge-p3';
    const statusClass = s => s==='RESOLVED'?'badge-success':s==='MITIGATED'?'badge-warning':s==='NEW'?'badge-info':'badge-danger';
    const rows = list.items.map(inc => `<tr onclick="app.openIncident('${inc.id}')" style="cursor:pointer">
      <td><span class="badge badge-sm ${sevClass(inc.severity)}">${inc.severity}</span></td>
      <td><span class="badge badge-sm ${statusClass(inc.status)}">${inc.status}</span></td>
      <td class="inc-title-cell">${this.esc(inc.title)}</td>
      <td style="color:var(--ghost)">${inc.category||'Uncategorized'}</td>
      <td>${inc.owner?.name||'Unassigned'}</td>
      <td style="color:var(--subtext)">${new Date(inc.updatedAt||inc.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td>
      <td style="color:var(--subtext)">→</td>
    </tr>`).join('');
    q.innerHTML = `<div class="table-shell"><table class="data-table"><thead><tr><th>Severity</th><th>Status</th><th>Title</th><th>AI category</th><th>Owner</th><th>Updated</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  },

  applyIncidentFilters() {
    this.loadIncidents(1);
  },

  resetIncidentFilters() {
    ['filter-status','filter-severity','filter-category','filter-owner','filter-search'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    this.loadIncidents(1);
  },

  async openIncident(id) {
    if (!window.trustloop) return;
    const data = await window.trustloop.incidentDetail(id);
    if (!data) return;
    this._currentIncidentId = id;
    const inc = data.incident;
    const owners = data.owners || [];
    const isP1 = inc.severity === 'P1';

    // Breadcrumb
    const ref = inc.sourceTicketRef || inc.id.slice(0,8);
    const breadcrumb = `<nav class="breadcrumb"><a onclick="app.navTo('dashboard')">Dashboard</a> › <a onclick="app.navTo('incidents')">Incidents</a> › <span>${this.esc(ref)}</span></nav>`;

    // Severity badge class
    const sevCls = inc.severity==='P1'?'badge-p1':inc.severity==='P2'?'badge-p2':'badge-p3';

    // Metadata cards
    const meta = [
      { label:'Owner', value: inc.owner?.name || 'Unassigned' },
      { label:'Customer', value: inc.customerName || inc.customerEmail || 'Unknown' },
      { label:'Ticket ref', value: inc.sourceTicketRef || '—' },
      { label:'Model version', value: inc.modelVersion || '—' },
    ];

    // Timeline with connector line
    const evtColor = t => t==='NOTE'?'var(--info)':t.includes('STATUS')?'var(--signal)':'var(--ghost)';
    const timeline = inc.events?.length ? inc.events.map(e => `<article class="timeline-event">
      <div class="timeline-dot" style="background:${evtColor(e.eventType)}"></div>
      <div class="timeline-body"><div class="timeline-head"><span>${this.esc(e.eventType)}${e.actor?.name ? ' · '+this.esc(e.actor.name) : ''}</span><span>${new Date(e.createdAt).toLocaleString()}</span></div><p>${this.esc(e.body)}</p></div>
    </article>`).join('') : '<p class="muted">No timeline events yet.</p>';

    // Owner select options
    const ownerOpts = `<option value="">Unassigned</option>` + owners.map(o => `<option value="${o.id}"${o.id===inc.ownerUserId?' selected':''}>${this.esc(o.name)} (${o.role})</option>`).join('');

    // Category options
    const cats = ['','HALLUCINATION','BIAS','TOXICITY','PII_LEAK','REFUSAL','DRIFT','LATENCY','OTHER'];
    const catOpts = cats.map(c => `<option value="${c}"${c===(inc.category||'')?' selected':''}>${c||'Uncategorized'}</option>`).join('');

    // Status options (all from web app)
    const statuses = ['NEW','INVESTIGATING','MONITORING','MITIGATED','RESOLVED'];
    const statusOpts = statuses.map(s => `<option${s===inc.status?' selected':''}>${s}</option>`).join('');

    // Severity options
    const sevOpts = ['P1','P2','P3','P4'].map(s => `<option${s===inc.severity?' selected':''}>${s}</option>`).join('');

    // Post-mortem
    const pm = inc.postMortem;
    const postMortem = pm
      ? `<div><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="badge badge-sm${pm.status==='PUBLISHED'?' badge-p3':''}">${pm.status}</span>${pm.author?`<span style="color:var(--ghost);font-size:12px">by ${this.esc(pm.author.name)}</span>`:''}</div><h4 style="font-size:14px;font-weight:600;color:var(--body);margin-bottom:4px">${this.esc(pm.title)}</h4><div style="color:var(--subtext);font-size:13px;white-space:pre-wrap;max-height:320px;overflow-y:auto">${this.esc(pm.body)}</div></div>`
      : `<div style="text-align:center;padding:16px"><p class="muted">No post-mortem yet.</p><p style="font-size:12px;color:var(--subtext);margin-top:8px">Use "Generate Post-Mortem" action above to create one with AI.</p></div>`;

    $$('.view').forEach(v => v.classList.remove('active'));
    let detail = $('#view-incident-detail');
    if (!detail) { detail = document.createElement('div'); detail.id = 'view-incident-detail'; detail.className = 'view'; $('.main-content').appendChild(detail); }
    detail.classList.add('active');
    detail.innerHTML = `
      ${breadcrumb}
      <section class="dash-hero${isP1?' dash-hero-p1':''}">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px">
          <span class="badge ${sevCls}">${isP1?'⚠ ':''}${inc.severity}</span>
          <span class="badge">${inc.status==='NEW'?'⏱ ':''}${inc.status}</span>
          ${inc.category ? `<span class="badge">${this.esc(inc.category)}</span>` : ''}
        </div>
        <h1 class="page-title" style="font-size:28px">${this.esc(inc.title)}</h1>
        <p style="color:var(--subtext);margin-top:4px">${this.esc(inc.description||'')}</p>
      </section>

      <div class="stat-grid stat-grid-4">${meta.map(m => `<div class="stat-card"><div class="stat-label">${m.label}</div><div class="stat-value" style="font-size:16px;font-weight:600">${this.esc(m.value)}</div></div>`).join('')}</div>

      <div class="detail-grid">
        <div class="settings-card">
          <h3>Timeline</h3><p class="muted" style="margin-bottom:8px">${inc.events?.length||0} event${(inc.events?.length||0)!==1?'s':''}</p>
          <div class="timeline-track">${inc.events?.length>1?'<div class="timeline-line"></div>':''}${timeline}</div>
          <div class="note-box">
            <p class="kicker">Internal notes</p>
            <textarea class="input" id="note-input" rows="3" placeholder="Add internal note"></textarea>
            <button class="btn btn-ghost btn-sm" onclick="app.addNote()">Add note</button>
          </div>
        </div>

        <div class="detail-sidebar">
          <div class="settings-card">
            <h3>Actions</h3><p class="muted" style="margin-bottom:8px">Update status, assign, or run AI</p>
            <div class="action-grid">
              <label class="field"><span class="field-label">Status</span><select class="input" id="inc-status">${statusOpts}</select></label>
              <label class="field"><span class="field-label">Severity</span><select class="input" id="inc-severity">${sevOpts}</select></label>
              <label class="field"><span class="field-label">Category</span><select class="input" id="inc-category">${catOpts}</select></label>
              <label class="field"><span class="field-label">Owner</span><select class="input" id="inc-owner">${ownerOpts}</select></label>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
              <button class="btn btn-primary" onclick="app.updateCurrentIncident()">Save fields</button>
              <button class="btn btn-ghost" onclick="app.navTo('int-ai')" style="color:var(--warning)">Add AI key to enable triage & drafts</button>
            </div>
            <span id="inc-msg" class="form-msg"></span>
          </div>

          <div class="settings-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <p class="kicker">Customer update</p>
            </div>
            <textarea class="input" id="draft-update" rows="5" placeholder="Write or generate a customer-facing update before publishing."></textarea>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
              <span style="font-size:12px;color:var(--ghost)" id="draft-chars">0 characters</span>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn btn-primary" onclick="app.publishDraft()">Publish to status page</button>
            </div>
            <span id="draft-msg" class="form-msg"></span>
          </div>

          <div class="settings-card">
            <h3>Post-Mortem</h3>
            ${postMortem}
          </div>
        </div>
      </div>`;
    // Wire up character counter
    setTimeout(() => {
      const ta = document.getElementById('draft-update');
      if (ta) ta.addEventListener('input', () => { const el = document.getElementById('draft-chars'); if (el) el.textContent = ta.value.length + ' characters'; });
    }, 0);
  },

  async updateCurrentIncident() {
    if (!this._currentIncidentId) return;
    const data = {};
    const status = $('#inc-status')?.value; if (status) data.status = status;
    const severity = $('#inc-severity')?.value; if (severity) data.severity = severity;
    const owner = $('#inc-owner')?.value; data.ownerUserId = owner || null;
    const category = $('#inc-category')?.value; data.category = category || null;
    await window.trustloop.updateIncident(this._currentIncidentId, data);
    const el = $('#inc-msg'); if (el) { el.textContent = '✓ Incident metadata updated.'; setTimeout(() => el.textContent = '', 3000); }
  },

  async publishDraft() {
    if (!this._currentIncidentId) return;
    const ta = $('#draft-update');
    const body = ta?.value?.trim();
    if (!body) { const el = $('#draft-msg'); if (el) { el.textContent = 'Write a draft before publishing.'; el.style.color = 'var(--danger)'; } return; }
    await window.trustloop.publishStatusUpdate(this._currentIncidentId, body);
    const el = $('#draft-msg'); if (el) { el.textContent = '✓ Update published to status page.'; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
    if (ta) ta.value = '';
    const chars = $('#draft-chars'); if (chars) chars.textContent = '0 characters';
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
    this._insertCreateForm('incidents-queue');
  },

  showCreateIncidentDash() {
    const form = $('#dash-create-drawer');
    if (!form) return;
    if (form.children.length === 0) this._insertCreateForm('dash-create-drawer');
    form.classList.toggle('hidden');
  },

  _insertCreateForm(parentId) {
    const parent = document.getElementById(parentId);
    if (!parent) return;
    const el = document.createElement('div');
    el.className = 'settings-card';
    el.style.marginBottom = '16px';
    el.innerHTML = `<h3>Log a new AI failure</h3><p class="muted" style="margin-bottom:12px">Capture customer impact, route ownership, and open the incident record immediately.</p>
      <div style="display:grid;grid-template-columns:1fr 180px;gap:12px">
        <label class="field"><span class="field-label">Incident Title</span><input class="input" id="new-inc-title" placeholder="e.g. API latency spike on inference endpoint" required /></label>
        <label class="field"><span class="field-label">Channel</span><select class="input" id="new-inc-channel"><option>EMAIL</option><option>CHAT</option><option>SLACK</option><option selected>API</option><option>OTHER</option></select></label>
      </div>
      <label class="field" style="margin-top:12px"><span class="field-label">Description</span><textarea class="input" id="new-inc-desc" rows="4" placeholder="What failed, who was impacted, and what customer-visible risk exists?" required></textarea><span class="field-help">Be specific about customer impact. This record anchors the timeline and follow-up.</span></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <label class="field"><span class="field-label">Customer Name</span><input class="input" id="new-inc-cust" placeholder="e.g. Acme Corp" /></label>
        <label class="field"><span class="field-label">Customer Email</span><input class="input" id="new-inc-email" type="email" placeholder="support@acme.com" /></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-top:12px">
        <label class="field"><span class="field-label">Severity</span><select class="input" id="new-inc-sev"><option>P1</option><option>P2</option><option selected>P3</option><option>P4</option></select></label>
        <label class="field"><span class="field-label">AI Category</span><select class="input" id="new-inc-cat"><option value="">Uncategorized</option><option>HALLUCINATION</option><option>BIAS</option><option>TOXICITY</option><option>PII_LEAK</option><option>REFUSAL</option><option>DRIFT</option><option>LATENCY</option><option>OTHER</option></select></label>
        <label class="field"><span class="field-label">Model / Version</span><input class="input" id="new-inc-model" placeholder="e.g. gpt-4o" /></label>
        <label class="field"><span class="field-label">Ticket Reference</span><input class="input" id="new-inc-ticket" placeholder="e.g. ZD-10293" /></label>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px">
        <span class="field-help">No customer communication is sent automatically from this form.</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="this.closest('.settings-card').remove()">Close</button>
          <button class="btn btn-primary" onclick="app.createIncident()">Create incident</button>
        </div>
      </div>`;
    parent.prepend(el);
  },

  async createIncident() {
    const title = $('#new-inc-title')?.value?.trim();
    if (!title) return;
    const result = await window.trustloop.createIncident({
      title,
      description: $('#new-inc-desc')?.value?.trim() || '',
      severity: $('#new-inc-sev')?.value || 'P3',
      channel: $('#new-inc-channel')?.value || 'API',
      category: $('#new-inc-cat')?.value || null,
      customerName: $('#new-inc-cust')?.value?.trim() || null,
      customerEmail: $('#new-inc-email')?.value?.trim() || null,
      modelVersion: $('#new-inc-model')?.value?.trim() || null,
      sourceTicketRef: $('#new-inc-ticket')?.value?.trim() || null,
    });
    // Navigate to the new incident detail (same as web app router.push)
    if (result?.id) this.openIncident(result.id);
    else this.loadIncidents();
  },

  _charts: {},

  async loadAnalytics() {
    if (!window.trustloop) return;
    const data = await window.trustloop.analyticsSummary();
    if (!data) { $('#analytics-content').innerHTML = '<p class="muted">No analytics data.</p>'; return; }
    const { series, snapshot, failedReminders7d } = data;
    const s = snapshot || {};
    const opStats = [
      { label:'Open incidents', value:s.openIncidents??0, sub:'Currently active across the workspace' },
      { label:'P1 open', value:s.p1OpenIncidents??0, sub:'Highest-severity incidents in flight' },
      { label:'Created (7d)', value:s.incidentsCreatedLast7d??0, sub:'New incidents over the last week' },
      { label:'Resolved (7d)', value:s.incidentsResolvedLast7d??0, sub:'Closed incidents over the last week' },
      { label:'Failed reminders', value:failedReminders7d??0, sub:'Reminder jobs that failed in seven days' },
    ];
    $('#analytics-op-stats').innerHTML = opStats.map(st => `<div class="stat-card"><div class="stat-value" style="font-size:28px">${st.value}</div><div class="stat-label">${st.label}</div><div class="stat-sub">${st.sub}</div></div>`).join('');
    const covStats = [
      { label:'Avg resolution', value:`${s.avgResolutionHoursLast30d??0}h`, sub:'Hours across the last 30 days' },
      { label:'Triage coverage', value:`${s.triageCoveragePct??0}%`, sub:(s.triageCoveragePct??0)===0?'Run AI triage on your first incident to improve this metric.':'Incidents with AI-assisted triage' },
      { label:'Customer updates', value:`${s.customerUpdateCoveragePct??0}%`, sub:(s.customerUpdateCoveragePct??0)===0?'Publish a customer update on an incident to start tracking.':'Incidents with outbound customer comms' },
    ];
    $('#analytics-cov-stats').innerHTML = covStats.map(st => `<div class="stat-card"><div class="stat-value" style="font-size:28px">${st.value}</div><div class="stat-label">${st.label}</div><div class="stat-sub">${st.sub}</div></div>`).join('');
    if (!series?.length) { $('#analytics-content').innerHTML = '<p class="muted">No trend data yet. Incidents will populate these charts over time.</p>'; return; }
    $('#analytics-content').innerHTML = '';
    const labels = series.map(r => new Date(r.day).toLocaleDateString('en-US',{month:'short',day:'numeric'}));
    const base = () => ({
      responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: 'rgba(10,11,13,0.95)', titleColor: '#f3f4f6', bodyColor: '#e5e7eb', borderColor: 'rgba(99,102,241,0.2)', borderWidth: 1, cornerRadius: 12, padding: 12, titleFont: { weight: '600', size: 13 }, bodyFont: { size: 13 }, boxPadding: 4, boxWidth: 8, boxHeight: 8, usePointStyle: false,
          callbacks: { labelColor: function(ctx) { var c = ctx.dataset.borderColor || ctx.dataset.backgroundColor; return { borderColor: c, backgroundColor: c, borderRadius: 2 }; } }
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#4b5563', font: { size: 11 } }, border: { display: false } },
        y: { grid: { color: 'rgba(55,65,81,0.18)', drawBorder: false }, ticks: { color: '#4b5563', font: { size: 11 }, precision: 0 }, border: { display: false } },
      },
    });
    const dot = (c) => ({ backgroundColor: c, pointBackgroundColor: '#0a0b0d', pointBorderColor: c, pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 6, pointHoverBackgroundColor: c });
    this._mk('chart-created-resolved', 'line', labels, [
      { label: 'Created', data: series.map(r=>r.incidentsCreated), borderColor: '#f97316', borderWidth: 2.5, tension: 0.3, ...dot('#f97316') },
      { label: 'Resolved', data: series.map(r=>r.incidentsResolved), borderColor: '#22c55e', borderWidth: 2.5, tension: 0.3, ...dot('#22c55e') },
    ], base());
    this._mk('chart-open', 'line', labels, [
      { label: 'Open', data: series.map(r=>r.openAtEndOfDay), borderColor: '#6366f1', backgroundColor: '#6366f1', borderWidth: 2.5, tension: 0.3, fill: { target: 'origin', above: 'rgba(99,102,241,0.12)' }, pointBackgroundColor: '#0a0b0d', pointBorderColor: '#6366f1', pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 6, pointHoverBackgroundColor: '#6366f1' },
    ], base());
    const bOpts = base(); bOpts.scales.y.beginAtZero = true;
    this._mk('chart-p1', 'bar', labels, [
      { label: 'P1 created', data: series.map(r=>r.p1Created), backgroundColor: 'rgba(239,68,68,0.7)', hoverBackgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 8, borderSkipped: false, barPercentage: 0.7 },
    ], bOpts);
    this._mk('chart-triage', 'line', labels, [
      { label: 'Triage runs', data: series.map(r=>r.triageRuns), borderColor: '#8b5cf6', borderWidth: 2.5, tension: 0.3, ...dot('#8b5cf6') },
      { label: 'Customer updates', data: series.map(r=>r.customerUpdatesSent), borderColor: '#06b6d4', borderWidth: 2.5, tension: 0.3, ...dot('#06b6d4') },
      { label: 'Reminder emails', data: series.map(r=>r.reminderEmailsSent), borderColor: '#f59e0b', borderWidth: 2.5, tension: 0.3, ...dot('#f59e0b') },
    ], base());
  },

  _mk(id, type, labels, datasets, opts) {
    if (this._charts[id]) this._charts[id].destroy();
    const el = document.getElementById(id);
    if (!el) return;
    this._charts[id] = new Chart(el, { type, data: { labels, datasets }, options: opts });
    const leg = document.getElementById('legend-' + id.replace('chart-',''));
    if (leg) leg.innerHTML = datasets.map(ds => {
      const c = ds.borderColor || ds.backgroundColor;
      return `<span class="legend-item"><span class="legend-dot" style="background:${c}"></span>${ds.label}</span>`;
    }).join('');
  },

  async refreshAnalytics() {
    if (window.trustloop) await window.trustloop.refreshReadModels();
    this.loadAnalytics();
  },

  async syncModels() {
    if (window.trustloop) await window.trustloop.refreshReadModels();
    this.loadIncidents(1);
  },

  async exportCsv() {
    if (!window.trustloop) return;
    await window.trustloop.exportIncidentsCsv();
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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label class="form-label">Name</label><input class="input" id="profile-name" value="${this.esc(p.name||'')}" /></div>
          <div class="form-group"><label class="form-label">Work email <span style="color:var(--muted);font-size:10px" title="Linked to your auth provider">ⓘ</span></label><input class="input" value="${this.esc(p.email)}" disabled style="opacity:0.5;cursor:not-allowed" /></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label class="form-label">On-call phone${this._planBadge('on_call','Pro')}</label><input class="input" id="profile-phone" value="${this.esc(p.phone||'')}" placeholder="+14155552671" ${this._featureAllowed('on_call')?'':'disabled style="opacity:0.4;cursor:not-allowed"'} /><p style="font-size:11px;color:var(--muted);margin-top:2px">E.164 format · Used for P1 SMS escalations only</p></div>
          <div class="form-group"><label class="form-label">Role</label><input class="input" value="${p.role}" disabled style="opacity:0.5;cursor:not-allowed" /></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--rim);margin-top:8px">
          <span style="font-size:12px;color:var(--ghost)" id="profile-status">Profile is up to date.</span>
          <div style="display:flex;align-items:center;gap:8px"><span id="profile-msg" class="form-msg"></span><button class="btn btn-primary" onclick="app.saveProfile()">Save changes</button></div>
        </div>
      </div>`;
    // Track changes
    const track = () => { const el = $('#profile-status'); if (el) el.textContent = ($('#profile-name')?.value !== p.name || $('#profile-phone')?.value !== (p.phone||'')) ? 'You have unsaved changes.' : 'Profile is up to date.'; };
    $('#profile-name')?.addEventListener('input', track);
    $('#profile-phone')?.addEventListener('input', track);
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
    const slack = ws.slackTeamId ? 'Connected' : 'Not connected';
    const plan = (ws.planTier||'starter').charAt(0).toUpperCase() + (ws.planTier||'starter').slice(1);
    const compLocked = ws.complianceMode;
    $('#ws-general-content').innerHTML = `<p class="page-kicker">Workspace</p>
      <div class="settings-card"><h3>General</h3>
        <div style="display:flex;align-items:center;gap:20px;padding:8px 0;font-size:12px">
          <span><span style="color:var(--ghost);font-weight:500">Workspace</span> <strong style="color:var(--title);margin-left:6px">${this.esc(ws.name)}</strong></span>
          <span style="width:1px;height:12px;background:var(--rim)"></span>
          <span><span style="color:var(--ghost);font-weight:500">Plan</span> <strong style="color:var(--title);margin-left:6px">${plan}</strong></span>
          <span style="width:1px;height:12px;background:var(--rim)"></span>
          <span><span style="color:var(--ghost);font-weight:500">Slack</span> <strong style="color:var(--title);margin-left:6px">${slack}</strong></span>
        </div>
        <div style="height:1px;background:var(--rim);margin:4px 0"></div>

        <div style="padding:10px 0">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><p style="font-size:13px;font-weight:600;color:var(--title)">Public status page</p><p style="font-size:11px;color:var(--ghost)">Let customers check incident status at a public URL.</p></div>
            <label class="toggle"><input type="checkbox" id="ws-status-toggle" ${ws.statusPageEnabled?'checked':''} /><span class="toggle-track"></span></label>
          </div>
          <div class="form-group" style="margin-top:8px"><label class="form-label">Status page slug</label><input class="input" id="ws-slug" value="${this.esc(ws.slug||'')}" placeholder="acme-ai" /></div>
        </div>
        <div style="height:1px;background:var(--rim)"></div>

        <div style="padding:10px 0">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><p style="font-size:13px;font-weight:600;color:var(--title)">Slack integration</p><p style="font-size:11px;color:var(--ghost)">Route incident alerts and updates to a Slack channel.</p></div>
            <span style="font-size:12px;color:${ws.slackTeamId?'var(--resolve)':'var(--ghost)'}">${slack}</span>
          </div>
          ${ws.slackTeamId ? `<div class="form-group" style="margin-top:8px"><label class="form-label">Incident channel</label><input class="input" id="ws-slack-ch" value="${this.esc(ws.slackChannelId||'')}" placeholder="C0123456789" /></div>` : ''}
        </div>
        <div style="height:1px;background:var(--rim)"></div>

        <div style="padding:10px 0${!this._featureAllowed('compliance')?' ;opacity:0.4;pointer-events:none':''}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><p style="font-size:13px;font-weight:600;color:var(--title)">Compliance mode${this._planBadge('compliance','Pro')}</p><p style="font-size:11px;color:var(--ghost)">Prevent incident deletion and keep historical records immutable.</p></div>
            <label class="toggle"><input type="checkbox" id="ws-compliance-toggle" ${ws.complianceMode?'checked':''} ${compLocked||!this._featureAllowed('compliance')?'disabled':''} /><span class="toggle-track"></span></label>
          </div>
          ${compLocked ? '<p style="font-size:10px;color:var(--warning);font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-top:4px">🛡 Locked — cannot be disabled</p>' : ''}
        </div>
        <div style="height:1px;background:var(--rim)"></div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px">
          <span style="font-size:12px;color:var(--ghost)" id="ws-general-status">Settings are up to date.</span>
          <div style="display:flex;align-items:center;gap:8px"><span id="ws-general-msg" class="form-msg"></span><button class="btn btn-primary" onclick="app.saveWsGeneral()">Save changes</button></div>
        </div>
      </div>`;
  },
  async saveWsGeneral() {
    const data = {
      name: $('#ws-name-input')?.value?.trim() || undefined,
      slug: $('#ws-slug')?.value?.trim() || undefined,
      statusPageEnabled: $('#ws-status-toggle')?.checked,
      slackChannelId: $('#ws-slack-ch')?.value?.trim() || null,
      complianceMode: $('#ws-compliance-toggle')?.checked,
    };
    await window.trustloop.workspaceUpdate(data);
    const el = $('#ws-general-msg'); if (el) { el.textContent = '✓ Settings saved.'; setTimeout(() => el.textContent = '', 3000); }
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
      <div class="settings-card"><h3>Team management</h3><p class="muted" style="margin-bottom:10px">Invite teammates, assign roles, and remove members without leaving the workspace context.</p>${members}</div>
      <div class="settings-card"><h3>Invite a teammate</h3>
        <div style="display:grid;grid-template-columns:1fr 140px auto;gap:8px;align-items:flex-end">
          <div class="form-group" style="margin:0"><label class="form-label">Email</label><input class="input" id="invite-email" type="email" placeholder="teammate@company.com" /></div>
          <div class="form-group" style="margin:0"><label class="form-label">Role</label><select class="input" id="invite-role"><option>RESPONDER</option><option>MANAGER</option><option>VIEWER</option></select></div>
          <button class="btn btn-primary" onclick="app.sendInvite()">Send invite</button>
        </div>
        <span id="invite-msg" class="form-msg" style="display:block;margin-top:6px"></span>
      </div>
      <div class="settings-card"><h3>Pending invites</h3>${invites}</div>`;
  },

  async sendInvite() {
    const email = $('#invite-email')?.value?.trim();
    const role = $('#invite-role')?.value || 'RESPONDER';
    if (!email) return;
    await window.trustloop.inviteTeamMember({ email, role });
    const el = $('#invite-msg'); if (el) { el.textContent = '✓ Invite sent to ' + email; setTimeout(() => el.textContent = '', 3000); }
    $('#invite-email').value = '';
    this.loadWsTeam();
  },

  async loadWsBilling() {
    if (!window.trustloop) return;
    const ws = await window.trustloop.workspaceBilling();
    if (!ws) return;
    const b = ws.billing;
    const plan = (ws.planTier||'starter');
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    const status = b?.status || 'Pending';
    const statusLabel = status.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    const fmtMoney = (c,cur) => typeof c==='number' ? `${(c/100).toFixed(0)} ${(cur||'USD').toUpperCase()}` : 'N/A';
    const fmtDt = v => v ? new Date(v).toLocaleString('en-US') : 'N/A';
    const fmtD = v => v ? new Date(v).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'N/A';

    const usageBar = (label, used, max) => {
      const pct = max > 0 ? Math.min(100, Math.round((used/max)*100)) : 0;
      const color = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--resolve)';
      return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--body);margin-bottom:3px"><span>${label}</span><span style="color:var(--ghost)">${used||0} / ${max||'∞'}</span></div><div style="height:6px;border-radius:3px;background:var(--surface);overflow:hidden"><div style="height:100%;border-radius:3px;width:${pct}%;background:${color};transition:width 0.6s ease"></div></div></div>`;
    };

    const isCanceled = !!b?.canceledAt;

    $('#ws-billing-content').innerHTML = `<p class="page-kicker">Workspace</p>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
        <div class="stat-card"><p style="font-size:12px;color:var(--ghost)">Current plan</p><p class="stat-value" style="font-size:22px;margin-top:4px">${planLabel}</p></div>
        <div class="stat-card"><p style="font-size:12px;color:var(--ghost)">Last payment</p><p class="stat-value" style="font-size:22px;margin-top:4px">${fmtMoney(b?.lastPaymentAmount,b?.lastPaymentCurrency)}</p><p style="font-size:11px;color:var(--subtext);margin-top:2px">${fmtDt(b?.lastPaymentAt)}</p></div>
        <div class="stat-card"><p style="font-size:12px;color:var(--ghost)">Renewal window</p><p class="stat-value" style="font-size:22px;margin-top:4px">${fmtD(b?.currentPeriodEnd)}</p><p style="font-size:11px;color:var(--subtext);margin-top:2px">Started ${fmtD(b?.currentPeriodStart)}</p></div>
        <div class="stat-card"><p style="font-size:12px;color:var(--ghost)">Status</p><p class="stat-value" style="font-size:22px;margin-top:4px;color:${status==='ACTIVE'?'var(--resolve)':'var(--subtext)'}">${statusLabel}</p></div>
      </div>

      <div class="settings-card" style="margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
          <div style="flex:1;min-width:0"><h3 style="margin:0 0 4px">Plan</h3><p style="font-size:12px;color:var(--subtext);margin:0">To upgrade, downgrade, or manage your subscription, you'll be taken to the web app where secure payment is handled.</p></div>
          <button class="btn btn-primary btn-sm" style="flex-shrink:0;white-space:nowrap" onclick="app.openBillingWeb()">Upgrade / Change plan →</button>
        </div>
        ${ws.trialEndsAt ? `<p style="font-size:12px;color:var(--warning);margin-top:6px">Trial ends ${fmtD(ws.trialEndsAt)}</p>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="settings-card">
          <h3>Lifecycle</h3>
          <div style="font-size:12px;color:var(--subtext);margin-bottom:6px">Current period</div>
          <div style="font-size:13px;color:var(--body);margin-bottom:8px">${fmtD(b?.currentPeriodStart)} – ${fmtD(b?.currentPeriodEnd)}</div>
          ${isCanceled ? `<div style="font-size:12px;color:var(--subtext);margin-bottom:4px">Cancellation</div><div style="font-size:13px;color:var(--body)">${fmtD(b?.canceledAt)}</div><p style="font-size:11px;color:var(--ghost);margin-top:2px">${b?.cancelReason==='user_requested'?'Plan stays active until end of billing period.':b?.cancelReason||''}</p>` : ''}
          ${b?.lastInvoiceUrl ? `<a style="font-size:12px;color:var(--signal);cursor:pointer;margin-top:8px;display:inline-block" onclick="window.trustloop.openExternal('${b.lastInvoiceUrl}')">View latest invoice ↗</a>` : ''}
          ${b?.paymentFailedAt ? `<p style="font-size:12px;color:var(--danger);margin-top:6px">Payment failure detected at ${fmtDt(b.paymentFailedAt)}</p>` : ''}
        </div>
        <div class="settings-card">
          <h3>Today's usage</h3>
          ${usageBar('Incidents', ws.usage?.incidentsCreated, ws.quota?.incidentsPerDay)}
          ${usageBar('Triage runs', ws.usage?.triageRuns, ws.quota?.triageRunsPerDay)}
          ${usageBar('Customer updates', ws.usage?.customerUpdates, ws.quota?.customerUpdatesPerDay)}
          ${usageBar('Reminder emails', ws.usage?.reminderEmailsSent, ws.quota?.reminderEmailsPerDay)}
        </div>
      </div>`;
  },

  openBillingWeb() {
    if (window.trustloop) window.trustloop.openExternal(window.location.origin + '/workspace/billing');
  },


  async loadIntAi() {
    if (!window.trustloop) return;
    const data = await window.trustloop.integrationsAi();
    if (!data) return;
    const providers = ['OPENAI','GEMINI','ANTHROPIC'];
    const placeholders = { OPENAI:'sk-...', GEMINI:'AIza...', ANTHROPIC:'sk-ant-...' };
    const keyMap = {}; (data.keys||[]).forEach(k => keyMap[k.provider] = k);
    const cards = providers.map(p => {
      const k = keyMap[p];
      const healthy = k?.healthStatus === 'OK' || k?.healthStatus === 'HEALTHY';
      return `<div class="settings-card" style="padding:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <strong style="font-size:13px;color:var(--title)">${p}</strong>
          ${k ? `<span class="badge badge-sm" style="border-color:${healthy?'rgba(22,163,74,0.24)':'rgba(217,119,6,0.24)'};background:${healthy?'rgba(22,163,74,0.08)':'rgba(217,119,6,0.08)'};color:${healthy?'var(--resolve)':'var(--warning)'}">${healthy?'Healthy':k.healthStatus||'UNKNOWN'}</span>` : ''}
        </div>
        ${k ? `<p style="font-size:12px;color:var(--subtext)">Ends in <span style="font-family:monospace;color:var(--body)">${k.keyLast4||'????'}</span></p>${k.lastVerifiedAt ? `<p style="font-size:10px;color:var(--ghost)">Verified ${this.fmtDate(k.lastVerifiedAt)}</p>` : ''}` : '<p style="font-size:12px;color:var(--ghost)">No key configured</p>'}
        <input class="input" id="ai-key-${p}" type="password" placeholder="${placeholders[p]||'API key'}" style="margin-top:8px" />
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="app.saveAiKey('${p}')">Save Key</button>
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="app.testAiKey('${p}')">Test</button>
        </div>
      </div>`;
    }).join('');

    const wfTypes = ['INCIDENT_TRIAGE','CUSTOMER_UPDATE'];
    const wfDescs = { INCIDENT_TRIAGE:'Used when AI triage is triggered on an incident.', CUSTOMER_UPDATE:'Used when drafting customer-facing updates.' };
    const wfMap = {}; (data.workflows||[]).forEach(w => wfMap[w.workflowType] = w);
    const wfRows = wfTypes.map(wt => {
      const w = wfMap[wt] || { provider:'OPENAI', model:'gpt-4o-mini' };
      const opts = providers.map(p => `<option value="${p}"${w.provider===p?' selected':''}>${p}</option>`).join('');
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--rim)">
        <div style="flex:1;min-width:0"><p style="font-size:13px;color:var(--body);font-weight:500">${wt}</p><p style="font-size:11px;color:var(--ghost)">${wfDescs[wt]||''}</p></div>
        <select class="input" id="wf-provider-${wt}" style="width:120px">${opts}</select>
        <input class="input" id="wf-model-${wt}" value="${this.esc(w.model)}" placeholder="Model ID" style="width:140px" />
        <button class="btn btn-primary btn-sm" onclick="app.saveWorkflow('${wt}')">Save</button>
      </div>`;
    }).join('');

    $('#int-ai-content').innerHTML = `<p class="page-kicker">Integrations</p>
      <div style="margin-bottom:12px"><h2 class="section-title" style="margin-bottom:2px">AI provider keys</h2><p class="section-desc" style="margin:0 0 10px">Keys are encrypted at rest, never shown in full after save, and only used server-side for AI workflows.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${cards}</div>
      </div>
      <span id="ai-msg" class="form-msg" style="display:block;margin-bottom:8px"></span>
      <div><h2 class="section-title" style="margin-bottom:2px">Workflow routing</h2><div class="settings-card">${wfRows}</div></div>`;
  },

  async saveAiKey(provider) {
    const key = $(`#ai-key-${provider}`)?.value?.trim();
    if (!key) return;
    await window.trustloop.saveAiKey({ provider, apiKey: key });
    $(`#ai-key-${provider}`).value = '';
    const el = $('#ai-msg'); if (el) { el.textContent = `✓ ${provider} key saved securely.`; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
    this.loadIntAi();
  },

  async testAiKey(provider) {
    const key = $(`#ai-key-${provider}`)?.value?.trim();
    if (!key) return;
    const r = await window.trustloop.testAiKey({ provider, apiKey: key });
    const el = $('#ai-msg');
    if (el) { el.textContent = r?.ok ? `✓ ${provider} key is valid.` : `✗ ${provider} key test failed.`; el.style.color = r?.ok ? 'var(--resolve)' : 'var(--danger)'; setTimeout(() => el.textContent = '', 3000); }
  },

  async saveWorkflow(wt) {
    const provider = $(`#wf-provider-${wt}`)?.value;
    const model = $(`#wf-model-${wt}`)?.value?.trim();
    if (!provider || !model) return;
    await window.trustloop.saveWorkflow({ workflowType: wt, provider, model });
    const el = $('#ai-msg'); if (el) { el.textContent = `✓ ${wt} routing saved.`; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
  },

  async loadIntWebhooks() {
    if (!window.trustloop) return;
    const hooks = await window.trustloop.integrationsWebhooks();
    const types = ['DATADOG','PAGERDUTY','SENTRY','GENERIC','LANGFUSE','HELICONE','ARIZE_PHOENIX','BRAINTRUST'];
    const meta = { DATADOG:{label:'Datadog',color:'#632CA6',desc:'Forward monitors and alerts into TrustLoop incidents.'}, PAGERDUTY:{label:'PagerDuty',color:'#06AC38',desc:'Route PagerDuty on-call events to your incident queue.'}, SENTRY:{label:'Sentry',color:'#FB4226',desc:'Capture Sentry issue alerts as AI incidents.'}, GENERIC:{label:'Custom Webhook',color:'#6366f1',desc:'Accept signed payloads from any source.'}, LANGFUSE:{label:'Langfuse',color:'#8b5cf6',desc:'Ingest LLM observability events from Langfuse.'}, HELICONE:{label:'Helicone',color:'#06b6d4',desc:'Stream Helicone request logs into incidents.'}, ARIZE_PHOENIX:{label:'Arize Phoenix',color:'#f97316',desc:'Connect Arize Phoenix model monitoring.'}, BRAINTRUST:{label:'Braintrust',color:'#eab308',desc:'Pipe Braintrust eval failures into your queue.'} };
    const hookMap = {}; (hooks||[]).forEach(h => hookMap[h.type] = h);
    const rows = types.map(t => {
      const h = hookMap[t]; const m = meta[t]; const active = h?.isActive;
      return `<div class="settings-row" style="flex-direction:column;align-items:stretch;gap:0;padding:0;border-bottom:1px solid var(--rim)">
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer" onclick="this.parentElement.classList.toggle('wh-open')">
          <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${m.color}18;color:${m.color};font-size:12px;font-weight:700;flex-shrink:0">${m.label[0]}</div>
          <div style="flex:1;min-width:0"><span style="font-size:13px;font-weight:500;color:var(--title)">${m.label}</span><p style="font-size:11px;color:var(--ghost);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.desc}</p></div>
          ${h ? `<span style="font-size:10px;font-family:monospace;color:var(--ghost)">••••${h.keyLast4||''}</span>` : ''}
          <span style="width:8px;height:8px;border-radius:50%;background:${active?'var(--resolve)':'var(--ghost)'};opacity:${active?1:0.3};flex-shrink:0"></span>
          <span style="font-size:11px;color:var(--ghost)">▾</span>
        </div>
        <div class="wh-detail" style="display:none;padding:6px 10px 10px;border-top:1px solid var(--rim);background:var(--void)">
          <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;background:var(--surface);border:1px solid var(--rim);margin-bottom:6px">
            <span style="font-size:10px;color:var(--ghost);text-transform:uppercase;font-weight:600">URL</span>
            <code style="font-size:11px;color:var(--signal);flex:1;overflow:hidden;text-overflow:ellipsis">/api/webhooks/${t.toLowerCase().replace('_','-')}</code>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <input class="input" id="wh-secret-${t}" placeholder="${h?'Enter new signing secret…':'Paste signing secret to activate'}" style="flex:1" />
            <button class="btn btn-primary btn-sm" onclick="app.saveWebhookSecret('${t}')">Save</button>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${h ? `<button class="btn btn-ghost btn-sm" onclick="app.rotateWebhookSecret('${t}')">↻ Rotate secret</button>` : ''}
            <button class="btn btn-sm ${active?'btn-ghost':'btn-primary'}" onclick="app.toggleWebhook('${t}',${!active})" style="${active?'color:var(--danger)':''}">${active?'Disable':'Enable'}</button>
            ${h ? `<span style="flex:1"></span><span style="font-size:10px;color:var(--ghost)">Updated ${this.fmtDate(h.updatedAt||h.createdAt)}</span>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
    $('#int-webhooks-content').innerHTML = `<p class="page-kicker">Integrations</p>
      <div style="margin-bottom:4px"><h2 class="section-title" style="margin-bottom:2px">Webhook integrations</h2><p class="section-desc" style="margin:0 0 10px">Configure signed inbound secrets for Datadog, PagerDuty, Sentry, and AI observability sources.</p></div>
      <span id="wh-msg" class="form-msg" style="display:block;margin-bottom:6px"></span>
      <div class="settings-card" style="padding:0;overflow:hidden">${rows}</div>`;
    // Wire accordion
    document.querySelectorAll('.wh-open .wh-detail, .wh-detail').forEach(el => el.style.display = 'none');
    document.querySelectorAll('#int-webhooks-content .settings-row').forEach(row => {
      if (row.classList.contains('wh-open')) row.querySelector('.wh-detail').style.display = 'block';
    });
  },

  async saveWebhookSecret(type) {
    const secret = $(`#wh-secret-${type}`)?.value?.trim();
    if (!secret) return;
    await window.trustloop.saveWebhookSecret({ type, secret });
    $(`#wh-secret-${type}`).value = '';
    const el = $('#wh-msg'); if (el) { el.textContent = `✓ ${type} secret saved.`; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
    this.loadIntWebhooks();
  },

  async rotateWebhookSecret(type) {
    await window.trustloop.rotateWebhookSecret(type);
    const el = $('#wh-msg'); if (el) { el.textContent = `✓ ${type} secret rotated.`; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
    this.loadIntWebhooks();
  },

  async toggleWebhook(type, isActive) {
    await window.trustloop.toggleWebhook({ type, isActive });
    const el = $('#wh-msg'); if (el) { el.textContent = `✓ ${type} ${isActive ? 'enabled' : 'disabled'}.`; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
    this.loadIntWebhooks();
  },

  async loadIntOnCall() {
    if (!window.trustloop) return;
    const badge = $('#oncall-plan-badge'); if (badge) badge.innerHTML = this._planBadge('on_call','Pro');
    const data = await window.trustloop.integrationsOnCall();
    if (!data) { $('#int-oncall-content').innerHTML = '<div class="settings-card"><p class="muted">Unable to load on-call data.</p></div>'; return; }
    if (!data.onCallEnabled) {
      $('#int-oncall-content').innerHTML = `<p class="page-kicker">Integrations</p>
        <div style="margin-bottom:8px"><h2 class="section-title" style="margin-bottom:2px">On-call rotation</h2><p class="section-desc">Review the current escalation schedule for P1 incidents and verify who will be paged next.</p></div>
        <div class="settings-card"><p class="muted">On-call rotation is disabled. Enable it in the Quotas settings page.</p></div>`;
      return;
    }
    const stats = `<div style="display:flex;gap:20px;font-size:12px;margin-bottom:12px">
      <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ghost);font-weight:600">Rotation interval</p><p style="color:var(--body)">${data.intervalHours||'—'}h</p></div>
      <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ghost);font-weight:600">Anchor</p><p style="color:var(--body)">${data.anchorAt ? new Date(data.anchorAt).toLocaleString() : '—'}</p></div>
      <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ghost);font-weight:600">Pool size</p><p style="color:var(--body)">${data.members?.length||0}</p></div>
    </div>`;
    const rows = (data.members||[]).map(m => `<tr>
      <td style="font-weight:500">${this.esc(m.name||m.email)}</td>
      <td style="color:var(--subtext)">${this.esc(m.email)}</td>
      <td>${m.phone ? '<span style="color:var(--resolve)">📞</span>' : '<span style="color:var(--ghost)">—</span>'}</td>
      <td>${m.isOnCall ? '<span style="color:var(--resolve);font-size:12px;font-weight:500">✓ On call</span>' : '<span style="font-size:12px;color:var(--ghost)">Off duty</span>'}</td>
    </tr>`).join('');
    const oncallHtml = `<div class="settings-card">${stats}
        <div class="table-shell"><table class="data-table"><thead><tr><th>Member</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    $('#int-oncall-content').innerHTML = `<p class="page-kicker">Integrations</p>
      <div style="margin-bottom:8px"><h2 class="section-title" style="margin-bottom:2px">On-call rotation</h2><p class="section-desc">Review the current escalation schedule for P1 incidents and verify who will be paged next.</p></div>
      ${this._gateWrap('on_call','Pro',oncallHtml)}`;
  },

  async loadSecApiKeys() {
    if (!window.trustloop) return;
    const badge = $('#apikeys-plan-badge'); if (badge) badge.innerHTML = this._planBadge('api_keys','Pro');
    const keys = await window.trustloop.securityApiKeys();
    const keyRows = (keys||[]).map(k => {
      const expired = k.expiresAt && new Date(k.expiresAt).getTime() <= Date.now();
      const dead = !k.isActive || expired;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid var(--rim);${dead?'opacity:0.5':''}">
        <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${dead?'var(--surface)':'var(--signal-dim)'};color:${dead?'var(--ghost)':'var(--signal)'};font-size:11px;font-weight:700;flex-shrink:0">🔑</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px"><span style="font-size:13px;font-weight:500;color:${k.isActive?'var(--title)':'var(--ghost)'};${k.isActive?'':'text-decoration:line-through'}">${this.esc(k.name||'Unnamed')}</span>${!k.isActive?'<span style="font-size:9px;text-transform:uppercase;font-weight:700;color:var(--danger)">Revoked</span>':''}${expired?'<span style="font-size:9px;text-transform:uppercase;font-weight:700;color:var(--warning)">Expired</span>':''}</div>
          <div style="display:flex;gap:10px;margin-top:2px"><span style="font-size:11px;font-family:monospace;color:var(--ghost)">${this.esc(k.keyPrefix||'')}••••••</span><span style="font-size:10px;color:var(--ghost)">Created ${this.fmtDate(k.createdAt)}</span><span style="font-size:10px;color:var(--ghost)">Used ${k.lastUsedAt?this.fmtDate(k.lastUsedAt):'never'}</span></div>
        </div>
        ${k.isActive?`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="app.revokeApiKey('${k.id}')">Revoke</button>`:''}
      </div>`;
    }).join('');

    const apikeyContent = `<span id="apikey-msg" class="form-msg" style="display:block;margin-bottom:6px"></span>
      <div class="settings-card" style="margin-bottom:10px"><h3>Create new key</h3><p style="font-size:11px;color:var(--ghost);margin-bottom:8px">Choose a name and expiry for this key.</p>
        <div style="display:grid;grid-template-columns:1fr 160px auto;gap:8px;align-items:flex-end">
          <div class="form-group" style="margin:0"><label class="form-label">Key name</label><input class="input" id="new-key-name" placeholder="e.g. CI/CD Pipeline" /></div>
          <div class="form-group" style="margin:0"><label class="form-label">Expiry</label><select class="input" id="new-key-expiry"><option value="30d">30 days</option><option value="90d">90 days</option><option value="1y">1 year</option><option value="never">Never</option></select></div>
          <button class="btn btn-primary" onclick="app.createApiKey()">🔑 Generate key</button>
        </div>
      </div>
      <div class="settings-card" style="padding:0;overflow:hidden">
        <div style="padding:8px 10px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--ghost)">Active & revoked keys (${(keys||[]).length})</div>
        ${keyRows || '<div style="padding:12px;text-align:center"><p class="muted">No API keys yet. Create a scoped key when you need external systems to write into TrustLoop.</p></div>'}
      </div>`;
    $('#sec-apikeys-content').innerHTML = `<p class="page-kicker">Security</p>
      <div style="margin-bottom:8px"><h2 class="section-title" style="margin-bottom:2px">Workspace API keys</h2><p class="section-desc">Issue scoped bearer keys for automation and revoke them cleanly when no longer needed.</p></div>
      ${this._gateWrap('api_keys','Pro',apikeyContent)}`;
  },

  async createApiKey() {
    const name = $('#new-key-name')?.value?.trim();
    if (!name) return;
    const expiry = $('#new-key-expiry')?.value || '90d';
    const r = await window.trustloop.createApiKey({ name, expiryOption: expiry });
    const el = $('#apikey-msg');
    if (r?.apiKey) { el.innerHTML = `✓ Key created. <strong>Copy now — it won't be shown again:</strong> <code style="font-size:11px;color:var(--signal);user-select:all">${r.apiKey}</code>`; el.style.color = 'var(--warning)'; }
    else if (el) { el.textContent = '✓ API key created.'; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 4000); }
    $('#new-key-name').value = '';
    this.loadSecApiKeys();
  },

  async revokeApiKey(id) {
    await window.trustloop.revokeApiKey(id);
    const el = $('#apikey-msg'); if (el) { el.textContent = '✓ API key revoked.'; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
    this.loadSecApiKeys();
  },

  async loadSecAudit() {
    if (!window.trustloop) return;
    const data = await window.trustloop.securityAudit();
    if (!data?.items?.length) { $('#sec-audit-content').innerHTML = `<p class="page-kicker">Security</p><div style="margin-bottom:8px"><h2 class="section-title" style="margin-bottom:2px">Audit log</h2><p class="section-desc">Privileged workspace actions will appear here as your team configures TrustLoop.</p></div><div class="settings-card"><p class="muted">No audit activity yet.</p></div>`; return; }
    const rows = data.items.map((e,i) => `<tr${i%2===1?' style="background:rgba(10,11,13,0.5)"':''}>
      <td style="white-space:nowrap;color:var(--subtext);font-size:11px">${new Date(e.createdAt).toLocaleString()}</td>
      <td>${this.esc(e.actorUser?.name || e.actorApiKey?.name || 'System')}</td>
      <td><span class="badge badge-sm">${this.esc(e.action)}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:var(--subtext)">${this.esc(e.summary||'')}</td>
      <td style="font-family:monospace;font-size:10px;color:var(--subtext)">${e.ipAddress||'—'}</td>
    </tr>`).join('');
    $('#sec-audit-content').innerHTML = `<p class="page-kicker">Security</p>
      <div class="table-shell" style="overflow-x:auto"><table class="data-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Summary</th><th>IP</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  },

  async loadSecSso() {
    if (!window.trustloop) return;
    const badge = $('#sso-plan-badge'); if (badge) badge.innerHTML = this._planBadge('saml','Enterprise');
    const data = await window.trustloop.securitySso();
    const d = data || {};
    const configured = d.samlEnabled && d.samlMetadataUrl && d.samlConnectionId;
    const ssoCard = `<div class="settings-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="width:10px;height:10px;border-radius:50%;background:${configured?'var(--resolve)':'var(--ghost)'};opacity:${configured?1:0.4}"></span>
          <span style="font-size:13px;font-weight:500;color:var(--title)">${configured?'SAML SSO is active':'SAML SSO is not configured'}</span>
        </div>
        <div class="form-group"><label class="form-label">IdP metadata URL</label><input class="input" id="sso-metadata" value="${this.esc(d.samlMetadataUrl||'')}" placeholder="https://idp.example.com/app/metadata" /><p style="font-size:10px;color:var(--ghost);margin-top:2px">The SAML 2.0 metadata endpoint from your identity provider (Okta, Azure AD, OneLogin, etc.)</p></div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0">
          <input type="checkbox" id="sso-enabled" ${d.samlEnabled?'checked':''} style="width:16px;height:16px" />
          <span style="font-size:13px;color:var(--body)">Enable SAML SSO for this workspace</span>
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:10px;border-top:1px solid var(--rim);margin-top:8px">
          <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ghost);font-weight:600">Organization ID</p><p style="font-size:12px;font-family:monospace;color:var(--subtext)">${d.samlOrganizationId||'—'}</p></div>
          <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ghost);font-weight:600">Connection ID</p><p style="font-size:12px;font-family:monospace;color:var(--subtext)">${d.samlConnectionId||'—'}</p></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--rim);margin-top:10px">
          <span style="font-size:12px;color:var(--ghost)" id="sso-status">Settings are up to date.</span>
          <div style="display:flex;align-items:center;gap:8px"><span id="sso-msg" class="form-msg"></span><button class="btn btn-primary" onclick="app.saveSso()">Save SAML settings</button></div>
        </div>
      </div>`;
    $('#sec-sso-content').innerHTML = `<p class="page-kicker">Security</p>
      <div style="margin-bottom:8px"><h2 class="section-title" style="margin-bottom:2px">Enterprise single sign-on</h2><p class="section-desc">Connect your identity provider to enforce SAML-based authentication for all workspace members.</p></div>
      ${this._gateWrap('saml','Enterprise',ssoCard)}`;
  },

  async saveSso() {
    const metadataUrl = $('#sso-metadata')?.value?.trim() || null;
    const enabled = $('#sso-enabled')?.checked || false;
    await window.trustloop.saveSso({ samlEnabled: enabled, samlMetadataUrl: metadataUrl });
    const el = $('#sso-msg'); if (el) { el.textContent = '✓ SAML settings saved.'; el.style.color = 'var(--resolve)'; setTimeout(() => el.textContent = '', 3000); }
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
