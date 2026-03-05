/* ═══════════════════════════════════════════════════════════
   NeuralMail v8 — popup.js
   Handles: tabs, login, logout, auth state, backend settings
═══════════════════════════════════════════════════════════ */

// ── HELPERS ───────────────────────────────────────────────
function show(el)  { if (el) el.style.display = 'block'; }
function hide(el)  { if (el) el.style.display = 'none';  }
function showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `msg ${type}`;
    el.style.display = 'block';
    if (type !== 'err') {
        setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
}

function bgMsg(msg) {
    return new Promise((res, rej) => {
        chrome.runtime.sendMessage(msg, r => {
            if (chrome.runtime.lastError) return rej(new Error(chrome.runtime.lastError.message));
            if (!r) return rej(new Error('No response'));
            res(r);
        });
    });
}

// ── TOGGLE PASSWORD ───────────────────────────────────────
function togglePassword() {
    const inp = document.getElementById('loginPass');
    const btn = document.getElementById('togglePass');
    if (!inp) return;
    if (inp.type === 'password') {
        inp.type = 'text';
        btn.textContent = '🙈';
        btn.title = 'Hide password';
    } else {
        inp.type = 'password';
        btn.textContent = '👁';
        btn.title = 'Show password';
    }
}

// ── TABS ──────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById(`tab-${tab.dataset.tab}`);
            if (panel) panel.classList.add('active');
        });
    });
}

// ── AUTH STATE ────────────────────────────────────────────
async function refreshAuthState() {
    try {
        const r = await bgMsg({ type: 'CHECK_AUTH' });
        if (r.success && r.authenticated) {
            showLoggedIn(r.username, r.remainingMs);
        } else {
            showLoggedOut();
        }
    } catch {
        showLoggedOut();
    }
}

function showLoggedIn(username, remainingMs) {
    const loggedIn  = document.getElementById('loggedInView');
    const loginView = document.getElementById('loginView');

    // Animate out login view first
    if (loginView && loginView.style.display !== 'none') {
        loginView.classList.add('auth-anim-out');
        setTimeout(() => {
            loginView.style.display = 'none';
            loginView.classList.remove('auth-anim-out');
            if (loggedIn) {
                loggedIn.style.display = 'block';
                loggedIn.classList.add('auth-anim-in');
                setTimeout(() => loggedIn.classList.remove('auth-anim-in'), 400);
            }
        }, 180);
    } else {
        if (loginView) loginView.style.display = 'none';
        if (loggedIn)  { loggedIn.style.display = 'block'; loggedIn.classList.add('auth-anim-in'); setTimeout(() => loggedIn.classList.remove('auth-anim-in'), 400); }
    }

    const avatar = document.getElementById('authAv');
    const name   = document.getElementById('authName');
    const expiry = document.getElementById('authExpiry');

    if (avatar && username) avatar.textContent = username.charAt(0).toUpperCase();
    if (name   && username) name.textContent   = username;
    if (expiry) {
        if (remainingMs) {
            const hours = Math.floor(remainingMs / 3600000);
            const mins  = Math.floor((remainingMs % 3600000) / 60000);
            expiry.textContent = `Session: ${hours}h ${mins}m remaining`;
        } else {
            expiry.textContent = 'Active session';
        }
    }
}

function showLoggedOut() {
    const loggedIn  = document.getElementById('loggedInView');
    const loginView = document.getElementById('loginView');

    if (loggedIn && loggedIn.style.display !== 'none') {
        loggedIn.classList.add('auth-anim-out');
        setTimeout(() => {
            loggedIn.style.display = 'none';
            loggedIn.classList.remove('auth-anim-out');
            if (loginView) {
                loginView.style.display = 'block';
                loginView.classList.add('auth-anim-in');
                setTimeout(() => loginView.classList.remove('auth-anim-in'), 400);
            }
        }, 180);
    } else {
        if (loggedIn)  loggedIn.style.display  = 'none';
        if (loginView) { loginView.style.display = 'block'; loginView.classList.add('auth-anim-in'); setTimeout(() => loginView.classList.remove('auth-anim-in'), 400); }
    }

    const avatar = document.getElementById('authAv');
    const name   = document.getElementById('authName');
    const expiry = document.getElementById('authExpiry');
    if (avatar) avatar.textContent = '?';
    if (name)   name.textContent   = '—';
    if (expiry) expiry.textContent = '';
}

