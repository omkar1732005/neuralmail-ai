/* ═══════════════════════════════════════════════════════
   NeuralMail v10 — LEGENDARY UI
   Glassmorphism · Fluid animations · Award-winning design
═══════════════════════════════════════════════════════ */

function getEmailContent() {
    var sels = ['.h7', '.a3s.aiL', '.gmail_quote', '[data-message-id]', '.gs'];
    for (var i = 0; i < sels.length; i++) {
        var el = document.querySelector(sels[i]);
        if (el && el.innerText && el.innerText.trim().length > 10) return el.innerText.trim();
    }
    var main = document.querySelector('.AO') || document.querySelector('[role="main"]');
    return (main && main.innerText && main.innerText.trim().length > 10) ? main.innerText.trim() : null;
}
function getComposeBox() {
    var boxes = document.querySelectorAll('div[aria-label="Message Body"]');
    for (var i = 0; i < boxes.length; i++)
        if (boxes[i].offsetParent && boxes[i].isContentEditable) return boxes[i];
    return null;
}
function insertCompose(text) {
    var b = getComposeBox();
    if (!b) return false;
    b.focus(); b.innerText = text;
    b.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}
function callBg(msg) {
    return new Promise(function(res, rej) {
        try {
            if (!chrome || !chrome.runtime || !chrome.runtime.id)
                return rej(new Error('Extension disconnected — refresh Gmail'));
            chrome.runtime.sendMessage(msg, function(r) {
                if (chrome.runtime.lastError) return rej(new Error(chrome.runtime.lastError.message));
                if (!r) return rej(new Error('No response from background'));
                if (!r.success) return rej(new Error(r.error || 'Request failed'));
                res(r);
            });
        } catch(e) { rej(e); }
    });
}

function detectIntent(text) {
    if (!text) return { label:'General', color:'#94a3b8', glow:'rgba(148,163,184,.3)', emoji:'✉️', tone:'professional', length:'medium' };
    var t = text.toLowerCase();
    var wordCount = text.split(/\s+/).length;

    // Auto-detect length from email length
    var autoLength = wordCount < 60 ? 'short' : wordCount > 300 ? 'long' : 'medium';

    if (t.match(/interview|resume|cv|hiring|job|apply/))
        return { label:'Job',       color:'#818cf8', glow:'rgba(129,140,248,.3)', emoji:'💼', tone:'formal',        length:autoLength };
    if (t.match(/complain|issue|problem|broken|frustrat|disappoint/))
        return { label:'Complaint', color:'#f87171', glow:'rgba(248,113,113,.3)', emoji:'⚠️', tone:'apology',       length:'medium'   };
    if (t.match(/meeting|schedule|call|sync|discuss|available/))
        return { label:'Meeting',   color:'#34d399', glow:'rgba(52,211,153,.3)',  emoji:'📅', tone:'professional',  length:autoLength };
    if (t.match(/invoice|payment|paid|due|billing|amount/))
        return { label:'Finance',   color:'#fbbf24', glow:'rgba(251,191,36,.3)',  emoji:'💰', tone:'formal',        length:'short'    };
    if (t.match(/follow.?up|checking|any update|waiting/))
        return { label:'Follow-Up', color:'#60a5fa', glow:'rgba(96,165,250,.3)',  emoji:'🔄', tone:'friendly',      length:'short'    };
    if (t.match(/urgent|asap|immediately|critical|emergency/))
        return { label:'Urgent',    color:'#fb923c', glow:'rgba(251,146,60,.3)',  emoji:'🔥', tone:'assertive',     length:'short'    };
    if (t.match(/sbi|bank|account|statement|transaction/))
        return { label:'Banking',   color:'#fbbf24', glow:'rgba(251,191,36,.3)',  emoji:'🏦', tone:'formal',        length:'medium'   };
    if (t.match(/hi |hey |hello |dear |how are/))
        return { label:'Casual',    color:'#a78bfa', glow:'rgba(167,139,250,.3)', emoji:'👋', tone:'friendly',      length:'short'    };
    if (t.match(/proposal|partnership|collaborat|opportu/))
        return { label:'Proposal',  color:'#2dd4bf', glow:'rgba(45,212,191,.3)',  emoji:'🤝', tone:'executive',     length:'medium'   };
    return { label:'General', color:'#94a3b8', glow:'rgba(148,163,184,.3)', emoji:'✉️', tone:'professional', length:autoLength };
}

