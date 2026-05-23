/* NeuralMail AI — Research Edition
   No JWT | Device ID | Dual Reply | Intent Detection | Explainability */

const BACKEND_URL = 'https://neuralmail-ai.onrender.com';

async function getDeviceId() {
    return new Promise(res => {
        chrome.storage.local.get(['nmDeviceId'], r => {
            if (r.nmDeviceId) { res(r.nmDeviceId); return; }
            const id = 'nm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
            chrome.storage.local.set({ nmDeviceId: id }, () => res(id));
        });
    });
}

async function getUrl() {
    return new Promise(res =>
        chrome.storage.sync.get(['backendUrl'], r =>
            res((r.backendUrl || BACKEND_URL).replace(/\/$/, ''))
        )
    );
}

async function post(endpoint, payload) {
    const base     = await getUrl();
    const deviceId = await getDeviceId();
    const body     = JSON.stringify({ ...payload, deviceId });
    let resp;
    try {
        resp = await fetch(base + '/api/email/' + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
    } catch (e) {
        throw new Error('Cannot reach server — wait 30 seconds and retry.');
    }
    if (!resp.ok) {
        let err = '';
        try { const j = await resp.json(); err = j.error || j.message || ''; } catch {}
        throw new Error(err || 'Backend error ' + resp.status);
    }
    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Backend error');
    return data;
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    (async () => {
        try {
            let out = {};
            const { type, emailContent, threadContext, tone,
                    replyLength, customPrompt, intentMode } = msg;

            if (type === 'GET_DEVICE_ID') {
                out = { deviceId: await getDeviceId() };

            } else if (type === 'DUAL_REPLY') {
                const data = await post('dual-reply', {
                    emailContent, threadContext: threadContext || '',
                    tone: tone || 'professional',
                    replyLength: replyLength || 'medium',
                    customPrompt: customPrompt || ''
                });
                out.intent        = data.intent;
                out.intentReason  = data.intentReason;
                out.keywordsFound = data.keywordsFound;
                out.promptUsed    = data.promptUsed;
                out.baselineReply = data.baselineReply;
                out.proposedReply = data.proposedReply;

            } else if (type === 'GENERATE_REPLY') {
                const data = await post('reply', {
                    emailContent, threadContext: threadContext || '',
                    tone: tone || 'professional',
                    replyLength: replyLength || 'medium',
                    customPrompt: customPrompt || '',
                    intentMode: intentMode || 'proposed'
                });
                out.aiReply       = data.result;
                out.intent        = data.intent;
                out.intentMode    = data.intentMode;
                out.intentReason  = data.intentReason;
                out.keywordsFound = data.keywordsFound;
                out.promptUsed    = data.promptUsed;

            } else if (type === 'FOLLOWUP_EMAIL') {
                const data = await post('followup', {
                    emailContent, tone: tone || 'professional', customPrompt: customPrompt || ''
                });
                out.aiReply = data.result;

            } else if (type === 'GENERATE_VARIATIONS') {
                const [f, fr, c] = await Promise.all([
                    post('reply', { emailContent, tone: 'formal',       replyLength: 'medium', intentMode: 'proposed' }),
                    post('reply', { emailContent, tone: 'friendly',     replyLength: 'medium', intentMode: 'proposed' }),
                    post('reply', { emailContent, tone: 'professional', replyLength: 'short',  intentMode: 'proposed' }),
                ]);
                out.variations = [f.result, fr.result, c.result];
                out.intent = f.intent;

            } else if (type === 'REWRITE_EMAIL') {
                const data = await post('rewrite', { emailContent, tone: tone || 'professional' });
                out.result = data.result;

            } else if (type === 'IMPROVE_EMAIL') {
                const data = await post('improve', { emailContent });
                out.result = data.result;

            } else if (type === 'SUMMARIZE_EMAIL') {
                const data = await post('summarize', { emailContent });
                out.result = data.result;

            } else {
                throw new Error('Unknown message type: ' + type);
            }

            sendResponse({ success: true, ...out });
        } catch (err) {
            console.error('[NeuralMail]', err.message);
            sendResponse({ success: false, error: err.message });
        }
    })();
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('[NeuralMail Research] Installed — No auth, device ID rate limiting');
});