/* NeuralMail v9 — popup.js
   Clean 5-screen flow: Welcome → Signup/Login → Home
   No API key tab. No settings for normal users. Just works. */

const DAILY_LIMIT = 50;

// ── BACKEND URL ───────────────────────────────────────────
function getUrl() {
    return new Promise(res =>
        chrome.storage.sync.get(['backendUrl'], r =>
            res((r.backendUrl || 'https://neuralmail-ai-production.up.railway.app').replace(/\/$/, ''))
        )
    );
}

// ── STORAGE ───────────────────────────────────────────────
const store = {
    get: (keys) => new Promise(res => chrome.storage.local.get(keys, res)),
    set: (obj)  => new Promise(res => chrome.storage.local.set(obj, res)),
    del: (keys) => new Promise(res => chrome.storage.local.remove(keys, res)),
};

// ── SCREEN ROUTER ─────────────────────────────────────────
function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('show'));
    const el = document.getElementById('s-' + id);
    if (el) el.classList.add('show');
}

// ── STATUS DOT ────────────────────────────────────────────
function dot(state) {
    const d = document.getElementById('hdot');
    if (!d) return;
    d.className = 'hdot ' + state;
}

// ── MSG HELPER ────────────────────────────────────────────
function msg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'msg ' + type;
    el.style.display = 'block';
    if (type !== 'err') setTimeout(() => el.style.display = 'none', 4000);
}
function clearMsg(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// ── BUTTON STATE ──────────────────────────────────────────
function btnLoad(id, loading) {
    const b = document.getElementById(id);
    if (!b) return;
    b.disabled = loading;
    if (loading) b.classList.add('loading');
    else b.classList.remove('loading');
}
function btnSuccess(id, text) {
    const b = document.getElementById(id);
    if (!b) return;
    b.classList.remove('loading');
    b.style.background = 'linear-gradient(135deg,#059669,#34d399)';
    b.querySelector('.btn-txt').textContent = '✓ ' + text;
    setTimeout(() => {
        b.style.background = '';
        b.querySelector('.btn-txt').textContent = b.dataset.orig || '';
    }, 1200);
}
function btnShake(id) {
    const b = document.getElementById(id);
    if (!b) return;
    b.classList.remove('loading'); b.disabled = false;
    b.classList.add('shaking');
    setTimeout(() => b.classList.remove('shaking'), 400);
}

// ── EYE TOGGLE ────────────────────────────────────────────
function eyeToggle(inputId, showId, hideId, btnId) {
    const btn = document.getElementById(btnId);
    const inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.addEventListener('click', () => {
        const vis = inp.type === 'password';
        inp.type = vis ? 'text' : 'password';
        document.getElementById(showId).style.display = vis ? 'none'  : '';
        document.getElementById(hideId).style.display = vis ? ''      : 'none';
        btn.classList.toggle('on', vis);
    });
}

// ── JWT EXPIRY CHECK ──────────────────────────────────────
function tokenExpired(token) {
    if (!token) return true;
    try {
        const p = JSON.parse(atob(token.split('.')[1]));
        return p.exp * 1000 < Date.now();
    } catch { return true; }
}

// ── API CALL ──────────────────────────────────────────────
async function api(path, method = 'GET', body = null, token = null) {
    const base = await getUrl();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(base + path, opts);
    const data = await r.json();
    return { ok: r.ok, status: r.status, data };
}

// ── HEALTH CHECK ──────────────────────────────────────────
async function checkHealth() {
    dot('spin');
    try {
        const base = await getUrl();
        const r = await fetch(base + '/api/email/health',
            { signal: AbortSignal.timeout(5000) });
        dot(r.ok ? 'ok' : 'err');
    } catch { dot('err'); }
}

// ── POPULATE HOME SCREEN ──────────────────────────────────
function populateHome(username, email, requestsToday) {
    const av = document.getElementById('home-av');
    const nm = document.getElementById('home-name');
    const em = document.getElementById('home-email');
    const ct = document.getElementById('home-count');
    const br = document.getElementById('home-bar');
    if (av) av.textContent = (username || '?').charAt(0).toUpperCase();
    if (nm) nm.textContent = username || '—';
    if (em) em.textContent = email    || '—';
    const used = requestsToday || 0;
    const pct  = Math.min(100, Math.round((used / DAILY_LIMIT) * 100));
    if (ct) ct.textContent = used + ' / ' + DAILY_LIMIT + ' requests';
    if (br) br.style.width = pct + '%';
    // Turn bar red if near limit
    if (br) br.style.background = pct >= 90
        ? 'linear-gradient(90deg,#ef4444,#f87171)'
        : 'linear-gradient(90deg,#6366f1,#a855f7)';
}

// ── INIT — CHECK IF ALREADY LOGGED IN ─────────────────────
async function init() {
    checkHealth();
    const { jwtToken, nmUser, nmEmail } = await store.get(['jwtToken','nmUser','nmEmail']);

    if (!jwtToken || tokenExpired(jwtToken)) {
        // Show welcome for first-timers, login for returning users
        if (nmUser) show('login');
        else        show('welcome');
        return;
    }

    // Validate token with backend
    try {
        const r = await api('/api/auth/validate', 'GET', null, jwtToken);
        if (r.ok) {
            populateHome(r.data.username, r.data.email, r.data.requestsToday);
            show('home');
        } else {
            await store.del(['jwtToken']);
            show(nmUser ? 'login' : 'welcome');
        }
    } catch {
        // Backend offline — still show home if we have a token
        populateHome(nmUser, nmEmail, 0);
        show('home');
    }
}

// ── SIGNUP ────────────────────────────────────────────────
async function doSignup() {
    const user  = document.getElementById('su-user')?.value.trim();
    const email = document.getElementById('su-email')?.value.trim();
    const pass  = document.getElementById('su-pass')?.value;
    clearMsg('su-msg');

    if (!user  || user.length < 3)  { msg('su-msg', 'Username must be at least 3 characters', 'err'); return; }
    if (!email || !email.includes('@')) { msg('su-msg', 'Please enter a valid email address', 'err'); return; }
    if (!pass  || pass.length < 6)  { msg('su-msg', 'Password must be at least 6 characters', 'err'); return; }

    btnLoad('su-btn', true);
    try {
        const r = await api('/api/auth/signup', 'POST', { username: user, email, password: pass });
        if (r.ok) {
            await store.set({ jwtToken: r.data.token, nmUser: r.data.username, nmEmail: r.data.email });
            btnSuccess('su-btn', 'Account created!');
            setTimeout(() => {
                populateHome(r.data.username, r.data.email, 0);
                show('home');
            }, 900);
        } else {
            btnShake('su-btn');
            msg('su-msg', r.data.error || 'Signup failed', 'err');
        }
    } catch(e) {
        btnShake('su-btn');
        msg('su-msg', 'Cannot reach server. Is the backend running?', 'err');
    }
}

// ── LOGIN ─────────────────────────────────────────────────
async function doLogin() {
    const user = document.getElementById('li-user')?.value.trim();
    const pass = document.getElementById('li-pass')?.value;
    clearMsg('li-msg');

    if (!user) { msg('li-msg', 'Username is required', 'err'); return; }
    if (!pass) { msg('li-msg', 'Password is required', 'err'); return; }

    btnLoad('li-btn', true);
    try {
        const r = await api('/api/auth/login', 'POST', { username: user, password: pass });
        if (r.ok) {
            await store.set({ jwtToken: r.data.token, nmUser: r.data.username, nmEmail: r.data.email });
            btnSuccess('li-btn', 'Logged in!');
            // Get usage info
            const v = await api('/api/auth/validate', 'GET', null, r.data.token);
            const used = v.ok ? v.data.requestsToday : 0;
            setTimeout(() => {
                populateHome(r.data.username, r.data.email, used);
                show('home');
            }, 800);
        } else {
            btnShake('li-btn');
            msg('li-msg', r.data.error || 'Wrong username or password', 'err');
        }
    } catch(e) {
        btnShake('li-btn');
        msg('li-msg', 'Cannot reach server. Is the backend running?', 'err');
    }
}



// ── FORGOT PASSWORD ───────────────────────────────────────
async function doForgot() {
    const email = document.getElementById('fp-email')?.value.trim();
    clearMsg('fp-msg');
    if (!email || !email.includes('@')) {
        msg('fp-msg', 'Please enter a valid email address', 'err'); return;
    }
    btnLoad('fp-btn', true);
    try {
        const r = await api('/api/auth/forgot-password', 'POST', { email });
        btnLoad('fp-btn', false);
        if (r.ok) {
            msg('fp-msg', 'Reset link sent! Check your inbox (and spam folder).', 'ok');
        } else {
            msg('fp-msg', r.data.error || 'Something went wrong', 'err');
        }
    } catch {
        btnLoad('fp-btn', false);
        msg('fp-msg', 'Cannot reach server', 'err');
    }
}

// ── LOGOUT ────────────────────────────────────────────────
async function doLogout() {
    await store.del(['jwtToken']);
    // Keep nmUser so we show login screen (not welcome) next time
    show('login');
    // Pre-fill username
    const { nmUser } = await store.get(['nmUser']);
    const li = document.getElementById('li-user');
    if (li && nmUser) li.value = nmUser;
}

// ── WIRE UP ALL EVENTS ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Store original button texts for reset after success animation
    ['su-btn','li-btn','fp-btn'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.dataset.orig = b.querySelector('.btn-txt')?.textContent || '';
    });

    // Eye toggles
    eyeToggle('su-pass', 'su-eye-show', 'su-eye-hide', 'su-eye');
    eyeToggle('li-pass', 'li-eye-show', 'li-eye-hide', 'li-eye');

    // Welcome screen
    document.getElementById('goSignup')?.addEventListener('click', () => show('signup'));
    document.getElementById('goLogin') ?.addEventListener('click', () => show('login'));

    // Signup screen
    document.getElementById('su-btn')     ?.addEventListener('click', doSignup);
    document.getElementById('su-go-login')?.addEventListener('click', () => { clearMsg('su-msg'); show('login'); });
    ['su-user','su-email','su-pass'].forEach(id =>
        document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doSignup(); })
    );

    // Login screen
    document.getElementById('li-btn')      ?.addEventListener('click', doLogin);
    document.getElementById('li-go-signup') ?.addEventListener('click', () => { clearMsg('li-msg'); show('signup'); });
    document.getElementById('li-forgot')    ?.addEventListener('click', () => { clearMsg('li-msg'); show('forgot'); });
    ['li-user','li-pass'].forEach(id =>
        document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); })
    );

    // Forgot password screen
    document.getElementById('fp-btn') ?.addEventListener('click', doForgot);
    document.getElementById('fp-back')?.addEventListener('click', () => { clearMsg('fp-msg'); show('login'); });
    document.getElementById('fp-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') doForgot(); });

    // Home screen
    document.getElementById('logout-btn')?.addEventListener('click', doLogout);

    // Run init
    init();
});