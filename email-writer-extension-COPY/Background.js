/* NeuralMail v9 — background.js FIXED
   Fix: JWT expiry detection, force re-login on 401, clear stale tokens */

// ─── STORAGE ──────────────────────────────────────────────
function getUrl() {
    return new Promise(function(res) {
        chrome.storage.sync.get(['backendUrl'], function(r) {
            res((r.backendUrl || 'http://localhost:8080').replace(/\/$/, ''));
        });
    });
}
function getToken()  { return new Promise(function(res){ chrome.storage.local.get(['jwtToken'],      function(r){ res(r.jwtToken      || null); }); }); }
function getCreds()  { return new Promise(function(res){ chrome.storage.local.get(['nmUser','nmPass'],function(r){ res({user:r.nmUser||null,pass:r.nmPass||null}); }); }); }
function saveToken(t){ return new Promise(function(res){ chrome.storage.local.set({jwtToken:t},res); }); }
function clearToken(){ return new Promise(function(res){ chrome.storage.local.remove(['jwtToken'],res); }); }
function saveCreds(u,p){ return new Promise(function(res){ chrome.storage.local.set({nmUser:u,nmPass:p},res); }); }
function clearAll()  { return new Promise(function(res){ chrome.storage.local.remove(['jwtToken','nmUser','nmPass'],res); }); }

// ─── JWT EXPIRY CHECK (client-side) ───────────────────────
function isTokenExpired(token) {
    if (!token) return true;
    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        // exp is in seconds, Date.now() in ms
        return (payload.exp * 1000) < Date.now();
    } catch(e) {
        return true; // treat as expired if unreadable
    }
}

// ─── LOGIN ────────────────────────────────────────────────
async function doLogin(username, password) {
    var base = await getUrl();
    var resp;
    try {
        resp = await fetch(base + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
    } catch(e) {
        throw new Error('Cannot reach backend. Is Spring Boot running on port 8080?');
    }
    var json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Wrong username or password.');
    await saveToken(json.token);
    await saveCreds(username, password);
    return json.token;
}

// ─── ENSURE FRESH TOKEN ────────────────────────────────────
async function ensureToken() {
    var t = await getToken();

    // Client-side expiry check — don't even try expired tokens
    if (t && isTokenExpired(t)) {
        console.log('[NeuralMail] Token expired client-side, clearing...');
        await clearToken();
        t = null;
    }

    if (t) return t;

    // Silent re-login with saved credentials
    var creds = await getCreds();
    if (creds.user && creds.pass) {
        try {
            console.log('[NeuralMail] Auto re-login for:', creds.user);
            return await doLogin(creds.user, creds.pass);
        } catch(e) {
            console.error('[NeuralMail] Auto re-login failed:', e.message);
        }
    }
    return null; // no token, no creds — proceed without auth
}

// ─── AUTHENTICATED POST ────────────────────────────────────
async function post(endpoint, payload) {
    var base  = await getUrl();
    var token = await ensureToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    async function fetchIt(hdrs) {
        return fetch(base + '/api/email/' + endpoint, {
            method: 'POST', headers: hdrs, body: JSON.stringify(payload)
        });
    }

    var resp;
    try { resp = await fetchIt(headers); }
    catch(e) { throw new Error('Cannot reach backend. Is Spring Boot running on port 8080?'); }

    // 401 — token rejected, force re-login and retry ONCE
    if (resp.status === 401) {
        console.log('[NeuralMail] Got 401, clearing token and re-logging in...');
        await clearToken();
        var creds = await getCreds();
        if (creds.user && creds.pass) {
            try {
                var fresh = await doLogin(creds.user, creds.pass);
                var retryHdrs = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + fresh };
                try { resp = await fetchIt(retryHdrs); }
                catch(e) { throw new Error('Backend unreachable after re-login.'); }
            } catch(e) {
                throw new Error('Session expired. Open extension popup and log in again.');
            }
        } else {
            throw new Error('Please log in: click the extension icon in Chrome toolbar.');
        }
    }

    if (!resp.ok) {
        var errText = '';
        try { var j = await resp.json(); errText = j.error || j.message || ''; } catch(e){}
        throw new Error(errText || 'Backend error HTTP ' + resp.status);
    }

    var text = await resp.text();
    var data;
    try { data = JSON.parse(text); } catch(e) { throw new Error('Invalid JSON from backend.'); }
    if (!data.success) throw new Error(data.error || 'Backend error.');
    return data.result;
}

// ─── MESSAGE HANDLER ──────────────────────────────────────
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    var type=msg.type, emailContent=msg.emailContent,
        tone=msg.tone||'professional', replyLength=msg.replyLength||'medium',
        customPrompt=msg.customPrompt||'', username=msg.username, password=msg.password;

    (async function() {
        try {
            var out = {};

            if (type === 'LOGIN') {
                var t = await doLogin(username, password);
                out = { loggedIn: true, token: t };

            } else if (type === 'LOGOUT') {
                await clearAll();
                out = { loggedOut: true };

            } else if (type === 'CHECK_AUTH') {
                var token = await getToken();
                var expired = isTokenExpired(token);
                if (!token || expired) {
                    if (expired && token) await clearToken();
                    var c = await getCreds();
                    out = { authenticated: false, hasSavedCreds: !!(c.user && c.pass), savedUser: c.user };
                } else {
                    var base = await getUrl();
                    try {
                        var vr = await fetch(base + '/api/auth/validate', {
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (vr.ok) {
                            var vd = await vr.json();
                            out = { authenticated: true, username: vd.username, remainingMs: vd.remainingMs };
                        } else {
                            await clearToken();
                            var c2 = await getCreds();
                            out = { authenticated: false, hasSavedCreds: !!(c2.user && c2.pass), savedUser: c2.user };
                        }
                    } catch(e) {
                        out = { authenticated: true }; // offline assumption
                    }
                }

            } else if (type === 'GENERATE_REPLY') {
                out.aiReply = await post('reply', { emailContent, tone, replyLength, customPrompt });
                try { out.humanScore = await post('humanscore', { emailContent: out.aiReply }); } catch(e){}

            } else if (type === 'FOLLOWUP_EMAIL') {
                out.aiReply = await post('followup', { emailContent, tone, customPrompt });

            } else if (type === 'GENERATE_VARIATIONS') {
                var [f,fr,c] = await Promise.all([
                    post('reply',{emailContent,tone:'formal',      replyLength:'short',customPrompt}),
                    post('reply',{emailContent,tone:'friendly',    replyLength:'short',customPrompt}),
                    post('reply',{emailContent,tone:'professional',replyLength:'short',customPrompt}),
                ]);
                out.variations = [f, fr, c];

            } else if (type === 'REWRITE_EMAIL') {
                out.result = await post('rewrite', { emailContent, tone });
            } else if (type === 'IMPROVE_EMAIL') {
                out.result = await post('improve', { emailContent });
            } else if (type === 'SUMMARIZE_EMAIL') {
                out.result = await post('summarize', { emailContent });
            } else {
                throw new Error('Unknown type: ' + type);
            }

            sendResponse({ success: true, ...out });
        } catch(err) {
            console.error('[NeuralMail]', err.message);
            sendResponse({ success: false, error: err.message });
        }
    })();
    return true;
});