/* ─── STYLES ─────────────────────────────────────────── */
function injectStyles() {
    if (document.getElementById('nm10')) return;
    var s = document.createElement('style');
    s.id = 'nm10';
    s.textContent = `
/* ══ FAB ══ */
.nm-wrap { display:inline-flex; align-items:center; margin-left:8px; }
.nm-fab {
    width:34px; height:34px; border:none; cursor:pointer; border-radius:10px;
    position:relative; overflow:hidden; flex-shrink:0;
    transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.nm-fab-bg {
    position:absolute; inset:0;
    background:conic-gradient(from 0deg at 50% 50%,
        #6366f1 0%, #8b5cf6 25%, #ec4899 50%, #f59e0b 75%, #6366f1 100%);
    animation:nmFabSpin 3s linear infinite;
}
.nm-fab-inner {
    position:absolute; inset:2px; border-radius:8px;
    background:linear-gradient(135deg,#0f0f20,#1a1a35);
    display:flex; align-items:center; justify-content:center;
    transition:background .2s;
}
.nm-fab:hover { transform:scale(1.15) rotate(-5deg); }
.nm-fab:hover .nm-fab-bg { animation-duration:1s; }
.nm-fab:active { transform:scale(.93); }
.nm-fab.busy .nm-fab-inner::after {
    content:''; position:absolute; width:14px; height:14px;
    border:2px solid rgba(255,255,255,.2); border-top-color:#fff;
    border-radius:50%; animation:nmSpin .6s linear infinite;
}
.nm-fab.busy svg { opacity:0; }
@keyframes nmFabSpin { to { transform:rotate(360deg); } }
@keyframes nmSpin    { to { transform:rotate(360deg); } }

/* ══ PANEL ══ */
.nm-panel {
    position:fixed; width:368px; z-index:2147483647;
    font-family:-apple-system,'Segoe UI','Inter',sans-serif;
    border-radius:24px; overflow:hidden;
    animation:nmIn .4s cubic-bezier(.22,1,.36,1) both;
}
@keyframes nmIn {
    from { opacity:0; transform:translateY(20px) scale(.92); filter:blur(8px); }
    to   { opacity:1; transform:none; filter:blur(0); }
}
@keyframes nmOut {
    from { opacity:1; transform:none; filter:blur(0); }
    to   { opacity:0; transform:translateY(12px) scale(.94); filter:blur(4px); }
}

/* glass bg */
.nm-glass {
    position:absolute; inset:0; border-radius:24px;
    background:rgba(8,8,20,.88);
    backdrop-filter:blur(40px) saturate(180%);
    -webkit-backdrop-filter:blur(40px) saturate(180%);
}
.nm-glass-mesh {
    position:absolute; inset:-80%; width:260%; height:260%;
    background:
        radial-gradient(ellipse 50% 40% at 15% 15%, rgba(99,102,241,.18) 0%, transparent 55%),
        radial-gradient(ellipse 40% 50% at 85% 85%, rgba(168,85,247,.14) 0%, transparent 55%),
        radial-gradient(ellipse 35% 35% at 70% 20%, rgba(236,72,153,.10) 0%, transparent 50%),
        radial-gradient(ellipse 30% 40% at 30% 80%, rgba(245,158,11,.08) 0%, transparent 50%);
    animation:nmMesh 16s ease-in-out infinite alternate;
}
@keyframes nmMesh {
    0%   { transform:translate(0,0) scale(1); }
    50%  { transform:translate(2%,3%) scale(1.02); }
    100% { transform:translate(-1%,1%) scale(.99); }
}
.nm-glass-border {
    position:absolute; inset:0; border-radius:24px;
    border:1px solid rgba(255,255,255,.09); pointer-events:none;
}
.nm-glass-sheen {
    position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
    animation:nmSheen 6s ease-in-out infinite 2s;
}
@keyframes nmSheen { 0%{opacity:0} 50%{opacity:1} 100%{opacity:0} }

.nm-body {
    position:relative; z-index:2;
    max-height:88vh; overflow-y:auto;
}
.nm-body::-webkit-scrollbar { width:2px; }
.nm-body::-webkit-scrollbar-thumb { background:rgba(99,102,241,.4); border-radius:99px; }

/* ══ HEADER ══ */
.nm-head {
    padding:15px 16px 13px;
    border-bottom:1px solid rgba(255,255,255,.06);
    display:flex; align-items:center; gap:10px;
    cursor:grab; user-select:none;
}
.nm-head:active { cursor:grabbing; }
.nm-logo {
    width:32px; height:32px; border-radius:9px;
    position:relative; overflow:hidden; flex-shrink:0;
}
.nm-logo-ring {
    position:absolute; inset:0; border-radius:9px;
    background:conic-gradient(from 0deg,#6366f1,#8b5cf6,#ec4899,#6366f1);
    animation:nmFabSpin 4s linear infinite;
}
.nm-logo-core {
    position:absolute; inset:1.5px; border-radius:7.5px;
    background:#10102a; display:flex; align-items:center; justify-content:center;
}
.nm-logo-core svg { width:13px; height:13px; }
.nm-title {
    font-size:12.5px; font-weight:800; color:#fff; letter-spacing:-.3px;
    background:linear-gradient(135deg,#fff 30%,rgba(165,180,252,.8));
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
}
.nm-sub { font-size:8.5px; color:rgba(255,255,255,.25); font-family:'Courier New',Consolas,monospace; margin-top:1px; }
.nm-badge {
    display:flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:20px;
    font-size:9.5px; font-weight:700; letter-spacing:.2px;
    font-family:'Courier New',Consolas,monospace; border:1px solid; flex-shrink:0;
    transition:box-shadow .3s;
}
.nm-x {
    width:24px; height:24px; border-radius:7px; border:none; cursor:pointer; margin-left:auto;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07);
    color:rgba(255,255,255,.3); font-size:11px;
    display:flex; align-items:center; justify-content:center;
    transition:all .18s; flex-shrink:0;
}
.nm-x:hover { background:rgba(248,113,113,.15); color:#f87171; border-color:rgba(248,113,113,.3); transform:rotate(90deg) scale(1.1); }

/* ══ GENERATE BUTTON ══ */
.nm-gen {
    margin:12px 14px 0; width:calc(100% - 28px);
    display:flex; align-items:center; gap:12px;
    padding:14px 16px; border:none; border-radius:16px;
    cursor:pointer; position:relative; overflow:hidden;
    font-family:-apple-system,'Segoe UI',sans-serif;
    transition:transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
}
.nm-gen-bg {
    position:absolute; inset:0;
    background:linear-gradient(135deg,#3730a3,#5b21b6,#7c3aed,#a21caf);
    background-size:300%; animation:nmGenGrad 6s ease infinite;
}
@keyframes nmGenGrad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
.nm-gen-sheen {
    position:absolute; inset:0;
    background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.08) 50%,transparent 60%);
    animation:nmGenSheen 3s ease-in-out infinite;
}
@keyframes nmGenSheen { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
.nm-gen-border {
    position:absolute; inset:0; border-radius:16px;
    border:1px solid rgba(255,255,255,.2); pointer-events:none;
}
.nm-gen-ic {
    position:relative; z-index:1; width:30px; height:30px; border-radius:9px;
    background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.2);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.nm-gen-ic svg { width:15px; height:15px; }
.nm-gen-copy { position:relative; z-index:1; flex:1; text-align:left; }
.nm-gen-title { font-size:13.5px; font-weight:900; color:#fff; display:block; letter-spacing:-.3px; }
.nm-gen-hint  { font-size:9px; color:rgba(255,255,255,.5); display:block; margin-top:2px; font-weight:500; }
.nm-gen-arr   { position:relative; z-index:1; color:rgba(255,255,255,.5); font-size:16px; transition:transform .2s; }
.nm-gen:hover { transform:translateY(-2px) scale(1.01); box-shadow:0 16px 48px rgba(99,102,241,.6); }
.nm-gen:hover .nm-gen-arr { transform:translateX(3px); }
.nm-gen:active { transform:scale(.98); }

/* ══ ACTION GRID ══ */
.nm-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:8px 14px 0; }
.nm-btn {
    display:flex; align-items:center; gap:9px; padding:10px 12px;
    border-radius:12px; border:none; cursor:pointer;
    font-family:-apple-system,'Segoe UI',sans-serif; position:relative; overflow:hidden;
    background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
    transition:transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .2s, background .15s;
}
.nm-btn-glow {
    position:absolute; inset:-1px; border-radius:13px; opacity:0;
    transition:opacity .2s;
}
.nm-btn:hover .nm-btn-glow { opacity:1; }
.nm-btn:hover {
    transform:translateY(-2px) scale(1.01);
    background:rgba(255,255,255,.07);
    border-color:rgba(255,255,255,.14);
    box-shadow:0 8px 28px rgba(0,0,0,.4);
}
.nm-btn:active { transform:scale(.97); }
.nm-btn-ic {
    width:26px; height:26px; border-radius:8px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.1);
    transition:transform .2s, box-shadow .2s;
}
.nm-btn:hover .nm-btn-ic { transform:scale(1.12); }
.nm-btn-ic svg { width:12px; height:12px; }
.nm-btn-label { font-size:11.5px; font-weight:700; color:rgba(255,255,255,.88); display:block; }
.nm-btn-hint  { font-size:8.5px; color:rgba(255,255,255,.28); font-family:'Courier New',Consolas,monospace; }
.nm-btn-full { grid-column:span 2; }

/* ══ CONTROLS ══ */
.nm-ctrl-row { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:8px 14px 0; }
.nm-ctrl { position:relative; }
.nm-ctrl-lbl {
    position:absolute; top:-7px; left:9px; z-index:3;
    font-size:7.5px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;
    color:rgba(255,255,255,.25); background:#08081a; padding:0 4px;
    font-family:'Courier New',Consolas,monospace; display:flex; align-items:center; gap:4px;
}
.nm-auto-badge {
    font-size:6.5px; font-weight:800; letter-spacing:.8px; text-transform:uppercase;
    color:#34d399; background:rgba(52,211,153,.12); border:1px solid rgba(52,211,153,.3);
    padding:1px 4px; border-radius:4px;
}
.nm-sel {
    width:100%; padding:9px 10px; appearance:none; -webkit-appearance:none;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
    border-radius:10px; color:rgba(255,255,255,.82);
    font-family:-apple-system,'Segoe UI',sans-serif; font-size:11px; font-weight:600;
    cursor:pointer; outline:none; transition:all .18s;
}
.nm-sel:focus { background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.5); box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.nm-sel option { background:#0d0d20; color:#fff; }

/* ══ PROMPT SECTION ══ */
.nm-prompt { padding:8px 14px 0; }
.nm-pbox {
    border-radius:13px; overflow:hidden;
    background:rgba(99,102,241,.04);
    border:1.5px solid rgba(99,102,241,.28);
    box-shadow:0 0 0 1px rgba(99,102,241,.08), inset 0 1px 0 rgba(255,255,255,.04);
    transition:border-color .2s, box-shadow .2s;
    position:relative;
}
.nm-pbox::before {
    content:''; position:absolute; inset:0; border-radius:13px; pointer-events:none;
    background:linear-gradient(135deg,rgba(99,102,241,.06) 0%,transparent 60%);
}
.nm-pbox:focus-within {
    border-color:rgba(99,102,241,.7);
    box-shadow:0 0 0 3px rgba(99,102,241,.15), 0 0 20px rgba(99,102,241,.12);
}
.nm-ptop {
    display:flex; align-items:center; justify-content:space-between;
    padding:8px 12px 0;
}
.nm-plbl { font-size:7.5px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,.2); font-family:'Courier New',Consolas,monospace; }
.nm-pclr { font-size:9px; color:rgba(255,255,255,.18); background:none; border:none; cursor:pointer; font-family:'Courier New',Consolas,monospace; transition:color .15s; padding:0; }
.nm-pclr:hover { color:rgba(255,255,255,.6); }
.nm-pinput {
    width:100%; padding:7px 12px 8px; box-sizing:border-box;
    background:transparent; border:none; outline:none;
    color:rgba(255,255,255,.9); font-family:-apple-system,'Segoe UI',sans-serif;
    font-size:12px; font-weight:500; resize:none; line-height:1.5;
}
.nm-pinput::placeholder { color:rgba(255,255,255,.18); }
.nm-chips { display:flex; flex-wrap:wrap; gap:5px; padding:0 10px 10px; }

/* chip types */
.nm-chip {
    padding:4px 11px; border-radius:20px; border:none; cursor:pointer;
    font-family:-apple-system,'Segoe UI',sans-serif; font-size:9.5px; font-weight:700;
    transition:all .15s; letter-spacing:.1px; position:relative;
}
.nm-chip-blue   { background:rgba(99,102,241,.1);  border:1px solid rgba(99,102,241,.22); color:rgba(165,180,252,.85); }
.nm-chip-blue:hover   { background:rgba(99,102,241,.25); border-color:rgba(99,102,241,.55); color:#fff; transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }
.nm-chip-gold   { background:rgba(245,158,11,.1);  border:1px solid rgba(245,158,11,.3);  color:rgba(253,230,138,.9); }
.nm-chip-gold:hover   { background:rgba(245,158,11,.22); border-color:rgba(245,158,11,.6); color:#fff; transform:translateY(-1px); box-shadow:0 4px 12px rgba(245,158,11,.25); }
.nm-chip-green  { background:rgba(52,211,153,.08); border:1px solid rgba(52,211,153,.25); color:rgba(110,231,183,.85); }
.nm-chip-green:hover  { background:rgba(52,211,153,.2);  border-color:rgba(52,211,153,.55); color:#fff; transform:translateY(-1px); box-shadow:0 4px 12px rgba(52,211,153,.2); }
.nm-chip:active { transform:scale(.95); }
.nm-chip.lit { box-shadow:0 0 14px; filter:brightness(1.2); }

/* ══ RESULTS ══ */
.nm-result {
    margin:10px 14px 0; border-radius:14px; display:none;
    border:1px solid rgba(255,255,255,.07);
    background:rgba(255,255,255,.025);
    overflow:hidden; animation:nmFadeUp .3s cubic-bezier(.22,1,.36,1) both;
}
@keyframes nmFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
.nm-rhead {
    padding:9px 14px 0; font-size:8px; font-weight:800;
    letter-spacing:1.4px; text-transform:uppercase;
    color:rgba(255,255,255,.2); font-family:'Courier New',Consolas,monospace;
    display:flex; align-items:center; gap:8px;
}
.nm-rhead::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.05); }

/* score */
.nm-score-body { padding:11px 14px 13px; }
.nm-score-row  { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:9px; }
.nm-score-num  { font-size:38px; font-weight:900; line-height:1; letter-spacing:-2px; }
.nm-score-r    { text-align:right; padding-bottom:2px; }
.nm-score-tag  { font-size:12px; font-weight:800; display:block; }
.nm-score-note { font-size:9px; color:rgba(255,255,255,.28); font-family:'Courier New',Consolas,monospace; margin-top:2px; }
.nm-score-bar  { height:5px; background:rgba(255,255,255,.07); border-radius:99px; overflow:hidden; }
.nm-score-fill { height:100%; border-radius:99px; width:0%; transition:width 1.4s cubic-bezier(.4,0,.2,1); }

/* summary */
.nm-sum-body { padding:10px 14px 13px; font-size:12px; color:rgba(255,255,255,.6); line-height:1.8; }

/* variations */
.nm-var-list { padding:8px 12px 12px; display:flex; flex-direction:column; gap:5px; }
.nm-var-item {
    padding:10px 12px; border-radius:11px;
    border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.025);
    cursor:pointer; transition:all .18s; position:relative; overflow:hidden;
}
.nm-var-item::before {
    content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
    background:rgba(99,102,241,.2); transition:all .2s;
}
.nm-var-item:hover { background:rgba(255,255,255,.055); border-color:rgba(255,255,255,.13); }
.nm-var-item:hover::before { background:rgba(99,102,241,.6); box-shadow:0 0 8px rgba(99,102,241,.4); }
.nm-var-item.sel { border-color:rgba(99,102,241,.4); background:rgba(99,102,241,.07); }
.nm-var-item.sel::before { background:#6366f1; box-shadow:0 0 12px rgba(99,102,241,.5); }
.nm-var-tag { font-size:8.5px; font-weight:800; text-transform:uppercase; letter-spacing:.8px; color:rgba(255,255,255,.25); font-family:'Courier New',Consolas,monospace; margin-bottom:4px; }
.nm-var-txt { font-size:11px; color:rgba(255,255,255,.55); line-height:1.6; }
.nm-var-use {
    display:none; margin-top:8px; width:100%; padding:8px; border:none; border-radius:8px;
    background:linear-gradient(135deg,#3730a3,#6d28d9); color:#fff;
    font-family:-apple-system,'Segoe UI',sans-serif; font-size:12px; font-weight:700;
    cursor:pointer; transition:all .15s;
}
.nm-var-use:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,.4); }
.nm-var-item.sel .nm-var-use { display:block; }

/* ══ FOOTER ══ */
.nm-foot {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px 14px; margin-top:2px;
}
.nm-regen {
    font-size:10px; font-weight:700; letter-spacing:.4px;
    color:rgba(255,255,255,.22); background:none; cursor:pointer;
    border:1px solid rgba(255,255,255,.07); border-radius:8px;
    padding:6px 12px; font-family:-apple-system,'Segoe UI',sans-serif; transition:all .15s;
}
.nm-regen:hover { color:rgba(255,255,255,.7); background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.15); }
.nm-foot-tag { font-size:8.5px; color:rgba(255,255,255,.1); font-family:'Courier New',Consolas,monospace; }

/* ══ SEND NAMES MODAL ══ */
.nm-overlay {
    position:fixed; inset:0; z-index:2147483648;
    background:rgba(0,0,0,.75); backdrop-filter:blur(8px);
    display:flex; align-items:center; justify-content:center;
    animation:nmFadeIn .2s ease both;
}
@keyframes nmFadeIn { from{opacity:0} to{opacity:1} }
.nm-modal {
    width:360px; border-radius:22px;
    background:rgba(10,10,24,.95);
    border:1px solid rgba(255,255,255,.1);
    box-shadow:0 0 0 1px rgba(99,102,241,.15), 0 40px 100px rgba(0,0,0,.8);
    backdrop-filter:blur(40px);
    animation:nmIn .3s cubic-bezier(.22,1,.36,1) both;
    overflow:hidden;
}
.nm-modal-head {
    padding:20px 20px 16px; display:flex; align-items:center; gap:13px;
    border-bottom:1px solid rgba(255,255,255,.07);
    background:linear-gradient(135deg,rgba(99,102,241,.08),transparent);
}
.nm-modal-icon {
    width:40px; height:40px; border-radius:12px; flex-shrink:0; font-size:18px;
    background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(234,179,8,.08));
    border:1px solid rgba(245,158,11,.3);
    display:flex; align-items:center; justify-content:center;
}
.nm-modal-title { font-size:15px; font-weight:800; color:#fff; letter-spacing:-.3px; }
.nm-modal-sub   { font-size:10px; color:rgba(255,255,255,.3); margin-top:2px; font-family:'Courier New',Consolas,monospace; }
.nm-modal-close {
    margin-left:auto; width:26px; height:26px; border-radius:8px;
    border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.04);
    color:rgba(255,255,255,.3); font-size:11px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:all .15s;
}
.nm-modal-close:hover { background:rgba(248,113,113,.15); color:#f87171; }
.nm-modal-body { padding:18px 20px; }
.nm-modal-desc { font-size:12px; color:rgba(255,255,255,.45); line-height:1.65; margin-bottom:14px; }
.nm-names-ta {
    width:100%; padding:11px 13px; box-sizing:border-box;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.11);
    border-radius:11px; color:#fff; font-family:-apple-system,'Segoe UI',sans-serif;
    font-size:12.5px; font-weight:500; outline:none;
    min-height:72px; resize:none; line-height:1.6; transition:all .18s;
}
.nm-names-ta:focus {
    border-color:rgba(245,158,11,.5); background:rgba(245,158,11,.05);
    box-shadow:0 0 0 3px rgba(245,158,11,.1);
}
.nm-names-ta::placeholder { color:rgba(255,255,255,.2); }
.nm-modal-hint { font-size:9.5px; color:rgba(255,255,255,.18); margin-top:7px; font-family:'Courier New',Consolas,monospace; }
.nm-modal-acts { display:flex; gap:8px; padding:0 20px 20px; }
.nm-modal-cancel {
    flex:1; padding:11px; border-radius:11px;
    background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
    color:rgba(255,255,255,.5); font-family:-apple-system,'Segoe UI',sans-serif;
    font-size:12px; font-weight:700; cursor:pointer; transition:all .15s;
}
.nm-modal-cancel:hover { background:rgba(255,255,255,.09); color:#fff; }
.nm-modal-ok {
    flex:2; padding:11px; border-radius:11px; border:none;
    background:linear-gradient(135deg,#d97706,#f59e0b,#fbbf24);
    color:#000; font-family:-apple-system,'Segoe UI',sans-serif;
    font-size:12px; font-weight:800; cursor:pointer; transition:all .18s;
    box-shadow:0 6px 20px rgba(245,158,11,.3);
}
.nm-modal-ok:hover { transform:translateY(-1px); box-shadow:0 10px 30px rgba(245,158,11,.5); }

/* ══ LOGIN BANNER ══ */
.nm-login-banner {
    margin:10px 14px 0; padding:12px 14px; border-radius:13px;
    display:flex; align-items:flex-start; gap:11px;
    background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(168,85,247,.08));
    border:1px solid rgba(99,102,241,.35);
    box-shadow:0 0 20px rgba(99,102,241,.1);
    animation:nmFadeUp .3s cubic-bezier(.22,1,.36,1) both;
}
.nm-banner-ic { font-size:20px; flex-shrink:0; margin-top:1px; }
.nm-banner-txt { flex:1; }
.nm-banner-txt strong { display:block; font-size:12px; font-weight:800; color:#fff; margin-bottom:3px; }
.nm-banner-txt span { font-size:10.5px; color:rgba(255,255,255,.5); line-height:1.5; display:block; }
.nm-banner-close {
    background:none; border:none; color:rgba(255,255,255,.25);
    cursor:pointer; font-size:11px; padding:0; transition:color .15s; flex-shrink:0;
}
.nm-banner-close:hover { color:rgba(255,255,255,.7); }

/* ══ TOAST ══ */
.nm-toast {
    position:fixed; bottom:24px; right:24px; z-index:2147483647;
    display:flex; align-items:center; gap:10px;
    padding:12px 17px; border-radius:14px;
    font-family:-apple-system,'Segoe UI',sans-serif; font-size:13px; font-weight:600; color:#fff;
    pointer-events:none;
    background:rgba(8,8,20,.96); backdrop-filter:blur(24px);
    border:1px solid rgba(255,255,255,.1);
    box-shadow:0 20px 70px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.05);
    animation:nmToastIn .3s cubic-bezier(.22,1,.36,1) both;
    max-width:300px;
}
@keyframes nmToastIn { from{opacity:0;transform:translateY(12px) scale(.94)} to{opacity:1;transform:none} }
.nm-toast.ok  { border-color:rgba(52,211,153,.4); }
.nm-toast.err { border-color:rgba(248,113,113,.4); }
.nm-toast.load { border-color:rgba(99,102,241,.4); }
.nm-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.nm-toast.ok  .nm-dot { background:#34d399; box-shadow:0 0 10px #34d399; }
.nm-toast.err .nm-dot { background:#f87171; box-shadow:0 0 10px #f87171; }
.nm-toast.load .nm-dot {
    width:12px; height:12px; background:none;
    border:1.5px solid rgba(255,255,255,.2); border-top-color:#a5b4fc;
    border-radius:50%; animation:nmSpin .65s linear infinite;
}
    `;
    document.head.appendChild(s);
}

