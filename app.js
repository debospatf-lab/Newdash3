// Simple SPA router and app state
(function(){
  const appEl = document.getElementById('app');
  const headerEl = document.getElementById('app-header');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');

  const ROUTES = {
    '/': renderLanding,
    '/login': renderAuth,
    '/dashboard': renderCommonDashboard,
    '/dashboard/personal': renderPersonalDashboard,
    '/dashboard/admin': renderAdminDashboard,
    '/docs': renderDocs
  };

  const ROLES = ['Admin','Team Lead','Project Manager','Product Owner','Engineering Manager'];

  const state = {
    auth: loadAuth(),
    data: null,
    lockouts: {} // email -> count
  };

  function loadAuth(){
    try { return JSON.parse(localStorage.getItem('horizia_auth')||'null'); } catch(e){ return null; }
  }
  function saveAuth(v){ localStorage.setItem('horizia_auth', JSON.stringify(v)); }
  function clearAuth(){ localStorage.removeItem('horizia_auth'); }

  function updateHeader(){
    const isLanding = location.hash.replace('#','') === '';
    headerEl.className = 'app-header';
    headerEl.innerHTML = ''+
      '<div class="header-inner">'+
      ' <div class="brand">'+
      '   <div class="brand-logo">H</div><div class="brand-name">Horizia</div>'+
      ' </div>'+
      (isLanding ?
        ' <div class="nav-actions"><button class="btn btn-teal" id="get-started">Get started</button></div>' :
        navActionsHtml()
      )+
      '</div>';
    if(isLanding){
      document.getElementById('get-started').onclick = () => navigate('/login');
    }
  }

  function navActionsHtml(){
    const a = state.auth;
    const profile = a ? `<div class="profile-chip"><img src="${a.image||placeholderAvatar(a)}" alt="pfp"><span>${a.firstName||a.email}</span><span>•</span><span>${a.role}</span></div>` : '';
    const left = '<button class="btn btn-outline" id="to-common">Standard dashboard</button>' +
                 '<button class="btn btn-outline" id="to-personal">Go to personal dashboard</button>' +
                 (a && a.role==='Admin' ? '<button class="btn btn-outline" id="to-admin">Admin</button>' : '');
    const right = a ? '<button class="btn" id="logout">Logout</button>' : '<button class="btn" id="login-head">Login</button>';
    return '<div class="nav-actions">'+ left + profile + right + '</div>';
  }

  function placeholderAvatar(a){
    const initials = ((a.firstName||'H')[0] + (a.lastName||'Z')[0]).toUpperCase();
    const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%230D9488'/><stop offset='1' stop-color='%231E3A8A'/></linearGradient></defs><rect rx='12' width='64' height='64' fill='url(%23g)'/><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='22' font-family='Inter' fill='white'>${initials}</text></svg>`);
    return `data:image/svg+xml,${svg}`;
  }

  function bindHeaderEvents(){
    const toCommon = document.getElementById('to-common');
    const toPersonal = document.getElementById('to-personal');
    const toAdmin = document.getElementById('to-admin');
    const logout = document.getElementById('logout');
    const loginHead = document.getElementById('login-head');
    if(toCommon) toCommon.onclick = () => navigate('/dashboard');
    if(toPersonal) toPersonal.onclick = () => navigate('/dashboard/personal');
    if(toAdmin) toAdmin.onclick = () => navigate('/dashboard/admin');
    if(loginHead) loginHead.onclick = () => navigate('/login');
    if(logout) logout.onclick = () => { clearAuth(); navigate('/login'); };
  }

  async function ensureData(){
    if(state.data) return state.data;
    const [jira, slack, github] = await Promise.all([
      fetch('./data/jira.json').then(r=>r.json()),
      fetch('./data/slack.json').then(r=>r.json()),
      fetch('./data/github.json').then(r=>r.json())
    ]);
    state.data = { jira, slack, github };
    return state.data;
  }

  function navigate(path){
    location.hash = path;
  }

  function route(){
    const path = location.hash.replace('#','') || '/';
    updateHeader();
    bindHeaderEvents();
    const view = ROUTES[path] || renderNotFound;
    view();
  }

  // Views
  function renderLanding(){
    appEl.innerHTML = `
      <section class="container">
        <div class="hero">
          <div>
            <h1 class="headline">🌐 Welcome to Horizia</h1>
            <p class="sub">Where teams, tools, and insights meet in one powerful dashboard.</p>
            <p class="sub">Imagine Jira, GitHub, and Slack—seamlessly integrated side by side—all in one clean, horizontal view.</p>
            <div class="blocks" style="margin-top:10px;">
              ${integrationBlock('Jira')}
              ${integrationBlock('GitHub')}
              ${integrationBlock('Slack')}
            </div>
          </div>
          <div class="card pad">
            <h3 style="margin-top:0; color: var(--blue-900);">🚀 Unified Dashboard</h3>
            <ul style="margin:0; padding-left:18px; color: var(--slate-700);">
              <li>Jira, GitHub, Slack blocks with connection buttons</li>
              <li>Live data flows directly from your tools—no context switching</li>
              <li>Deep blues, teal highlights, soft gradients</li>
            </ul>
            <div style="margin-top:12px; display:flex; gap:10px;">
              <button class="btn btn-teal" onclick="location.hash='/login'">Get started</button>
              <button class="btn btn-outline" onclick="location.hash='/docs'">View Documentation</button>
            </div>
          </div>
        </div>
        <div class="row" style="margin-top:18px;">
          ${featureCard('Cross-Team Dependency Map', 'Visualize how teams and tasks connect, uncovering bottlenecks before they happen.', 'dependency')}
          ${featureCard('Role-Based Authentication', 'Secure login ensures data visibility is tied to each authenticated user’s role.', 'auth')}
          ${featureCard('AI-Powered Chatbot', 'Ask Pulse answers with app-specific insights only.', 'ai')}
          ${featureCard('Delivery Roadmap', 'Yearly roadmap view with planning and progress.', 'roadmap')}
          ${featureCard('Blockers Heat Map', 'Spot critical blockers instantly with heat intensity.', 'heatmap')}
          ${featureCard('Risk Indicators & Alerts', 'Real-time risk signals and alerts.', 'risk')}
          ${featureCard('Product Status Circular Chart', 'Real-time product health and progress.', 'status')}
        </div>
      </section>
    `;
  }

  function integrationBlock(name){
    return `<div class="block"><div style="font-weight:600; color: var(--blue-900);">${name}</div><div class="form-actions" style="justify-content:flex-start;margin-top:8px"><button class="btn btn-outline" data-connect='${name.toLowerCase()}'>Connect</button></div></div>`;
  }

  function featureCard(title, desc, key){
    return `<div class="card pad" style="grid-column: span 4"><div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0">${title}</h4><button class="btn btn-ghost" data-modal='${key}'>Details</button></div><p style="margin:8px 0 0;color:var(--slate-700)">${desc}</p></div>`;
  }

  function renderAuth(){
    const roleOptions = ROLES.map(r=>`<option value="${r}">${r}</option>`).join('');
    appEl.innerHTML = `
      <section class="container" style="max-width:840px">
        <h2 style="margin:4px 0;color:var(--blue-900)">Sign in to Horizia</h2>
        <div class="row">
          <div class="card pad" style="grid-column: span 6">
            <h3 style="margin-top:0">New here? Sign up</h3>
            <div class="form-row">
              <input class="input" id="su-first" placeholder="First name" required />
              <input class="input" id="su-last" placeholder="Last name" required />
            </div>
            <div class="form-row">
              <input class="input" id="su-email" type="email" placeholder="Email address" required />
              <select id="su-role">${roleOptions}</select>
            </div>
            <div class="form-row">
              <input class="input" id="su-pass" type="password" placeholder="Password" required />
              <input class="input" id="su-pass2" type="password" placeholder="Confirm password" required />
            </div>
            <div class="form-actions">
              <button class="btn" id="signup-btn">Sign up</button>
            </div>
            <div class="form-hint">Each email can be associated with only one role.</div>
          </div>
          <div class="card pad" style="grid-column: span 6">
            <h3 style="margin-top:0">Already have an account? Sign in</h3>
            <input class="input" id="si-email" type="email" placeholder="Email address" required />
            <input class="input" id="si-pass" type="password" placeholder="Password" required />
            <select id="si-role">${roleOptions}</select>
            <div class="form-actions">
              <button class="btn" id="signin-btn">Sign in</button>
              <button class="btn btn-ghost" id="forgot-btn">Forgot password</button>
              <button class="btn btn-outline" id="back-landing">Back to landing</button>
            </div>
            <div id="auth-msg" class="form-hint"></div>
          </div>
        </div>
      </section>
    `;

    document.getElementById('back-landing').onclick = () => navigate('/');
    document.getElementById('signup-btn').onclick = onSignup;
    document.getElementById('signin-btn').onclick = onSignin;
    document.getElementById('forgot-btn').onclick = onForgot;
  }

  function onSignup(){
    const firstName = document.getElementById('su-first').value.trim();
    const lastName = document.getElementById('su-last').value.trim();
    const email = document.getElementById('su-email').value.trim().toLowerCase();
    const role = document.getElementById('su-role').value;
    const pass = document.getElementById('su-pass').value;
    const pass2 = document.getElementById('su-pass2').value;
    const msg = document.getElementById('auth-msg');

    if(!firstName || !lastName || !email || !role || !pass || !pass2){ msg.textContent = 'All fields are required.'; return; }
    if(pass !== pass2){ msg.textContent = 'Passwords do not match.'; return; }

    const key = 'horizia_users';
    const users = JSON.parse(localStorage.getItem(key) || '[]');
    if(users.find(u => u.email===email)){
      msg.textContent = 'Account already exists for this email.'; return;
    }
    users.push({ firstName, lastName, email, role, pass });
    localStorage.setItem(key, JSON.stringify(users));
    msg.textContent = 'Signup successful. Please sign in.';
  }

  function onSignin(){
    const email = document.getElementById('si-email').value.trim().toLowerCase();
    const pass = document.getElementById('si-pass').value;
    const role = document.getElementById('si-role').value;
    const msg = document.getElementById('auth-msg');

    const key = 'horizia_users';
    const users = JSON.parse(localStorage.getItem(key) || '[]');

    // Account lock handling
    const failKey = `lock_${email}`;
    const fails = parseInt(localStorage.getItem(failKey)||'0',10);
    if(fails >= 3){ msg.textContent = 'Account locked due to repeated incorrect credentials.'; return; }

    const user = users.find(u => u.email===email);
    if(!user){ localStorage.setItem(failKey, (fails+1).toString()); msg.textContent = 'Invalid credentials.'; return; }
    if(user.role !== role){ localStorage.setItem(failKey, (fails+1).toString()); msg.textContent = 'This email is bound to a different role.'; return; }
    if(user.pass !== pass){ localStorage.setItem(failKey, (fails+1).toString()); msg.textContent = 'Invalid credentials.'; return; }

    localStorage.setItem(failKey, '0');
    const auth = { email, role, firstName: user.firstName, lastName: user.lastName };
    saveAuth(auth);
    navigate('/dashboard');
  }

  function onForgot(){
    const email = document.getElementById('si-email').value.trim();
    const msg = document.getElementById('auth-msg');
    msg.textContent = email ? 'Password reset link sent (demo).' : 'Enter your email to receive a reset link.';
  }

  function renderCommonDashboard(){
    ensureData().then(d => {
      const donut = donutSvg(72, '#14B8A6');
      appEl.innerHTML = `
        <section class="container">
          <div class="kpi-grid">
            ${kpi('Active Projects', d.jira.projects.length)}
            ${kpi('Open PRs', d.github.open_prs)}
            ${kpi('Slack Mentions', d.slack.mentions)}
            ${kpi('Risk Signals', d.jira.risks)}
          </div>
          <div class="row" style="margin-top:12px;">
            <div class="card pad" style="grid-column: span 8;">
              <h3 style="margin-top:0">Cross-Team Dependency Map</h3>
              ${mockDependencySvg()}
            </div>
            <div class="card pad" style="grid-column: span 4;">
              <h3 style="margin-top:0">Product Status</h3>
              ${donut}
            </div>
            <div class="card pad" style="grid-column: span 7;">
              <h3 style="margin-top:0">Delivery Roadmap</h3>
              ${roadmapSvg()}
            </div>
            <div class="card pad" style="grid-column: span 5;">
              <h3 style="margin-top:0">Blockers Heat Map</h3>
              ${heatmapSvg()}
            </div>
            <div class="card pad" style="grid-column: span 12;">
              <h3 style="margin-top:0">Risk Indicators & Alerts</h3>
              ${table([["Indicator","Value"],["Active risks", d.jira.risks],["Open PRs >5d", Math.max(0, d.github.open_prs-2)],["Blockers", d.jira.blockers]])}
            </div>
            <div class="card pad" style="grid-column: span 12;">
              <div class="tabs">
                <div class="tab active">Ask Pulse</div>
              </div>
              <div>
                <input class="input" id="ask-input" placeholder="Ask about blockers, PRs, or roadmap..." />
                <div class="form-actions" style="justify-content:flex-start;margin-top:8px"><button class="btn" id="ask-btn">Ask</button></div>
                <div id="ask-out" class="form-hint"></div>
              </div>
            </div>
          </div>
        </section>
      `;
      document.getElementById('ask-btn').onclick = () => askPulse(d);
    });
  }

  function renderPersonalDashboard(){
    const a = state.auth; if(!a){ navigate('/login'); return; }
    ensureData().then(d => {
      const role = a.role;
      appEl.innerHTML = `
        <section class="container">
          <div class="form-actions" style="justify-content:flex-end;margin-bottom:8px">
            <button class="btn btn-outline" onclick="location.hash='/dashboard'">Back to standard dashboard</button>
          </div>
          ${personalRoleSection(role, d)}
        </section>
      `;
    });
  }

  function renderAdminDashboard(){
    const a = state.auth; if(!a || a.role!=='Admin'){ navigate('/login'); return; }
    ensureData().then(d => {
      appEl.innerHTML = `
        <section class="container">
          <h2 style="margin-top:0">Admin — Full System Overview</h2>
          ${adminOverview(d)}
        </section>
      `;
    });
  }

  function renderNotFound(){ appEl.innerHTML = '<div class="container">Not found.</div>'; }

  function kpi(label, value){
    return `<div class="kpi"><div style="color:var(--slate-500);font-size:.9rem">${label}</div><div style="font-size:1.6rem;color:var(--blue-900);font-weight:700">${value}</div></div>`;
  }

  function donutSvg(pct, color){
    const r = 36, c = 2*Math.PI*r; const off = c * (1 - pct/100);
    return `<svg class='donut' viewBox='0 0 100 100'><circle cx='50' cy='50' r='36' stroke='#e2e8f0' stroke-width='10' fill='none'/><circle cx='50' cy='50' r='36' stroke='${color}' stroke-width='10' fill='none' stroke-linecap='round' stroke-dasharray='${c}' stroke-dashoffset='${off}'/><text x='50' y='54' text-anchor='middle' font-size='18' fill='#0f172a' font-family='Inter' font-weight='700'>${pct}%</text></svg>`;
  }

  function mockDependencySvg(){
    return `<svg viewBox='0 0 520 180' style='width:100%'>
      <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%230D9488'/><stop offset='1' stop-color='%231E3A8A'/></linearGradient></defs>
      <rect x='20' y='30' width='110' height='46' rx='10' fill='url(%23g)' opacity='0.85'/>
      <rect x='200' y='90' width='120' height='46' rx='10' fill='#1E3A8A' opacity='0.85'/>
      <rect x='380' y='24' width='120' height='46' rx='10' fill='#0D9488' opacity='0.85'/>
      <line x1='130' y1='53' x2='200' y2='113' stroke='#94a3b8' stroke-width='2' />
      <line x1='320' y1='113' x2='380' y2='47' stroke='#94a3b8' stroke-width='2' />
      <text x='40' y='58' fill='white' font-size='12' font-family='Inter'>Team A</text>
      <text x='220' y='118' fill='white' font-size='12' font-family='Inter'>Team B</text>
      <text x='400' y='50' fill='white' font-size='12' font-family='Inter'>Team C</text>
    </svg>`;
  }

  function heatmapSvg(){
    const cells = [];
    for(let r=0;r<5;r++){
      for(let c=0;c<10;c++){
        const val = Math.random();
        const color = val>0.75? '#ef4444' : val>0.5? '#f59e0b' : val>0.25? '#22c55e' : '#93c5fd';
        cells.push(`<rect x='${c*22}' y='${r*22}' width='20' height='20' rx='4' fill='${color}' opacity='0.9'/>`);
      }
    }
    return `<svg viewBox='0 0 220 110' style='width:100%'>${cells.join('')}</svg>`;
  }

  function roadmapSvg(){
    return `<svg viewBox='0 0 520 120' style='width:100%'>
      <line x1='20' y1='60' x2='500' y2='60' stroke='#94a3b8' stroke-width='2'/>
      ${milestone(60,'Q1 Alpha','#22c55e')}
      ${milestone(180,'Q2 Beta','#0ea5e9')}
      ${milestone(300,'Q3 Launch','#f59e0b')}
      ${milestone(420,'Q4 Stabilize','#ef4444')}
    </svg>`;
  }
  function milestone(x, label, color){
    return `<circle cx='${x}' cy='60' r='8' fill='${color}'/><text x='${x-18}' y='90' font-size='12' fill='#334155' font-family='Inter'>${label}</text>`;
  }

  function askPulse(d){
    const q = document.getElementById('ask-input').value.toLowerCase();
    const out = document.getElementById('ask-out');
    if(q.includes('blocker')) out.textContent = `${d.jira.blockers} active blockers (Jira) — see heat map.`;
    else if(q.includes('pr')) out.textContent = `${d.github.open_prs} open PRs across repos.`;
    else if(q.includes('roadmap')) out.textContent = `4 quarterly phases with ${d.jira.milestones} milestones.`;
    else out.textContent = 'Try asking about blockers, PRs, or roadmap.';
  }

  function personalRoleSection(role, d){
    if(role==='Product Owner') return productOwnerView(d);
    if(role==='Team Lead') return teamLeadView(d);
    if(role==='Project Manager') return projectManagerView(d);
    if(role==='Engineering Manager') return engineeringManagerView(d);
    if(role==='Admin') return adminOverview(d);
    return '<div class="card pad">Unknown role.</div>';
  }

  function productOwnerView(d){
    return `
      <div class="row">
        <div class="card pad" style="grid-column: span 5;">${kpi('Active projects', d.jira.projects.length)}${kpi('Dependencies', d.jira.dependencies)}</div>
        <div class="card pad" style="grid-column: span 7;">
          <h3 style="margin-top:0">Product live stats</h3>
          <div class="tabs"><div class="tab active">On track</div><div class="tab">At risk</div><div class="tab">Delayed</div></div>
          ${heatmapSvg()}
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">My team</h3>
          <div class="form-actions" style="justify-content:flex-start"><button class="btn btn-outline">Add team member</button></div>
          <div class="form-hint">${d.slack.team_members.join(', ')}</div>
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Milestone tracker</h3>
          ${roadmapSvg()}
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Ask Pulse</h3>
          <div class="form-hint">Jira insights, Slack insights</div>
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Progress vs time</h3>
          ${barChart([["Jan",20],["Mar",45],["Jun",68],["Sep",78],["Dec",92]])}
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">SEO growth</h3>
          ${donutSvg(64, '#0ea5e9')}
        </div>
      </div>
    `;
  }

  function teamLeadView(d){
    return `
      <div class="row">
        <div class="card pad" style="grid-column: span 6;">${kpi('Tasks', d.jira.tasks)}</div>
        <div class="card pad" style="grid-column: span 6;">${kpi('Team utilization', d.slack.utilization+'%')}</div>
        <div class="card pad" style="grid-column: span 6;">${kpi('Upcoming deadlines', d.jira.upcoming)}</div>
        <div class="card pad" style="grid-column: span 6;">${kpi('Milestones', d.jira.milestones)}</div>
        <div class="card pad" style="grid-column: span 12;">
          <h3 style="margin-top:0">Team members</h3>
          <div class="form-hint">${d.slack.team_members.join(', ')}</div>
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Check-in tracker</h3>
          ${table([['Name','Status'], ...d.slack.checkins.map(x=>[x.name, x.status])])}
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Working hours</h3>
          ${donutSvg(72, '#14B8A6')}
        </div>
        <div class="card pad" style="grid-column: span 12;">
          <h3 style="margin-top:0">Ask Pulse</h3>
          <div class="tabs"><div class="tab active">Risks</div><div class="tab">Team load</div><div class="tab">Focus</div></div>
          ${table([['Signal','Value'],['Active risks', d.jira.risks],['Load', d.slack.utilization+'%']])}
        </div>
      </div>
    `;
  }

  function projectManagerView(d){
    return `
      <div class="row">
        <div class="card pad" style="grid-column: span 12;">
          <div class="tabs">
            <div class="tab active">1. Total timeline</div>
            <div class="tab">2. Completed</div>
            <div class="tab">3. Overdue</div>
            <div class="tab">4. Active risks</div>
            <div class="tab">5. Total projects</div>
            <div class="tab">6. Pending</div>
            <div class="tab">7. Upcoming</div>
            <div class="tab">8. Milestones</div>
          </div>
          <div class="form-hint">Data for the active tab appears here.</div>
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Project status</h3>
          ${legendList(['At risk','Delayed','Active blockers','Dependency conflicts'], ['#22c55e','#f59e0b','#3b82f6','#ef4444'])}
          ${donutSvg(58, '#1E3A8A')}
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Milestone tracker</h3>
          ${barChart([["Q1",3],["Q2",5],["Q3",7],["Q4",4]])}
        </div>
        <div class="card pad" style="grid-column: span 12;">
          <h3 style="margin-top:0">Ask Pulse</h3>
          <div class="tabs"><div class="tab active">Risks</div><div class="tab">Team load</div><div class="tab">Focus</div></div>
          ${table([['Metric','Value'],['Timeline health','Good'],['Overdue tasks', d.jira.overdue]])}
        </div>
      </div>
    `;
  }

  function engineeringManagerView(d){
    return `
      <div class="row">
        <div class="card pad" style="grid-column: span 12; display:flex; gap:12px;">
          ${integrationBlock('Jira')}
          ${integrationBlock('GitHub')}
          ${integrationBlock('Slack')}
        </div>
        <div class="card pad" style="grid-column: span 12;">
          <div class="tabs">
            <div class="tab active">1. Blockers feed</div>
            <div class="tab">2. Project review</div>
            <div class="tab">3. Open coding issues</div>
            <div class="tab">4. Pending deployments</div>
          </div>
          ${table([['Feed','Count'], ['Blockers', d.jira.blockers], ['Issues', d.github.issues], ['Deployments', d.github.pending_deployments]])}
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">Cycle time breakdown</h3>
          ${barChart([["Coding",2.1],["PR review",1.2],["QA",0.9],["Deploy",0.6]], true)}
        </div>
        <div class="card pad" style="grid-column: span 6;">
          <h3 style="margin-top:0">My team</h3>
          <div class="tabs"><div class="tab active">Members</div><div class="tab">Workload</div></div>
          ${table([['Member','Load'], ...d.slack.workload.map(w=>[w.name, w.level])])}
        </div>
        <div class="card pad" style="grid-column: span 12;">
          <h3 style="margin-top:0">Ask Pulse</h3>
          <div class="tabs"><div class="tab active">Pending reviews</div><div class="tab">Code quality (GitHub)</div><div class="tab">Issues</div></div>
          ${table([['Item','Value'], ['Pending reviews', d.github.pending_reviews], ['Code smells', d.github.code_smells], ['Issues', d.github.issues]])}
          <div class="form-actions" style="justify-content:flex-start;margin-top:8px"><button class="btn btn-outline">Review</button></div>
        </div>
      </div>
    `;
  }

  function adminOverview(d){
    return `
      <div class="row">
        <div class="card pad" style="grid-column: span 12;">${kpi('Users', (JSON.parse(localStorage.getItem('horizia_users')||'[]')).length)}</div>
        <div class="card pad" style="grid-column: span 12;">
          <h3 style="margin-top:0">All role views</h3>
          ${productOwnerView(d)}
          ${teamLeadView(d)}
          ${projectManagerView(d)}
          ${engineeringManagerView(d)}
        </div>
      </div>
    `;
  }

  function table(rows){
    return '<div class="card pad" style="padding:0"><table style="width:100%; border-collapse:collapse">'+
      rows.map((r,i)=>`<tr>${r.map((c,j)=>`<td style="border-top:${i? '1px solid #e2e8f0':'none'}; padding:8px; font-weight:${i? '500':'700'}; color:${i? '#334155':'#1E3A8A'}">${c}</td>`).join('')}</tr>`).join('')+
    '</table></div>';
  }

  function legendList(labels, colors){
    return '<ul style="list-style:none; padding:0; display:flex; gap:12px">'+labels.map((l,i)=>`<li style="display:flex; align-items:center; gap:6px"><span style="width:10px;height:10px;border-radius:2px;background:${colors[i]}"></span><span>${l}</span></li>`).join('')+'</ul>';
  }

  function barChart(pairs, hours){
    const max = Math.max(...pairs.map(p=>p[1]));
    const bars = pairs.map(([label,val])=>{
      const h = Math.round((val/max)*90);
      return `<div style='display:flex; flex-direction:column; align-items:center; gap:8px'>
        <div title='${val}${hours?'h':''}' style='width:16px; height:${h}px; background:linear-gradient(180deg, var(--teal-600), var(--blue-900)); border-radius:6px'></div>
        <div style='font-size:12px; color:#334155'>${label}</div>
      </div>`
    }).join('');
    return `<div style='display:flex; align-items:flex-end; gap:12px; height:120px'>${bars}</div>`;
  }

  // Docs page
  function renderDocs(){
    appEl.innerHTML = `<section class='container card pad'>${docsHtml()}</section>`;
  }

  function docsHtml(){
    return `
      <h2 style='margin-top:0'>AI Delivery Dashboard — Comprehensive Documentation</h2>
      <p class='form-hint'>MVP → MMP scope with validation and acceptance criteria. Hosting target: GoDaddy (static hosting + DB + auth).</p>
      ${docSection('1. Vision & Strategy', [
        ['Product Vision Statement', 'Problem overview, mission, success, AI/ML thesis. Future Vision: predictive analytics and org-wide adoption.'],
        ['Problem & Opportunity', 'Current visibility gaps; impact on outcomes; how AI mitigates risk (add research e.g., “82% of PMs lack delivery visibility”).'],
        ['Market & Competitive', 'Benchmark vs Jira, Linear, Monday, ClickUp; SWOT; AI automation. Include visuals for latency reduction and AI insights.'],
        ['Innovation & Differentiator', 'ML risk prediction, NLP blocker detection, Responsible AI. Add architecture diagram and model performance.'],
        ['Value Proposition Canvas', 'Map pains/gains to features with MVP metrics (e.g., -40% time to detect blockers).']
      ])}
      ${docSection('2. Product Definition & Requirements', [
        ['PRD', 'Goals, metrics, epics, user stories, deps, constraints. Acceptance & Test Criteria per story (functional, integration, usability).'],
        ['FRS', 'Modules: Integrations, Data/ML, UI, Analytics, Notifications. Include test case IDs (e.g., FRS-02.1 NLP detects "blocked").'],
        ['NFR', 'Performance, scalability, availability, security. e.g., API <1.5s @500 conc.; uptime ≥99.5%.'],
        ['Personas & Journeys', 'PO, TL, PM, EM; add persona dashboards & usage metrics.'],
        ['Feature Roadmap', 'MVP → MMP → Predictive AI with verification gates and measurable milestones.']
      ])}
      ${docSection('3. Architecture & Technical', [
        ['System Architecture', 'Ingestion → Processing/ML → APIs → UI. Add precision/recall and benchmarks.'],
        ['Data Flow & Pipeline', 'ETL with unit tests for data quality (>95% tagged Slack messages detected).'],
        ['ML Model Docs', 'Training datasets, algorithms, metrics (e.g., F1=0.86), acceptance thresholds (≥80% confidence for high-risk).'],
        ['API Spec', 'REST endpoints, schemas, rate limits, plus API test cases (<1s GET /projects).'],
        ['Security & Privacy', 'OAuth2, encryption, anonymization; penetration test outcomes; GDPR/ISO 27001 checklist.']
      ])}
      ${docSection('4. Design & Experience', [
        ['Wireframes / Mockups', 'Core screens: Dashboard, Risk Overview, Insights Feed, Team Pulse. Usability test: find delayed project <10s.'],
        ['Design System', 'Colors, typography, layout, WCAG 2.1 AA checks.'],
        ['Interactive Prototype', 'Clickable flows with feedback summary (e.g., 8/10 prefer heatmap).']
      ])}
      ${docSection('5. Project Delivery & Collaboration', [
        ['Project Charter / Scope', 'Objectives, stakeholders, scope, constraints. Include RACI and dependency map.'],
        ['Sprint Plans', 'Sprint goals, backlog, retro insights with velocity trends.'],
        ['Communication Plan', 'Slack/Jira/GitHub integrations w/ engagement metrics.'],
        ['Test Strategy & QA', 'Unit, integration, regression coverage. Acceptance criteria: Jira sync w/o data loss; blocker detection ≥85%.']
      ])}
      ${docSection('6. Research, Metrics & Impact', [
        ['User Feedback', 'Beta interviews; usage metrics (e.g., 120 users, 6m12s session).'],
        ['Performance & Adoption', 'Load times, retention, A/B testing & funnels.'],
        ['Case Studies', 'Narratives with pre/post comparative stats (e.g., +25% delivery confidence).'],
        ['ROI & Productivity', 'Efficiency gains and visualizations.']
      ])}
      ${docSection('7. Scalability, Innovation & Viability', [
        ['Founder / Innovator Summary', 'Leadership and innovation with MVP metrics.'],
        ['Product Demo Deck', 'Executive overview with visuals and KPIs; add ML performance.'],
        ['System Evidence', 'Repos, commits, architecture proof, coverage badges.'],
        ['Timeline of Contribution', 'MVP → Beta → Predictive Enhancements.']
      ])}
      ${docSection('8. Optional Enhancements', [
        ['Go-To-Market', 'Pricing, positioning, channels with adoption projections.'],
        ['Funding / Investor', 'Problem, solution, traction; performance & retention stats.'],
        ['Ethical AI', 'Bias mitigation, explainability, transparency. Test: prediction rationale visible.']
      ])}
      ${docSection('Feedback from Festus — 05 Oct 2025', [
        ['Requirement Catalogue', 'Keep updated with functional and access control specs.'],
        ['User Role Restriction', 'Each email bound to one user role — enforced in signup/signin.'],
        ['User Profile Display', 'Top-right: name, role, optional profile image (implemented in header).'],
        ['Authentication Method', 'No SSO now; standard credentials only.'],
        ['Account Lock Handling', 'After repeated failures, show locked account notification (implemented).'],
        ['System Administrator Role', 'Define as System Admin with explicit permissions.'],
        ['AI Tool Transparency', 'Describe training scope for Project Insights and Collaboration.']
      ])}
      <p class='form-hint'>Deployment: GoDaddy — host static files, provision DB and simple auth; replace localStorage mocks with backend endpoints when ready.</p>
    `;
  }

  function docSection(title, items){
    return `<section class='card pad' style='margin: 10px 0'>
      <h3 style='margin:0'>${title}</h3>
      <ul style='margin:8px 0 0 18px'>${items.map(([h,d])=>`<li><b>${h}:</b> ${d}</li>`).join('')}</ul>
    </section>`;
  }

  // Modal helpers
  document.addEventListener('click', (e)=>{
    const target = e.target;
    if(target && target.dataset && target.dataset.modal){
      openModal(target.dataset.modal);
    }
    if(target && target.dataset && target.dataset.connect){
      connectIntegration(target.dataset.connect);
    }
  });
  function openModal(kind){
    modalTitle.textContent = kind[0].toUpperCase()+kind.slice(1);
    if(kind==='review'){
      modalBody.innerHTML = `<p class='form-hint'>Open the selected item in its source tool.</p>
        <div class='form-actions' style='justify-content:flex-start'>
          <button class='btn btn-outline' onclick=\"window.open('#jira','_blank')\">Open in Jira</button>
          <button class='btn btn-outline' onclick=\"window.open('#slack','_blank')\">Open in Slack</button>
          <button class='btn btn-outline' onclick=\"window.open('#github','_blank')\">Open in GitHub</button>
        </div>`;
    } else {
      modalBody.innerHTML = `<div class='form-hint'>More details about ${kind}.</div>`;
    }
    modalBackdrop.hidden = false;
  }
  modalClose.onclick = ()=> modalBackdrop.hidden = true;
  modalBackdrop.addEventListener('click', (e)=>{ if(e.target===modalBackdrop) modalBackdrop.hidden = true; });

  function connectIntegration(name){
    const a = state.auth;
    if(!a || (a.role!=='Engineering Manager' && a.role!=='Admin')){
      modalTitle.textContent = 'Access restricted';
      modalBody.innerHTML = `<div class='form-hint'>Only authorized users can connect ${name}. Please sign in as Engineering Manager or Admin.</div>`;
      modalBackdrop.hidden = false;
      return;
    }
    modalTitle.textContent = `Connect ${name}`;
    modalBody.innerHTML = `<div class='form-hint'>Connected (demo). Replace with OAuth2 flow in production.</div>`;
    modalBackdrop.hidden = false;
  }

  window.addEventListener('hashchange', route);
  route();
})();
