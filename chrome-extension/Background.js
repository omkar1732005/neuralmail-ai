/* NeuralMail v9 — background.js
   Architecture: YOUR Groq key on backend, users just sign up and use.
   No user API key needed. JWT protects all endpoints. */

// ── STORAGE ───────────────────────────────────────────────
function getUrl() {
    return new Promise(res =>
        chrome.storage.sync.get(['backendUrl'], r =>
            res((r.backendUrl || 'https://neuralmail-ai-production.up.railway.app').replace(/\/$/, ''))
        )
    );
}
function getToken()    { return new Promise(res => chrome.storage.local.get(['jwtToken'],       r => res(r.jwtToken||null))); }
function getCreds()    { return new Promise(res => chrome.storage.local.get(['nmUser','nmPass'], r => res({user:r.nmUser||null,pass:r.nmPass||null}))); }
function saveToken(t)  { return new Promise(res => chrome.storage.local.set({jwtToken:t}, res)); }
function clearToken()  { return new Promise(res => chrome.storage.local.remove(['jwtToken'], res)); }
function saveCreds(u,p){ return new Promise(res => chrome.storage.local.set({nmUser:u,nmPass:p}, res)); }
function clearAll()    { return new Promise(res => chrome.storage.local.remove(['jwtToken','nmUser','nmPass'], res)); }

// ── JWT EXPIRY ─────────────────────────────────────────────
function isExpired(token) {
    if (!token) return true;
    try {
        const p = JSON.parse(atob(token.split('.')[1]));
        return p.exp * 1000 < Date.now();
    } catch { return true; }
}

// ── LOGIN ─────────────────────────────────────────────────
async function doLogin(username, password) {
    const base = await getUrl();
    let resp;
    try {
        resp = await fetch(base + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    } catch(e) {
        throw new Error('Cannot reach backend — check Settings in popup');
    }
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Wrong username or password');
    await saveToken(json.token);
    await saveCreds(username, password);
    return json.token;
}

// ── ENSURE VALID TOKEN ────────────────────────────────────
async function ensureToken() {
    let t = await getToken();
    if (t && isExpired(t)) { await clearToken(); t = null; }
    if (t) return t;
    // Try silent re-login with saved credentials
    const creds = await getCreds();
    if (creds.user && creds.pass) {
        try { return await doLogin(creds.user, creds.pass); }
        catch(e) { console.warn('[NeuralMail] Auto re-login failed:', e.message); }
    }
    return null;
}

// ── POST TO BACKEND ───────────────────────────────────────
async function post(endpoint, payload) {
    const base  = await getUrl();
    const token = await ensureToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    async function doFetch(hdrs) {
        return fetch(base + '/api/email/' + endpoint, {
            method: 'POST', headers: hdrs, body: JSON.stringify(payload)
        });
    }

    let resp;
    try { resp = await doFetch(headers); }
    catch(e) { throw new Error('Cannot reach backend — is Spring Boot running?'); }

    // 401 — try re-login once
    if (resp.status === 401) {
        await clearToken();
        const creds = await getCreds();
        if (creds.user && creds.pass) {
            const fresh = await doLogin(creds.user, creds.pass);
            try {
                resp = await doFetch({
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + fresh
                });
            } catch(e) { throw new Error('Backend unreachable after re-login'); }
        } else {
            throw new Error('Please log in — click the extension icon');
        }
    }

    if (!resp.ok) {
        let errText = '';
        try { const j = await resp.json(); errText = j.error || j.message || ''; } catch{}
        throw new Error(errText || 'Backend error ' + resp.status);
    }

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Invalid response from backend'); }
    if (!data.success) throw new Error(data.error || 'Backend error');
    return data.result;
}

// ── MESSAGE HANDLER ───────────────────────────────────────
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    (async () => {
        try {
            let out = {};
            const { type, emailContent, tone, replyLength, customPrompt, username, password } = msg;

            if (type === 'LOGIN') {
                const t = await doLogin(username, password);
                out = { loggedIn: true, token: t };

            } else if (type === 'LOGOUT') {
                await clearAll();
                out = { loggedOut: true };

            } else if (type === 'CHECK_AUTH') {
                const token = await getToken();
                if (!token || isExpired(token)) {
                    if (token) await clearToken();
                    const c = await getCreds();
                    out = { authenticated: false, hasCreds: !!(c.user && c.pass), savedUser: c.user };
                } else {
                    const base = await getUrl();
                    try {
                        const vr = await fetch(base + '/api/auth/validate', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (vr.ok) {
                            const vd = await vr.json();
                            out = { authenticated: true, username: vd.username,
                                    email: vd.email, requestsToday: vd.requestsToday,
                                    remainingMs: vd.remainingMs };
                        } else {
                            await clearToken();
                            out = { authenticated: false };
                        }
                    } catch {
                        out = { authenticated: true }; // offline — assume ok
                    }
                }

            } else if (type === 'GENERATE_REPLY') {
                out.aiReply = await post('reply', {
                    emailContent, tone: tone||'professional',
                    replyLength: replyLength||'medium', customPrompt: customPrompt||''
                });
                try { out.humanScore = await post('humanscore', { emailContent: out.aiReply }); } catch{}

            } else if (type === 'FOLLOWUP_EMAIL') {
                out.aiReply = await post('followup', { emailContent, tone: tone||'professional', customPrompt: customPrompt||'' });

            } else if (type === 'GENERATE_VARIATIONS') {
                const [f, fr, c] = await Promise.all([
                    post('reply', { emailContent, tone:'formal',       replyLength:'short', customPrompt:customPrompt||'' }),
                    post('reply', { emailContent, tone:'friendly',     replyLength:'short', customPrompt:customPrompt||'' }),
                    post('reply', { emailContent, tone:'professional', replyLength:'short', customPrompt:customPrompt||'' }),
                ]);
                out.variations = [f, fr, c];

            } else if (type === 'REWRITE_EMAIL')  { out.result = await post('rewrite',  { emailContent, tone: tone||'professional' }); }
            else if (type === 'IMPROVE_EMAIL')     { out.result = await post('improve',   { emailContent }); }
            else if (type === 'SUMMARIZE_EMAIL')   { out.result = await post('summarize', { emailContent }); }
            else { throw new Error('Unknown message type: ' + type); }

            sendResponse({ success: true, ...out });
        } catch(err) {
            console.error('[NeuralMail]', err.message);
            sendResponse({ success: false, error: err.message });
        }
    })();
    return true;
});