/* ─── ICONS ──────────────────────────────────────────── */
var IC = {
    reply:  '<svg viewBox="0 0 14 14" fill="none"><path d="M2 7L5 4M2 7l3 3M2 7h8a3 3 0 010 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rewrite:'<svg viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h7M2.5 7h9M2.5 10.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    improve:'<svg viewBox="0 0 14 14" fill="none"><path d="M4 7l2.5 2.5L10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sum:    '<svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 5.5h5M4.5 8.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    follow: '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 4.5V7l1.8 1.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    vars:   '<svg viewBox="0 0 14 14" fill="none"><path d="M11.5 3A5.5 5.5 0 102 11M11.5 3v3.5H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    logo:   '<svg viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M2 7h7M2 10.5h4.5" stroke="white" stroke-width="1.9" stroke-linecap="round"/><circle cx="11" cy="10.5" r="3" stroke="rgba(255,255,255,.6)" stroke-width="1.3"/><path d="M11 9.2v1.3l1 1" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg>',
};

/* ─── TOAST ──────────────────────────────────────────── */
function toast(msg, type) {
    type = type||'load';
    document.querySelectorAll('.nm-toast').forEach(function(e){e.remove();});
    var el = document.createElement('div');
    el.className = 'nm-toast ' + type;
    el.innerHTML = '<div class="nm-dot"></div><span>' + msg + '</span>';
    document.body.appendChild(el);
    if (type !== 'load') setTimeout(function(){
        el.style.transition='all .22s ease'; el.style.opacity='0'; el.style.transform='translateY(8px)';
        setTimeout(function(){el.remove();},220);
    }, 3200);
    return el;
}

