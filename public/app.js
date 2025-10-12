/* Horizia Front-end App (Vanilla JS) */
(function () {
  const page = document.body.getAttribute('data-page');

  // Supabase client
  const SUPABASE_URL = 'https://YOUR-SUPABASE-URL.supabase.co';
  const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
  const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  // Session helpers
  const storage = {
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    get(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    remove(key) { localStorage.removeItem(key); }
  };

  async function ensureProfile(userId, profile) {
    if (!supabase || !userId) return;
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!data) {
      await supabase.from('profiles').upsert({ id: userId, ...profile });
    } else {
      if (profile && Object.keys(profile).length > 0) {
        await supabase.from('profiles').update(profile).eq('id', userId);
      }
    }
  }

  // Auth functions
  async function signUp(payload) {
    if (!supabase) return { error: { message: 'Supabase not loaded' } };
    const { email, password, first_name, last_name, role } = payload;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    const user = data.user;
    await ensureProfile(user.id, { first_name, last_name, role });
    return { data };
  }

  async function signIn(payload) {
    if (!supabase) return { error: { message: 'Supabase not loaded' } };
    const { email, password } = payload;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    const user = data.user;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    storage.set('horizia:user', { id: user.id, email: user.email, role: profile?.role || 'Admin', first_name: profile?.first_name, last_name: profile?.last_name });
    return { data };
  }

  async function forgotPassword(email) {
    if (!supabase) return { error: { message: 'Supabase not loaded' } };
    const redirectTo = location.origin + '/public/login.html';
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    storage.remove('horizia:user');
    location.href = 'login.html';
  }

  // Expose for debugging
  window.Horizia = { signUp, signIn, forgotPassword, signOut, supabase };

  // UI helpers
  function on(selector, event, handler) {
    const el = document.querySelector(selector);
    if (el) el.addEventListener(event, handler);
  }

  function renderDatetime() {
    const el = document.getElementById('header-datetime');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString();
  }
  setInterval(renderDatetime, 1000);

  // Landing: minimal
  if (page === 'landing') {
    // Nothing special for now
  }

  // Login page logic
  if (page === 'login') {
    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    function activate(tab) {
      if (tab === 'signin') {
        tabSignin.classList.add('active');
        tabSignup.classList.remove('active');
        signinForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
      } else {
        tabSignup.classList.add('active');
        tabSignin.classList.remove('active');
        signupForm.classList.remove('hidden');
        signinForm.classList.add('hidden');
      }
    }

    tabSignin?.addEventListener('click', () => activate('signin'));
    tabSignup?.addEventListener('click', () => activate('signup'));

    signinForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      const role = document.getElementById('signin-role').value;
      const msg = document.getElementById('signin-message');
      msg.textContent = 'Signing in…';
      const { error } = await signIn({ email, password });
      if (error) {
        msg.textContent = error.message;
      } else {
        // store selected role as fallback if profile missing
        const u = storage.get('horizia:user');
        if (u && !u.role) { u.role = role; storage.set('horizia:user', u); }
        location.href = 'dashboard.html';
      }
    });

    signupForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const first_name = document.getElementById('first-name').value.trim();
      const last_name = document.getElementById('last-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const role = document.getElementById('signup-role').value;
      const msg = document.getElementById('signup-message');
      msg.textContent = 'Creating account…';
      const { error } = await signUp({ email, password, first_name, last_name, role });
      if (error) {
        msg.textContent = error.message;
      } else {
        msg.textContent = 'Account created. Please check your email to confirm.';
      }
    });

    on('#btn-forgot', 'click', async () => {
      const email = document.getElementById('signin-email').value.trim();
      if (!email) return alert('Enter your email first.');
      const { error } = await forgotPassword(email);
      if (error) alert(error.message); else alert('Password reset email sent.');
    });
  }

  // Mock data for dashboard
  const MOCK = {
    projects: [
      { id: 'p1', name: 'Galaxy', priority: 'high', overdue: false, week: true },
      { id: 'p2', name: 'Nova', priority: 'medium', overdue: true, week: false },
      { id: 'p3', name: 'Pulse', priority: 'high', overdue: false, week: true },
    ],
    kpis: { delivery: 'On track', issues: 37, deploys: 12 },
    dependencyMap: 'Team A → Team B on API v2; Team C ↔ Team D for auth.',
    roadmap: 'Milestones: M1 (Nov), M2 (Dec), GA (Jan).',
    heatmap: 'Hotspots in Nova backend and Mobile API.',
    risks: 'Risk: OAuth migration delay; Mitigation: dedicate strike team.',
    status: '60% shipped, 25% in progress, 15% backlog.'
  };

  function filterData(kind) {
    if (kind === 'all') return MOCK.projects;
    if (kind === 'week') return MOCK.projects.filter(p => p.week);
    if (kind === 'overdue') return MOCK.projects.filter(p => p.overdue);
    if (kind === 'high') return MOCK.projects.filter(p => p.priority === 'high');
    return MOCK.projects;
  }

  function exportCSV(rows, filename = 'horizia.csv') {
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function setUserUI() {
    const user = storage.get('horizia:user');
    const chip = document.getElementById('user-chip');
    const roleEl = document.getElementById('sidebar-role');
    const emailEl = document.getElementById('sidebar-email');
    if (chip && user) chip.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    if (roleEl && user) roleEl.textContent = user.role || '—';
    if (emailEl && user) emailEl.textContent = user.email || '';
  }

  function renderStandardDashboard() {
    document.getElementById('kpi-delivery').textContent = MOCK.kpis.delivery;
    document.getElementById('kpi-issues').textContent = String(MOCK.kpis.issues);
    document.getElementById('kpi-deploys').textContent = String(MOCK.kpis.deploys);
    document.getElementById('dependency-content').textContent = MOCK.dependencyMap;
    document.getElementById('roadmap-content').textContent = MOCK.roadmap;
    document.getElementById('heatmap-content').textContent = MOCK.heatmap;
    document.getElementById('risk-content').textContent = MOCK.risks;
    document.getElementById('status-content').textContent = MOCK.status;
  }

  function roleView(role) {
    switch (role) {
      case 'Product Owner':
        return 'Projects, milestones, team status, and delivery metrics.';
      case 'Team Lead':
        return 'Task tracking, utilization, deadlines, and team check-ins.';
      case 'Project Manager':
        return 'Timeline, completed/overdue tasks, and milestones.';
      case 'Engineering Manager':
        return 'Blockers, code issues, deployments, and workload.';
      case 'Admin':
      default:
        return 'Admin view across all teams and projects.';
    }
  }

  function goPersonal() {
    const user = storage.get('horizia:user');
    const standard = document.getElementById('standard-dashboard');
    const personal = document.getElementById('personal-dashboard');
    document.getElementById('btn-personal').classList.add('hidden');
    document.getElementById('btn-standard').classList.remove('hidden');
    standard.classList.add('hidden');
    personal.classList.remove('hidden');
    document.getElementById('personal-title').textContent = `${user?.role || 'Role'} Dashboard`;
    document.getElementById('personal-content').textContent = roleView(user?.role);
  }

  function backToStandard() {
    document.getElementById('btn-standard').classList.add('hidden');
    document.getElementById('btn-personal').classList.remove('hidden');
    document.getElementById('personal-dashboard').classList.add('hidden');
    document.getElementById('standard-dashboard').classList.remove('hidden');
  }

  function askPulse(query) {
    // Mock response for now
    const lower = query.toLowerCase();
    if (lower.includes('jira')) return 'Jira: 12 open, 5 in progress, 2 blocked.';
    if (lower.includes('github') || lower.includes('code')) return 'GitHub: 4 PRs open, 2 awaiting review, 1 deployment today.';
    if (lower.includes('slack') || lower.includes('pulse')) return 'Slack: Team sentiment positive; 2 alerts in #incidents.';
    return 'I can summarize Jira, GitHub, and Slack. Try asking about them!';
  }

  function initDashboard() {
    renderDatetime();
    setUserUI();
    renderStandardDashboard();

    on('#btn-export', 'click', () => {
      const kind = document.getElementById('filter-select').value;
      const rows = filterData(kind);
      if (rows.length) exportCSV(rows, `horizia-${kind}.csv`);
    });

    on('#filter-select', 'change', (e) => {
      const kind = e.target.value;
      const rows = filterData(kind);
      document.getElementById('dependency-content').textContent = `${rows.length} projects match filter.`;
    });

    on('#btn-logout', 'click', signOut);
    on('#btn-personal', 'click', goPersonal);
    on('#btn-standard', 'click', backToStandard);

    // Integrations placeholder OAuth URLs
    document.querySelectorAll('.connect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.getAttribute('data-provider');
        const oauthUrl = `https://example.com/oauth/${provider}`; // placeholder
        window.open(oauthUrl, '_blank');
      });
    });

    // Ask Pulse
    const chatBox = document.getElementById('chat-box');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');

    function append(role, text) {
      const div = document.createElement('div');
      div.className = 'text-muted';
      div.innerHTML = `<strong>${role}:</strong> ${text}`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    send?.addEventListener('click', () => {
      const q = input.value.trim();
      if (!q) return;
      append('You', q);
      const response = askPulse(q);
      append('Pulse', response);
      input.value = '';
    });
  }

  if (page === 'dashboard') {
    const user = storage.get('horizia:user');
    if (!user) {
      // not signed in, redirect
      location.href = 'login.html';
      return;
    }
    initDashboard();
  }
})();