// ── LOGIN ─────────────────────────────────────────────────
async function doLogin() {
    const user = document.getElementById('loginUser')?.value.trim();
    const pass = document.getElementById('loginPass')?.value;
    const btn  = document.getElementById('loginBtn');

    if (!user) { showMsg('loginMsg', 'Username is required', 'err'); return; }
    if (!pass) { showMsg('loginMsg', 'Password is required', 'err'); return; }

    btn.disabled = true;
    btn.classList.add('btn-loading');
    document.getElementById('loginMsg').style.display = 'none';

    try {
        const r = await bgMsg({ type: 'LOGIN', username: user, password: pass });
        if (r.success && r.loggedIn) {
            // Success flash on button
            btn.classList.remove('btn-loading');
            btn.style.background = 'linear-gradient(135deg,#059669,#34d399)';
            btn.querySelector('.btn-txt').textContent = '✓ Logged in!';
            btn.classList.add('login-success-flash');
            document.getElementById('loginPass').value = '';
            // Reset pass toggle
            const pi = document.getElementById('loginPass');
            const pt = document.getElementById('togglePass');
            if (pi) pi.type = 'password';
            if (pt) pt.textContent = '👁';
            setTimeout(() => {
                btn.style.background = '';
                refreshAuthState();
            }, 700);
        } else {
            btn.classList.remove('btn-loading');
            btn.querySelector('.btn-txt').textContent = 'Log In';
            // Shake animation on error
            btn.style.animation = 'nmShake .4s ease';
            setTimeout(() => btn.style.animation = '', 400);
            showMsg('loginMsg', r.error || 'Login failed', 'err');
        }
    } catch (e) {
        btn.classList.remove('btn-loading');
        btn.querySelector('.btn-txt').textContent = 'Log In';
        showMsg('loginMsg', e.message, 'err');
    } finally {
        btn.disabled = false;
    }
}

// ── LOGOUT ────────────────────────────────────────────────
async function doLogout() {
    try {
        await bgMsg({ type: 'LOGOUT' });
    } catch { /* ignore */ }
    showLoggedOut();
}

// ── SETTINGS ──────────────────────────────────────────────
function initSettings() {
    chrome.storage.sync.get(['backendUrl'], r => {
        const url = r.backendUrl || 'http://localhost:8080';
        document.getElementById('backendUrl').value = url;
        checkHealth(url);
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
        const url = document.getElementById('backendUrl').value.trim().replace(/\/$/, '');
        if (!url.startsWith('http')) {
            showMsg('saveMsg', 'Enter a valid URL starting with http://', 'err'); return;
        }
        chrome.storage.sync.set({ backendUrl: url }, () => {
            showMsg('saveMsg', 'Saved. Checking connection…', 'info');
            checkHealth(url);
        });
    });
}

async function checkHealth(url) {
    const dot = document.getElementById('sdot');
    const txt = document.getElementById('stxt');
    dot.className = 'pdot';
    txt.textContent = '…';
    try {
        const r = await fetch(`${url}/api/email/health`, { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
            dot.className = 'pdot on';
            txt.textContent = 'online';
            showMsg('saveMsg', 'Backend connected', 'ok');
        } else {
            throw new Error();
        }
    } catch {
        dot.className = 'pdot off';
        txt.textContent = 'offline';
        showMsg('saveMsg', 'Backend unreachable', 'err');
    }
}

// ── ENTER KEY ─────────────────────────────────────────────
function initEnterKey() {
    ['loginUser', 'loginPass'].forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', e => {
            if (e.key === 'Enter') doLogin();
        });
    });
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSettings();
    initEnterKey();
    refreshAuthState();

    document.getElementById('loginBtn')?.addEventListener('click', doLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
});