/* ─── SEND NAMES MODAL ───────────────────────────────── */
function openNamesModal(onConfirm) {
    var ov = document.createElement('div');
    ov.className = 'nm-overlay';
    ov.innerHTML =
        '<div class="nm-modal">' +
            '<div class="nm-modal-head">' +
                '<div class="nm-modal-icon">👤</div>' +
                '<div><div class="nm-modal-title">Personalize Reply</div><div class="nm-modal-sub">add recipient names</div></div>' +
                '<button class="nm-modal-close">✕</button>' +
            '</div>' +
            '<div class="nm-modal-body">' +
                '<div class="nm-modal-desc">Enter the name(s) to address. The AI will personalize the reply naturally — no awkward placeholders.</div>' +
                '<textarea class="nm-names-ta" placeholder="e.g. Rahul, Dr. Sharma, Team SBI, Sir..." rows="3"></textarea>' +
                '<div class="nm-modal-hint">💡 Tip: Separate multiple names with commas</div>' +
            '</div>' +
            '<div class="nm-modal-acts">' +
                '<button class="nm-modal-cancel">Cancel</button>' +
                '<button class="nm-modal-ok">✓ Apply &amp; Close</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(ov);
    var ta = ov.querySelector('.nm-names-ta');
    ta.focus();
    function close() { ov.remove(); }
    ov.querySelector('.nm-modal-close').onclick = close;
    ov.querySelector('.nm-modal-cancel').onclick = close;
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });
    ov.querySelector('.nm-modal-ok').onclick = function(){
        var v = ta.value.trim();
        if (v) onConfirm(v);
        close();
    };
    ta.onkeydown = function(e){
        if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); var v=ta.value.trim(); if(v) onConfirm(v); close(); }
    };
}

/* ─── SCORE ──────────────────────────────────────────── */
function renderScore(panel, raw) {
    var wrap = panel.querySelector('.nm-score-wrap');
    if (!wrap) return;
    var n = parseInt((String(raw).match(/(\d+)/)||['','0'])[1]);
    if (!n) return;
    wrap.style.display = 'block';
    var col,tag,note;
    if (n>=80){col='#34d399';tag='Sounds Human';note='Reads completely natural';}
    else if (n>=55){col='#fbbf24';tag='Mostly Natural';note='Minor AI patterns present';}
    else {col='#f87171';tag='Sounds AI-written';note='Add more personal context';}
    wrap.querySelector('.nm-score-num').textContent = n+'%';
    wrap.querySelector('.nm-score-num').style.color = col;
    wrap.querySelector('.nm-score-tag').textContent = tag;
    wrap.querySelector('.nm-score-tag').style.color = col;
    wrap.querySelector('.nm-score-note').textContent = note;
    var fill = wrap.querySelector('.nm-score-fill');
    fill.style.background = 'linear-gradient(90deg,'+col+','+col+'66)';
    fill.style.boxShadow = '0 0 12px '+col+'88';
    setTimeout(function(){ fill.style.width = n+'%'; }, 100);
}

/* ─── BUILD PANEL ────────────────────────────────────── */
function buildPanel(fab) {
    var email  = getEmailContent();
    var intent = detectIntent(email);
    var panel  = document.createElement('div');
    panel.className = 'nm-panel';
    var autoTone   = intent.tone   || 'professional';
    var autoLength = intent.length || 'medium';

    panel.innerHTML =
    '<div class="nm-glass"><div class="nm-glass-mesh"></div><div class="nm-glass-border"></div></div>' +
    '<div class="nm-glass-sheen"></div>' +
    '<div class="nm-body">' +

      // HEAD
      '<div class="nm-head">' +
        '<div class="nm-logo"><div class="nm-logo-ring"></div><div class="nm-logo-core">'+IC.logo+'</div></div>' +
        '<div><div class="nm-title">NeuralMail AI</div><div class="nm-sub">drag to move · groq · jwt</div></div>' +
        '<div class="nm-badge" style="color:'+intent.color+';border-color:'+intent.color+'44;background:'+intent.color+'12;box-shadow:0 0 16px '+intent.glow+'">'+intent.emoji+' '+intent.label+'</div>' +
        '<button class="nm-x">✕</button>' +
      '</div>' +

      // GENERATE
      '<button class="nm-gen" data-action="reply">' +
        '<div class="nm-gen-bg"></div><div class="nm-gen-sheen"></div><div class="nm-gen-border"></div>' +
        '<div class="nm-gen-ic" style="color:#fff">'+IC.reply+'</div>' +
        '<div class="nm-gen-copy"><span class="nm-gen-title">Generate Reply</span><span class="nm-gen-hint">Context-aware · Groq LLaMA · JWT auth</span></div>' +
        '<span class="nm-gen-arr">›</span>' +
      '</button>' +

      // GRID
      '<div class="nm-grid">' +
        '<button class="nm-btn" data-action="rewrite"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(52,211,153,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#6ee7b7">'+IC.rewrite+'</div><div><span class="nm-btn-label">Rewrite</span><span class="nm-btn-hint">polish draft</span></div></button>' +
        '<button class="nm-btn" data-action="improve"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(253,186,116,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#fda368">'+IC.improve+'</div><div><span class="nm-btn-label">Improve</span><span class="nm-btn-hint">grammar + flow</span></div></button>' +
        '<button class="nm-btn" data-action="summarize"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(196,181,253,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#c4b5fd">'+IC.sum+'</div><div><span class="nm-btn-label">Summarize</span><span class="nm-btn-hint">key points</span></div></button>' +
        '<button class="nm-btn" data-action="followup"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(147,197,253,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#93c5fd">'+IC.follow+'</div><div><span class="nm-btn-label">Follow-Up</span><span class="nm-btn-hint">auto draft</span></div></button>' +
        '<button class="nm-btn nm-btn-full" data-action="variations"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(249,168,212,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#f9a8d4">'+IC.vars+'</div><div><span class="nm-btn-label">3 Variations</span><span class="nm-btn-hint">formal · friendly · concise — pick your favorite</span></div></button>' +
      '</div>' +

      // CONTROLS
      '<div class="nm-ctrl-row">' +
        '<div class="nm-ctrl"><span class="nm-ctrl-lbl">Tone <span class="nm-auto-badge">auto</span></span>' +
        '<select class="nm-sel nm-tone"><option value="professional">Professional</option><option value="formal">Formal</option><option value="friendly">Friendly</option><option value="executive">Executive</option><option value="apology">Apology</option><option value="negotiation">Negotiation</option><option value="casual">Casual</option><option value="assertive">Assertive</option></select></div>' +
        '<div class="nm-ctrl"><span class="nm-ctrl-lbl">Length <span class="nm-auto-badge">auto</span></span>' +
        '<select class="nm-sel nm-len"><option value="medium">Medium</option><option value="short">Short</option><option value="long">Detailed</option></select></div>' +
      '</div>' +

      // PROMPT
      '<div class="nm-prompt"><div class="nm-pbox">' +
        '<div class="nm-ptop"><span class="nm-plbl">⚡ Custom Instruction <span style="color:rgba(99,102,241,.6);font-size:7px;letter-spacing:.5px">HIGHEST PRIORITY</span></span><button class="nm-pclr">clear ×</button></div>' +
        '<input class="nm-pinput" type="text" placeholder="e.g. Keep it under 3 lines, mention deadline..." />' +
        '<div class="nm-chips">' +
          '<button class="nm-chip nm-chip-gold" data-action="sendnames">👤 Send Names</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Make it shorter">Shorter</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Make it more polite">More Polite</button>' +
          '<button class="nm-chip nm-chip-green" data-fill="Reply in Hindi">🇮🇳 Hindi</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Add urgency to the tone">Urgent</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Sound more casual and friendly">Casual</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Be more detailed and thorough">Detailed</button>' +
        '</div>' +
      '</div></div>' +

      // RESULTS
      '<div class="nm-result nm-score-wrap"><div class="nm-rhead">Human Score Analysis</div>' +
        '<div class="nm-score-body"><div class="nm-score-row"><div class="nm-score-num">—</div><div class="nm-score-r"><span class="nm-score-tag">—</span><span class="nm-score-note">waiting for reply</span></div></div>' +
        '<div class="nm-score-bar"><div class="nm-score-fill"></div></div></div></div>' +

      '<div class="nm-result nm-sum-wrap"><div class="nm-rhead">Email Summary</div><div class="nm-sum-body"></div></div>' +
      '<div class="nm-result nm-var-wrap"><div class="nm-rhead">3 Reply Variations</div><div class="nm-var-list"></div></div>' +

      // FOOT
      '<div class="nm-foot">' +
        '<button class="nm-regen" data-action="reply">↻ Regenerate</button>' +
        '<span class="nm-foot-tag">v10 · neuralmail</span>' +
      '</div>' +

    '</div>';

    // Auto-set tone & length based on email content
    var toneEl = panel.querySelector('.nm-tone');
    var lenEl  = panel.querySelector('.nm-len');
    if (toneEl) toneEl.value = autoTone;
    if (lenEl)  lenEl.value  = autoLength;

    // Wire close
    panel.querySelector('.nm-x').onclick = function(){ closePanel(panel,fab); };

    // Wire all data-action buttons
    panel.querySelectorAll('[data-action]').forEach(function(b){
        b.onclick = function(){ handleAction(b.dataset.action, panel, fab); };
    });

    // Wire chips data-fill
    panel.querySelectorAll('[data-fill]').forEach(function(chip){
        chip.onclick = function(){
            panel.querySelector('.nm-pinput').value = chip.dataset.fill;
            panel.querySelectorAll('[data-fill]').forEach(function(c){c.classList.remove('lit');});
            chip.classList.add('lit');
        };
    });

    // Clear
    panel.querySelector('.nm-pclr').onclick = function(){
        panel.querySelector('.nm-pinput').value='';
        panel.querySelectorAll('[data-fill]').forEach(function(c){c.classList.remove('lit');});
    };

    return panel;
}

/* ─── PANEL LIFECYCLE ────────────────────────────────── */
function closePanel(panel, fab) {
    panel.style.animation = 'nmOut .22s cubic-bezier(.22,1,.36,1) both';
    fab.classList.remove('open','busy');
    setTimeout(function(){ panel.remove(); }, 220);
}
function clampPanel(panel) {
    var pw=panel.offsetWidth||368, ph=panel.offsetHeight||500;
    var vw=window.innerWidth, vh=window.innerHeight;
    var t=parseInt(panel.style.top)||0, l=parseInt(panel.style.left)||0;
    if (t<8) t=8;
    if (l<8) l=8;
    if (l+pw>vw-8) l=vw-pw-8;
    if (t+ph>vh-8) t=vh-ph-8;
    if (t<8) t=8;
    panel.style.top=t+'px'; panel.style.left=l+'px';
}

function makeDraggable(panel) {
    var header = panel.querySelector('.nm-head');
    if (!header) return;
    header.style.cursor = 'grab';
    var dragging=false, ox=0, oy=0;
    header.addEventListener('mousedown', function(e){
        if (e.target.closest('.nm-x,.nm-badge')) return;
        dragging=true; ox=e.clientX-panel.offsetLeft; oy=e.clientY-panel.offsetTop;
        header.style.cursor='grabbing';
        panel.style.transition='none';
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e){
        if (!dragging) return;
        panel.style.left=(e.clientX-ox)+'px';
        panel.style.top=(e.clientY-oy)+'px';
        clampPanel(panel);
    });
    document.addEventListener('mouseup', function(){
        if (dragging){ dragging=false; header.style.cursor='grab'; panel.style.transition=''; }
    });
}

function positionPanel(panel, fab) {
    document.body.appendChild(panel);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
        var r=fab.getBoundingClientRect(), pw=368, ph=panel.offsetHeight||500;
        var vw=window.innerWidth, vh=window.innerHeight;

        // Try above FAB first
        var top=r.top-ph-12, left=r.right-pw;
        // If doesn't fit above, try below
        if (top < 8) top = r.bottom+10;
        // If still doesn't fit below either, center vertically
        if (top+ph > vh-8) top = Math.max(8, Math.floor((vh-ph)/2));
        // Horizontal clamping
        if (left<8) left=8;
        if (left+pw>vw-8) left=vw-pw-8;

        panel.style.top=top+'px'; panel.style.left=left+'px';
        makeDraggable(panel);

        // Re-clamp on scroll/resize
        window.addEventListener('resize', function(){ clampPanel(panel); });
    }); });
}

/* ─── LOGIN BANNER ───────────────────────────────────── */
function showLoginBanner(panel) {
    if (panel.querySelector('.nm-login-banner')) return;
    var b = document.createElement('div');
    b.className = 'nm-login-banner';
    b.innerHTML =
        '<div class="nm-banner-ic">🔐</div>' +
        '<div class="nm-banner-txt">' +
            '<strong>Login required</strong>' +
            '<span>Click the 🧩 extension icon in Chrome toolbar → Account tab → Log In</span>' +
        '</div>' +
        '<button class="nm-banner-close">✕</button>';
    b.querySelector('.nm-banner-close').onclick = function(){ b.remove(); };
    // Insert after header
    var head = panel.querySelector('.nm-head');
    if (head && head.nextSibling) head.parentNode.insertBefore(b, head.nextSibling);
    else panel.querySelector('.nm-body').prepend(b);
}

/* ─── ACTIONS ────────────────────────────────────────── */
function handleAction(action, panel, fab) {
    if (action === 'sendnames') {
        openNamesModal(function(names){
            var inp = panel.querySelector('.nm-pinput');
            var cur = inp.value.trim();
            var ins = 'Address the reply to: ' + names;
            inp.value = cur ? cur + '. ' + ins : ins;
            toast('✓ Names added to instruction', 'ok');
        });
        return;
    }
    fab.classList.add('busy');
    var tone   = (panel.querySelector('.nm-tone')||{}).value||'professional';
    var len    = (panel.querySelector('.nm-len')||{}).value||'medium';
    var custom = (panel.querySelector('.nm-pinput')||{}).value||'';

    (async function(){
        try {
            if (action==='reply'||action==='followup') {
                var ec = getEmailContent();
                if (!ec) { toast('Open an email thread first','err'); return; }
                var t = toast('Crafting your reply…','load');
                var res = await callBg({
                    type: action==='followup'?'FOLLOWUP_EMAIL':'GENERATE_REPLY',
                    emailContent:ec, tone:tone, replyLength:len, customPrompt:custom
                });
                t.remove();
                var reply = res.aiReply||res.result||'';
                if (!reply) { toast('Empty response — try again','err'); return; }
                if (!insertCompose(reply)) { toast('Click Reply in Gmail first','err'); return; }
                if (res.humanScore) renderScore(panel, res.humanScore);
                toast(action==='followup'?'✓ Follow-up inserted':'✓ Reply inserted','ok');
            } else if (action==='rewrite') {
                var ec=(getComposeBox()||{}).innerText||''; ec=ec.trim();
                if (ec.length<5){toast('Type a draft in compose first','err');return;}
                var t=toast('Rewriting…','load');
                var res=await callBg({type:'REWRITE_EMAIL',emailContent:ec,tone:tone});
                t.remove(); insertCompose(res.result); toast('✓ Rewritten','ok');
            } else if (action==='improve') {
                var ec=(getComposeBox()||{}).innerText||''; ec=ec.trim();
                if (ec.length<5){toast('Type a draft in compose first','err');return;}
                var t=toast('Improving…','load');
                var res=await callBg({type:'IMPROVE_EMAIL',emailContent:ec});
                t.remove(); insertCompose(res.result); toast('✓ Improved','ok');
            } else if (action==='summarize') {
                var ec=getEmailContent();
                if (!ec){toast('Open an email first','err');return;}
                var t=toast('Summarizing…','load');
                var res=await callBg({type:'SUMMARIZE_EMAIL',emailContent:ec});
                t.remove();
                var w=panel.querySelector('.nm-sum-wrap');
                w.querySelector('.nm-sum-body').innerHTML=res.result.replace(/\n/g,'<br>');
                w.style.display='block';
                toast('✓ Summary ready','ok');
            } else if (action==='variations') {
                var ec=getEmailContent();
                if (!ec){toast('Open an email first','err');return;}
                var t=toast('Generating 3 variations…','load');
                var res=await callBg({type:'GENERATE_VARIATIONS',emailContent:ec,tone:tone,customPrompt:custom});
                t.remove(); renderVariations(panel,res.variations||[]);
                toast('✓ 3 variations ready','ok');
            }
        } catch(err) {
            var m=err.message||'Something went wrong';
            if (m.toLowerCase().includes('log in')||m.toLowerCase().includes('expired')||m.toLowerCase().includes('please log')) {
                // Show login-first banner inside panel
                showLoginBanner(panel);
                toast('Click the extension icon (🧩) in toolbar → log in first','err');
            } else {
                toast(m,'err');
            }
        } finally { fab.classList.remove('busy'); }
    })();
}

/* ─── VARIATIONS ─────────────────────────────────────── */
function renderVariations(panel, vars) {
    var list=panel.querySelector('.nm-var-list'), wrap=panel.querySelector('.nm-var-wrap');
    wrap.style.display='block'; list.innerHTML='';
    ['Formal','Friendly','Concise'].forEach(function(lbl,i){
        var text=(vars[i]||'').trim();
        var d=document.createElement('div'); d.className='nm-var-item';
        d.innerHTML='<div class="nm-var-tag">'+lbl+'</div>'+
            '<div class="nm-var-txt">'+(text.slice(0,120)+(text.length>120?'…':''))+'</div>'+
            '<button class="nm-var-use">Use this reply →</button>';
        d.querySelector('.nm-var-use').onclick=function(e){
            e.stopPropagation(); insertCompose(text); toast('✓ Inserted','ok');
        };
        d.onclick=function(){
            list.querySelectorAll('.nm-var-item').forEach(function(x){x.classList.remove('sel');});
            d.classList.toggle('sel');
        };
        list.appendChild(d);
    });
}

/* ─── INJECT FAB ─────────────────────────────────────── */
function injectFAB(toolbar) {
    if (!toolbar||toolbar.querySelector('.nm-fab')) return;
    var sendBtn=
        toolbar.querySelector('div[role="button"].T-I.J-J5-Ji.aoO.v7')||
        toolbar.querySelector('[data-tooltip="Send"]')||
        toolbar.querySelector('.T-I.J-J5-Ji.aoO');
    if (!sendBtn) return;
    injectStyles();
    var wrap=document.createElement('div'); wrap.className='nm-wrap';
    var fab=document.createElement('button'); fab.className='nm-fab'; fab.title='NeuralMail AI';
    fab.innerHTML=
        '<div class="nm-fab-bg"></div>'+
        '<div class="nm-fab-inner">'+
            '<svg width="15" height="15" viewBox="0 0 14 14" fill="none">'+
                '<path d="M2 3.5h10M2 7h7M2 10.5h4.5" stroke="white" stroke-width="1.9" stroke-linecap="round"/>'+
            '</svg>'+
        '</div>';
    var active=null;
    fab.onclick=function(e){
        e.stopPropagation();
        if (active){ closePanel(active,fab); active=null; return; }
        fab.classList.add('open');
        var panel=buildPanel(fab);
        positionPanel(panel,fab);
        active=panel;
        setTimeout(function(){
            function out(ev){
                if (!panel.contains(ev.target)&&ev.target!==fab&&!ev.target.closest('.nm-overlay')){
                    closePanel(panel,fab); active=null;
                    document.removeEventListener('click',out,true);
                }
            }
            document.addEventListener('click',out,true);
        },180);
    };
    wrap.appendChild(fab);
    var ins=sendBtn; var nx=sendBtn.nextElementSibling;
    if (nx&&(nx.classList.contains('T-I-Js-Gs')||nx.getAttribute('role')==='button')) ins=nx;
    if (ins.nextSibling) ins.parentNode.insertBefore(wrap,ins.nextSibling);
    else ins.parentNode.appendChild(wrap);
}

/* ─── OBSERVE ────────────────────────────────────────── */
function scan(){
    document.querySelectorAll('.gU.Up').forEach(injectFAB);
    document.querySelectorAll('[role="dialog"]').forEach(function(d){
        var t=d.querySelector('.gU.Up'); if(t) injectFAB(t);
    });
}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
setTimeout(scan,800); setTimeout(scan,2500);