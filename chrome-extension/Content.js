/* NeuralMail Research v2 — content.js
   No JWT | Device ID | Baseline vs Proposed | Dual Reply | Intent + Explainability | Thread Context | Injection Warning */

function getEmailContent() {
    var sels = ['.h7', '.a3s.aiL', '.gmail_quote', '[data-message-id]', '.gs'];
    for (var i = 0; i < sels.length; i++) {
        var el = document.querySelector(sels[i]);
        if (el && el.innerText && el.innerText.trim().length > 10) return el.innerText.trim();
    }
    var main = document.querySelector('.AO') || document.querySelector('[role="main"]');
    return (main && main.innerText && main.innerText.trim().length > 10) ? main.innerText.trim() : null;
}

function getThreadContext() {
    var messages = document.querySelectorAll('.h7, .a3s.aiL');
    if (messages.length <= 1) return '';
    var parts = [];
    messages.forEach(function(m, i) {
        var txt = m.innerText && m.innerText.trim();
        if (txt && txt.length > 10 && i < messages.length - 1)
            parts.push('--- Message ' + (i + 1) + ' ---\n' + txt.slice(0, 400));
    });
    return parts.join('\n\n');
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
    if (!text) return { label:'General', color:'#94a3b8', glow:'rgba(148,163,184,.3)', emoji:'', tone:'professional', length:'medium' };
    var t = text.toLowerCase();
    var wordCount = text.split(/\s+/).length;
    var autoLength = wordCount < 60 ? 'short' : wordCount > 300 ? 'long' : 'medium';

    if (t.match(/interview|resume|cv|hiring|job offer|apply for|vacancy|position|candidate|recruiter|internship/))
        return { label:'Job', color:'#818cf8', glow:'rgba(129,140,248,.3)', emoji:'', tone:'formal', length:autoLength };
    if (t.match(/urgent|asap|immediately|critical|emergency|right away/))
        return { label:'Urgent', color:'#fb923c', glow:'rgba(251,146,60,.3)', emoji:'', tone:'assertive', length:'short' };
    if (t.match(/invoice|payment|billing|amount due|refund|transaction|receipt|overdue/))
        return { label:'Finance', color:'#fbbf24', glow:'rgba(251,191,36,.3)', emoji:'', tone:'formal', length:'short' };
    if (t.match(/complain|disappointed|frustrated|issue|problem|broken|not working|defective/))
        return { label:'Complaint', color:'#f87171', glow:'rgba(248,113,113,.3)', emoji:'', tone:'apology', length:'medium' };
    if (t.match(/follow.?up|following up|checking in|any update|still waiting|gentle reminder/))
        return { label:'Follow-Up', color:'#60a5fa', glow:'rgba(96,165,250,.3)', emoji:'', tone:'friendly', length:'short' };
    if (t.match(/meeting|schedule|calendar|call|sync|discuss|zoom|available|appointment|conference/))
        return { label:'Meeting', color:'#34d399', glow:'rgba(52,211,153,.3)', emoji:'', tone:'professional', length:autoLength };
    if (t.match(/hi |hey |hello|hope you|how are you|just wanted/))
        return { label:'Casual', color:'#a78bfa', glow:'rgba(167,139,250,.3)', emoji:'', tone:'friendly', length:'short' };
    return { label:'General', color:'#94a3b8', glow:'rgba(148,163,184,.3)', emoji:'', tone:'professional', length:autoLength };
}

function hasInjection(text) {
    if (!text) return false;
    var t = text.toLowerCase();
    var patterns = ['ignore previous','ignore all instructions','act as','you are now',
        'forget your instructions','jailbreak','system prompt','override','disregard'];
    return patterns.some(function(p){ return t.includes(p); });
}

function injectStyles() {
    if (document.getElementById('nm-res-v2')) return;
    var s = document.createElement('style');
    s.id = 'nm-res-v2';
    s.textContent = `
.nm-wrap{display:inline-flex;align-items:center;margin-left:8px;}
.nm-fab{width:34px;height:34px;border:none;cursor:pointer;border-radius:10px;position:relative;overflow:hidden;flex-shrink:0;transition:transform .3s cubic-bezier(.34,1.56,.64,1);}
.nm-fab-bg{position:absolute;inset:0;background:conic-gradient(from 0deg at 50% 50%,#6366f1 0%,#8b5cf6 25%,#ec4899 50%,#f59e0b 75%,#6366f1 100%);animation:nmFabSpin 3s linear infinite;}
.nm-fab-inner{position:absolute;inset:2px;border-radius:8px;background:linear-gradient(135deg,#0f0f20,#1a1a35);display:flex;align-items:center;justify-content:center;}
.nm-fab:hover{transform:scale(1.15) rotate(-5deg);}
.nm-fab:active{transform:scale(.93);}
.nm-fab.busy .nm-fab-inner::after{content:'';position:absolute;width:14px;height:14px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:nmSpin .6s linear infinite;}
.nm-fab.busy svg{opacity:0;}
@keyframes nmFabSpin{to{transform:rotate(360deg);}}
@keyframes nmSpin{to{transform:rotate(360deg);}}
.nm-panel{position:fixed;width:372px;z-index:2147483647;font-family:-apple-system,'Segoe UI',sans-serif;border-radius:24px;overflow:hidden;animation:nmIn .4s cubic-bezier(.22,1,.36,1) both;}
@keyframes nmIn{from{opacity:0;transform:translateY(20px) scale(.92);}to{opacity:1;transform:none;}}
@keyframes nmOut{from{opacity:1;}to{opacity:0;transform:translateY(12px) scale(.94);}}
.nm-glass{position:absolute;inset:0;border-radius:24px;background:rgba(8,8,20,.90);backdrop-filter:blur(40px) saturate(180%);}
.nm-glass-mesh{position:absolute;inset:-80%;width:260%;height:260%;background:radial-gradient(ellipse 50% 40% at 15% 15%,rgba(99,102,241,.18) 0%,transparent 55%),radial-gradient(ellipse 40% 50% at 85% 85%,rgba(168,85,247,.14) 0%,transparent 55%);}
.nm-glass-border{position:absolute;inset:0;border-radius:24px;border:1px solid rgba(255,255,255,.09);pointer-events:none;}
.nm-body{position:relative;z-index:2;max-height:88vh;overflow-y:auto;}
.nm-body::-webkit-scrollbar{width:2px;}
.nm-body::-webkit-scrollbar-thumb{background:rgba(99,102,241,.4);border-radius:99px;}
.nm-head{padding:15px 16px 13px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px;cursor:grab;user-select:none;}
.nm-logo{width:32px;height:32px;border-radius:9px;position:relative;overflow:hidden;flex-shrink:0;}
.nm-logo-ring{position:absolute;inset:0;border-radius:9px;background:conic-gradient(from 0deg,#6366f1,#8b5cf6,#ec4899,#6366f1);animation:nmFabSpin 4s linear infinite;}
.nm-logo-core{position:absolute;inset:1.5px;border-radius:7.5px;background:#10102a;display:flex;align-items:center;justify-content:center;}
.nm-title{font-size:12.5px;font-weight:800;color:#fff;letter-spacing:-.3px;}
.nm-sub{font-size:8.5px;color:rgba(255,255,255,.25);font-family:monospace;margin-top:1px;}
.nm-badge{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:9.5px;font-weight:700;font-family:monospace;border:1px solid;flex-shrink:0;}
.nm-x{width:24px;height:24px;border-radius:7px;border:none;cursor:pointer;margin-left:auto;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.3);font-size:11px;display:flex;align-items:center;justify-content:center;transition:all .18s;}
.nm-x:hover{background:rgba(248,113,113,.15);color:#f87171;transform:rotate(90deg);}
.nm-toggle-row{margin:10px 14px 0;display:flex;gap:5px;align-items:center;padding:8px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;}
.nm-toggle-lbl{font-size:8px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,.25);font-family:monospace;flex:1;}
.nm-toggle-wrap{display:flex;background:rgba(0,0,0,.3);border-radius:8px;padding:2px;gap:2px;}
.nm-toggle-btn{padding:5px 12px;border:none;border-radius:6px;cursor:pointer;font-size:9.5px;font-weight:800;text-transform:uppercase;font-family:monospace;transition:all .2s;color:rgba(255,255,255,.3);background:transparent;}
.nm-toggle-btn.active-baseline{background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3);}
.nm-toggle-btn.active-proposed{background:rgba(99,102,241,.2);color:#a5b4fc;border:1px solid rgba(99,102,241,.4);}
.nm-explain{margin:8px 14px 0;padding:9px 12px;border-radius:11px;background:rgba(52,211,153,.04);border:1px solid rgba(52,211,153,.18);display:none;}
.nm-explain-title{font-size:7.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:rgba(52,211,153,.6);font-family:monospace;margin-bottom:6px;}
.nm-explain-row{font-size:10.5px;color:rgba(255,255,255,.45);line-height:1.7;}
.nm-explain-row span{color:rgba(255,255,255,.75);font-weight:600;}
.nm-kw{display:inline-block;padding:1px 6px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);border-radius:4px;font-size:9px;color:#a5b4fc;margin:2px 2px 0 0;}
.nm-dual{margin:10px 14px 0;display:none;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);}
.nm-dual-tab-row{display:flex;background:rgba(0,0,0,.3);}
.nm-dual-tab{flex:1;padding:9px;border:none;cursor:pointer;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;font-family:monospace;transition:all .2s;background:transparent;color:rgba(255,255,255,.3);}
.nm-dual-tab.active-b{background:rgba(248,113,113,.12);color:#f87171;border-bottom:2px solid #f87171;}
.nm-dual-tab.active-p{background:rgba(99,102,241,.12);color:#a5b4fc;border-bottom:2px solid #6366f1;}
.nm-dual-content{padding:12px;font-size:11.5px;color:rgba(255,255,255,.65);line-height:1.75;min-height:80px;background:rgba(255,255,255,.02);}
.nm-dual-actions{display:flex;gap:6px;padding:0 12px 12px;}
.nm-dual-use{flex:1;padding:8px;border:none;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;transition:all .15s;font-family:-apple-system,'Segoe UI',sans-serif;}
.nm-dual-use-b{background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3);}
.nm-dual-use-p{background:rgba(99,102,241,.2);color:#a5b4fc;border:1px solid rgba(99,102,241,.4);}
.nm-dual-use:hover{transform:translateY(-1px);filter:brightness(1.2);}
.nm-inject-warn{margin:8px 14px 0;padding:8px 12px;border-radius:10px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);font-size:10.5px;color:#f87171;display:none;}
.nm-gen{margin:10px 14px 0;width:calc(100% - 28px);display:flex;align-items:center;gap:12px;padding:14px 16px;border:none;border-radius:16px;cursor:pointer;position:relative;overflow:hidden;font-family:-apple-system,'Segoe UI',sans-serif;transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;}
.nm-gen-bg{position:absolute;inset:0;background:linear-gradient(135deg,#3730a3,#5b21b6,#7c3aed,#a21caf);background-size:300%;animation:nmGenGrad 6s ease infinite;}
@keyframes nmGenGrad{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.nm-gen-sheen{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.08) 50%,transparent 60%);animation:nmGenSheen 3s ease-in-out infinite;}
@keyframes nmGenSheen{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
.nm-gen-border{position:absolute;inset:0;border-radius:16px;border:1px solid rgba(255,255,255,.2);pointer-events:none;}
.nm-gen-ic{position:relative;z-index:1;width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.nm-gen-ic svg{width:15px;height:15px;}
.nm-gen-copy{position:relative;z-index:1;flex:1;text-align:left;}
.nm-gen-title{font-size:13.5px;font-weight:900;color:#fff;display:block;letter-spacing:-.3px;}
.nm-gen-hint{font-size:9px;color:rgba(255,255,255,.5);display:block;margin-top:2px;}
.nm-gen-arr{position:relative;z-index:1;color:rgba(255,255,255,.5);font-size:16px;transition:transform .2s;}
.nm-gen:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 16px 48px rgba(99,102,241,.6);}
.nm-gen:hover .nm-gen-arr{transform:translateX(3px);}
.nm-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 14px 0;}
.nm-btn{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:12px;border:none;cursor:pointer;font-family:-apple-system,'Segoe UI',sans-serif;position:relative;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);transition:transform .22s cubic-bezier(.34,1.56,.64,1),background .15s;}
.nm-btn-glow{position:absolute;inset:-1px;border-radius:13px;opacity:0;transition:opacity .2s;}
.nm-btn:hover .nm-btn-glow{opacity:1;}
.nm-btn:hover{transform:translateY(-2px);background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.14);}
.nm-btn-ic{width:26px;height:26px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);}
.nm-btn-ic svg{width:12px;height:12px;}
.nm-btn-label{font-size:11.5px;font-weight:700;color:rgba(255,255,255,.88);display:block;}
.nm-btn-hint{font-size:8.5px;color:rgba(255,255,255,.28);font-family:monospace;}
.nm-btn-full{grid-column:span 2;}
.nm-ctrl-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 14px 0;}
.nm-ctrl{position:relative;}
.nm-ctrl-lbl{position:absolute;top:-7px;left:9px;z-index:3;font-size:7.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.25);background:#08081a;padding:0 4px;font-family:monospace;display:flex;align-items:center;gap:4px;}
.nm-auto-badge{font-size:6.5px;font-weight:800;color:#34d399;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);padding:1px 4px;border-radius:4px;}
.nm-sel{width:100%;padding:9px 10px;appearance:none;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:rgba(255,255,255,.82);font-family:-apple-system,'Segoe UI',sans-serif;font-size:11px;font-weight:600;cursor:pointer;outline:none;}
.nm-sel option{background:#0d0d20;color:#fff;}
.nm-prompt{padding:8px 14px 0;}
.nm-pbox{border-radius:13px;overflow:hidden;background:rgba(99,102,241,.04);border:1.5px solid rgba(99,102,241,.28);}
.nm-pbox:focus-within{border-color:rgba(99,102,241,.7);box-shadow:0 0 0 3px rgba(99,102,241,.15);}
.nm-ptop{display:flex;align-items:center;justify-content:space-between;padding:8px 12px 0;}
.nm-plbl{font-size:7.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.2);font-family:monospace;}
.nm-pclr{font-size:9px;color:rgba(255,255,255,.18);background:none;border:none;cursor:pointer;transition:color .15s;padding:0;}
.nm-pclr:hover{color:rgba(255,255,255,.6);}
.nm-pinput{width:100%;padding:7px 12px 8px;box-sizing:border-box;background:transparent;border:none;outline:none;color:rgba(255,255,255,.9);font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;resize:none;line-height:1.5;}
.nm-pinput::placeholder{color:rgba(255,255,255,.18);}
.nm-chips{display:flex;flex-wrap:wrap;gap:5px;padding:0 10px 10px;}
.nm-chip{padding:4px 11px;border-radius:20px;border:none;cursor:pointer;font-size:9.5px;font-weight:700;transition:all .15s;}
.nm-chip-blue{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22);color:rgba(165,180,252,.85);}
.nm-chip-blue:hover{background:rgba(99,102,241,.25);color:#fff;transform:translateY(-1px);}
.nm-chip-green{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);color:rgba(110,231,183,.85);}
.nm-chip-green:hover{background:rgba(52,211,153,.2);color:#fff;transform:translateY(-1px);}
.nm-result{margin:10px 14px 0;border-radius:14px;display:none;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);overflow:hidden;}
.nm-rhead{padding:9px 14px 0;font-size:8px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.2);font-family:monospace;display:flex;align-items:center;gap:8px;}
.nm-rhead::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.05);}
.nm-sum-body{padding:10px 14px 13px;font-size:12px;color:rgba(255,255,255,.6);line-height:1.8;}
.nm-var-list{padding:8px 12px 12px;display:flex;flex-direction:column;gap:5px;}
.nm-var-item{padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);cursor:pointer;transition:all .18s;}
.nm-var-item:hover{background:rgba(255,255,255,.055);}
.nm-var-item.sel{border-color:rgba(99,102,241,.4);background:rgba(99,102,241,.07);}
.nm-var-tag{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.25);font-family:monospace;margin-bottom:4px;}
.nm-var-txt{font-size:11px;color:rgba(255,255,255,.55);line-height:1.6;}
.nm-var-use{display:none;margin-top:8px;width:100%;padding:8px;border:none;border-radius:8px;background:linear-gradient(135deg,#3730a3,#6d28d9);color:#fff;font-size:12px;font-weight:700;cursor:pointer;}
.nm-var-item.sel .nm-var-use{display:block;}
.nm-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 14px;}
.nm-regen{font-size:10px;font-weight:700;color:rgba(255,255,255,.22);background:none;cursor:pointer;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:6px 12px;transition:all .15s;}
.nm-regen:hover{color:rgba(255,255,255,.7);background:rgba(255,255,255,.05);}
.nm-foot-tag{font-size:8.5px;color:rgba(255,255,255,.1);font-family:monospace;}
.nm-toast{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:12px 17px;border-radius:14px;font-family:-apple-system,'Segoe UI',sans-serif;font-size:13px;font-weight:600;color:#fff;pointer-events:none;background:rgba(8,8,20,.96);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 70px rgba(0,0,0,.6);max-width:300px;}
.nm-toast.ok{border-color:rgba(52,211,153,.4);}
.nm-toast.err{border-color:rgba(248,113,113,.4);}
.nm-toast.load{border-color:rgba(99,102,241,.4);}
.nm-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.nm-toast.ok .nm-dot{background:#34d399;box-shadow:0 0 10px #34d399;}
.nm-toast.err .nm-dot{background:#f87171;box-shadow:0 0 10px #f87171;}
.nm-toast.load .nm-dot{width:12px;height:12px;background:none;border:1.5px solid rgba(255,255,255,.2);border-top-color:#a5b4fc;border-radius:50%;animation:nmSpin .65s linear infinite;}
    `;
    document.head.appendChild(s);
}

var IC = {
    reply:  '<svg viewBox="0 0 14 14" fill="none"><path d="M2 7L5 4M2 7l3 3M2 7h8a3 3 0 010 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rewrite:'<svg viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h7M2.5 7h9M2.5 10.5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    improve:'<svg viewBox="0 0 14 14" fill="none"><path d="M4 7l2.5 2.5L10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sum:    '<svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 5.5h5M4.5 8.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    follow: '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 4.5V7l1.8 1.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    vars:   '<svg viewBox="0 0 14 14" fill="none"><path d="M11.5 3A5.5 5.5 0 102 11M11.5 3v3.5H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    logo:   '<svg viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M2 7h7M2 10.5h4.5" stroke="white" stroke-width="1.9" stroke-linecap="round"/></svg>',
};

function toast(msg, type) {
    type = type || 'load';
    document.querySelectorAll('.nm-toast').forEach(function(e){ e.remove(); });
    var el = document.createElement('div');
    el.className = 'nm-toast ' + type;
    el.innerHTML = '<div class="nm-dot"></div><span>' + msg + '</span>';
    document.body.appendChild(el);
    if (type !== 'load') setTimeout(function(){
        el.style.transition = 'all .22s ease';
        el.style.opacity = '0';
        setTimeout(function(){ el.remove(); }, 220);
    }, 3200);
    return el;
}

function buildPanel(fab) {
    var email  = getEmailContent();
    var intent = detectIntent(email);
    var panel  = document.createElement('div');
    panel.className = 'nm-panel';
    panel._intentMode    = 'proposed';
    panel._baselineReply = '';
    panel._proposedReply = '';

    panel.innerHTML =
    '<div class="nm-glass"><div class="nm-glass-mesh"></div><div class="nm-glass-border"></div></div>' +
    '<div class="nm-body">' +
      '<div class="nm-head">' +
        '<div class="nm-logo"><div class="nm-logo-ring"></div><div class="nm-logo-core">'+IC.logo+'</div></div>' +
        '<div><div class="nm-title">NeuralMail AI</div><div class="nm-sub">research v2 · no auth</div></div>' +
        '<div class="nm-badge" style="color:'+intent.color+';border-color:'+intent.color+'44;background:'+intent.color+'12;">'+intent.label+'</div>' +
        '<button class="nm-x">x</button>' +
      '</div>' +
      '<div class="nm-toggle-row">' +
        '<span class="nm-toggle-lbl">System Mode</span>' +
        '<div class="nm-toggle-wrap">' +
          '<button class="nm-toggle-btn" data-mode="baseline">Baseline</button>' +
          '<button class="nm-toggle-btn active-proposed" data-mode="proposed">Proposed</button>' +
        '</div>' +
      '</div>' +
      '<div class="nm-inject-warn">Prompt injection pattern detected in email.</div>' +
      '<div class="nm-explain">' +
        '<div class="nm-explain-title">Intent Explainability</div>' +
        '<div class="nm-explain-row nm-explain-intent"></div>' +
        '<div class="nm-explain-row nm-explain-reason"></div>' +
        '<div class="nm-explain-row nm-explain-kw"></div>' +
        '<div class="nm-explain-row nm-explain-prompt"></div>' +
      '</div>' +
      '<div class="nm-dual">' +
        '<div class="nm-dual-tab-row">' +
          '<button class="nm-dual-tab" data-tab="baseline">Baseline</button>' +
          '<button class="nm-dual-tab active-p" data-tab="proposed">Proposed</button>' +
        '</div>' +
        '<div class="nm-dual-content"></div>' +
        '<div class="nm-dual-actions">' +
          '<button class="nm-dual-use nm-dual-use-b" data-use="baseline">Use Baseline</button>' +
          '<button class="nm-dual-use nm-dual-use-p" data-use="proposed">Use Proposed</button>' +
        '</div>' +
      '</div>' +
      '<button class="nm-gen" data-action="reply">' +
        '<div class="nm-gen-bg"></div><div class="nm-gen-sheen"></div><div class="nm-gen-border"></div>' +
        '<div class="nm-gen-ic" style="color:#fff">'+IC.reply+'</div>' +
        '<div class="nm-gen-copy"><span class="nm-gen-title">Generate Reply</span><span class="nm-gen-hint nm-gen-hint-txt">Proposed: intent-aware prompt</span></div>' +
        '<span class="nm-gen-arr">></span>' +
      '</button>' +
      '<div class="nm-grid">' +
        '<button class="nm-btn" data-action="rewrite"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(52,211,153,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#6ee7b7">'+IC.rewrite+'</div><div><span class="nm-btn-label">Rewrite</span><span class="nm-btn-hint">polish draft</span></div></button>' +
        '<button class="nm-btn" data-action="improve"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(253,186,116,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#fda368">'+IC.improve+'</div><div><span class="nm-btn-label">Improve</span><span class="nm-btn-hint">grammar + flow</span></div></button>' +
        '<button class="nm-btn" data-action="summarize"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(196,181,253,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#c4b5fd">'+IC.sum+'</div><div><span class="nm-btn-label">Summarize</span><span class="nm-btn-hint">key points</span></div></button>' +
        '<button class="nm-btn" data-action="followup"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(147,197,253,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#93c5fd">'+IC.follow+'</div><div><span class="nm-btn-label">Follow-Up</span><span class="nm-btn-hint">auto draft</span></div></button>' +
        '<button class="nm-btn nm-btn-full" data-action="variations"><div class="nm-btn-glow" style="background:radial-gradient(circle at 50% 0%,rgba(249,168,212,.15),transparent 70%)"></div><div class="nm-btn-ic" style="color:#f9a8d4">'+IC.vars+'</div><div><span class="nm-btn-label">3 Variations</span><span class="nm-btn-hint">formal · friendly · concise</span></div></button>' +
      '</div>' +
      '<div class="nm-ctrl-row">' +
        '<div class="nm-ctrl"><span class="nm-ctrl-lbl">Tone <span class="nm-auto-badge">auto</span></span>' +
        '<select class="nm-sel nm-tone"><option value="professional">Professional</option><option value="formal">Formal</option><option value="friendly">Friendly</option><option value="executive">Executive</option><option value="casual">Casual</option><option value="assertive">Assertive</option></select></div>' +
        '<div class="nm-ctrl"><span class="nm-ctrl-lbl">Length <span class="nm-auto-badge">auto</span></span>' +
        '<select class="nm-sel nm-len"><option value="medium">Medium</option><option value="short">Short</option><option value="long">Detailed</option></select></div>' +
      '</div>' +
      '<div class="nm-prompt"><div class="nm-pbox">' +
        '<div class="nm-ptop"><span class="nm-plbl">Custom Instruction</span><button class="nm-pclr">clear</button></div>' +
        '<input class="nm-pinput" type="text" placeholder="e.g. Keep it under 3 lines, mention deadline..." />' +
        '<div class="nm-chips">' +
          '<button class="nm-chip nm-chip-blue" data-fill="Make it shorter">Shorter</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Make it more polite">More Polite</button>' +
          '<button class="nm-chip nm-chip-green" data-fill="Reply in Hindi">Hindi</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Add urgency to the tone">Urgent</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Sound more casual and friendly">Casual</button>' +
          '<button class="nm-chip nm-chip-blue" data-fill="Be more detailed and thorough">Detailed</button>' +
        '</div>' +
      '</div></div>' +
      '<div class="nm-result nm-sum-wrap"><div class="nm-rhead">Summary</div><div class="nm-sum-body"></div></div>' +
      '<div class="nm-result nm-var-wrap"><div class="nm-rhead">3 Variations</div><div class="nm-var-list"></div></div>' +
      '<div class="nm-foot">' +
        '<button class="nm-regen" data-action="reply">Regenerate</button>' +
        '<span class="nm-foot-tag">groq llama-3.3-70b · research</span>' +
      '</div>' +
    '</div>';

    var toneEl = panel.querySelector('.nm-tone');
    var lenEl  = panel.querySelector('.nm-len');
    if (toneEl) toneEl.value = intent.tone   || 'professional';
    if (lenEl)  lenEl.value  = intent.length || 'medium';

    if (email && hasInjection(email))
        panel.querySelector('.nm-inject-warn').style.display = 'block';

    panel.querySelector('.nm-x').onclick = function(){ closePanel(panel, fab); };

    panel.querySelectorAll('[data-mode]').forEach(function(btn) {
        btn.onclick = function() {
            panel._intentMode = btn.dataset.mode;
            panel.querySelectorAll('[data-mode]').forEach(function(b){ b.className = 'nm-toggle-btn'; });
            btn.classList.add(panel._intentMode === 'baseline' ? 'active-baseline' : 'active-proposed');
            panel.querySelector('.nm-gen-hint-txt').textContent =
                panel._intentMode === 'baseline' ? 'Baseline: single generic prompt' : 'Proposed: intent-aware prompt';
        };
    });

    panel.querySelectorAll('[data-tab]').forEach(function(tab) {
        tab.onclick = function() {
            panel.querySelectorAll('[data-tab]').forEach(function(t){ t.className = 'nm-dual-tab'; });
            var isBase = tab.dataset.tab === 'baseline';
            tab.classList.add(isBase ? 'active-b' : 'active-p');
            panel.querySelector('.nm-dual-content').textContent = isBase ? panel._baselineReply : panel._proposedReply;
        };
    });

    panel.querySelectorAll('[data-use]').forEach(function(btn) {
        btn.onclick = function() {
            var text = btn.dataset.use === 'baseline' ? panel._baselineReply : panel._proposedReply;
            if (!text) { toast('Generate a reply first', 'err'); return; }
            if (!insertCompose(text)) { toast('Click Reply in Gmail first', 'err'); return; }
            toast('Reply inserted', 'ok');
        };
    });

    panel.querySelectorAll('[data-action]').forEach(function(b){
        b.onclick = function(){ handleAction(b.dataset.action, panel, fab); };
    });

    panel.querySelectorAll('[data-fill]').forEach(function(chip){
        chip.onclick = function(){ panel.querySelector('.nm-pinput').value = chip.dataset.fill; };
    });

    panel.querySelector('.nm-pclr').onclick = function(){ panel.querySelector('.nm-pinput').value = ''; };

    return panel;
}

function renderExplainability(panel, data) {
    var box = panel.querySelector('.nm-explain');
    if (!box) return;
    box.querySelector('.nm-explain-intent').innerHTML = 'Intent: <span>' + (data.intent || '') + '</span>';
    box.querySelector('.nm-explain-reason').innerHTML = 'Reason: <span>' + (data.intentReason || '') + '</span>';
    box.querySelector('.nm-explain-prompt').innerHTML = 'Template: <span>' + (data.promptUsed || '') + '</span>';
    var kwRow = box.querySelector('.nm-explain-kw');
    if (data.keywordsFound && data.keywordsFound !== 'none') {
        kwRow.innerHTML = 'Keywords: ' + data.keywordsFound.split(',').map(function(k){
            return '<span class="nm-kw">' + k.trim() + '</span>';
        }).join('');
    } else {
        kwRow.innerHTML = 'Keywords: <span>none</span>';
    }
    box.style.display = 'block';
}

function closePanel(panel, fab) {
    panel.style.animation = 'nmOut .22s ease both';
    fab.classList.remove('open', 'busy');
    setTimeout(function(){ panel.remove(); }, 220);
}

function clampPanel(panel) {
    var pw = panel.offsetWidth || 372, ph = panel.offsetHeight || 500;
    var vw = window.innerWidth, vh = window.innerHeight;
    var t = parseInt(panel.style.top) || 0, l = parseInt(panel.style.left) || 0;
    if (t < 8) t = 8; if (l < 8) l = 8;
    if (l + pw > vw - 8) l = vw - pw - 8;
    if (t + ph > vh - 8) t = vh - ph - 8;
    panel.style.top = t + 'px'; panel.style.left = l + 'px';
}

function makeDraggable(panel) {
    var header = panel.querySelector('.nm-head');
    if (!header) return;
    var dragging = false, ox = 0, oy = 0;
    header.addEventListener('mousedown', function(e){
        if (e.target.closest('.nm-x,.nm-badge')) return;
        dragging = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop;
        panel.style.transition = 'none'; e.preventDefault();
    });
    document.addEventListener('mousemove', function(e){
        if (!dragging) return;
        panel.style.left = (e.clientX - ox) + 'px';
        panel.style.top  = (e.clientY - oy) + 'px';
        clampPanel(panel);
    });
    document.addEventListener('mouseup', function(){
        if (dragging){ dragging = false; panel.style.transition = ''; }
    });
}

function positionPanel(panel, fab) {
    document.body.appendChild(panel);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
        var r = fab.getBoundingClientRect(), pw = 372, ph = panel.offsetHeight || 500;
        var vw = window.innerWidth, vh = window.innerHeight;
        var top = r.top - ph - 12, left = r.right - pw;
        if (top < 8) top = r.bottom + 10;
        if (top + ph > vh - 8) top = Math.max(8, Math.floor((vh - ph) / 2));
        if (left < 8) left = 8;
        if (left + pw > vw - 8) left = vw - pw - 8;
        panel.style.top = top + 'px'; panel.style.left = left + 'px';
        makeDraggable(panel);
        window.addEventListener('resize', function(){ clampPanel(panel); });
    }); });
}

function handleAction(action, panel, fab) {
    fab.classList.add('busy');
    var tone       = (panel.querySelector('.nm-tone') || {}).value || 'professional';
    var len        = (panel.querySelector('.nm-len')  || {}).value || 'medium';
    var custom     = (panel.querySelector('.nm-pinput') || {}).value || '';
    var intentMode = panel._intentMode || 'proposed';

    (async function(){
        try {
            if (action === 'reply' || action === 'followup') {
                var ec = getEmailContent();
                if (!ec) { toast('Open an email thread first', 'err'); return; }
                var thread = getThreadContext();
                var t = toast((intentMode === 'proposed' ? 'Proposed' : 'Baseline') + ' - generating...', 'load');
                var res = await callBg({
                    type: action === 'followup' ? 'FOLLOWUP_EMAIL' : 'GENERATE_REPLY',
                    emailContent: ec, threadContext: thread,
                    tone: tone, replyLength: len,
                    customPrompt: custom, intentMode: intentMode
                });
                t.remove();
                var reply = res.aiReply || res.result || '';
                if (!reply) { toast('Empty response - try again', 'err'); return; }
                if (res.intent) renderExplainability(panel, res);
                if (res.intent) {
                    var badge = panel.querySelector('.nm-badge');
                    if (badge) badge.textContent = res.intent;
                }
                if (!insertCompose(reply)) { toast('Click Reply in Gmail first', 'err'); return; }
                toast('Reply inserted', 'ok');

            } else if (action === 'rewrite') {
                var ec = (getComposeBox() || {}).innerText || ''; ec = ec.trim();
                if (ec.length < 5){ toast('Type a draft in compose first', 'err'); return; }
                var t = toast('Rewriting...', 'load');
                var res = await callBg({ type: 'REWRITE_EMAIL', emailContent: ec, tone: tone });
                t.remove(); insertCompose(res.result); toast('Rewritten', 'ok');

            } else if (action === 'improve') {
                var ec = (getComposeBox() || {}).innerText || ''; ec = ec.trim();
                if (ec.length < 5){ toast('Type a draft first', 'err'); return; }
                var t = toast('Improving...', 'load');
                var res = await callBg({ type: 'IMPROVE_EMAIL', emailContent: ec });
                t.remove(); insertCompose(res.result); toast('Improved', 'ok');

            } else if (action === 'summarize') {
                var ec = getEmailContent();
                if (!ec){ toast('Open an email first', 'err'); return; }
                var t = toast('Summarizing...', 'load');
                var res = await callBg({ type: 'SUMMARIZE_EMAIL', emailContent: ec });
                t.remove();
                var w = panel.querySelector('.nm-sum-wrap');
                w.querySelector('.nm-sum-body').innerHTML = res.result.replace(/\n/g, '<br>');
                w.style.display = 'block';
                toast('Summary ready', 'ok');

            } else if (action === 'variations') {
                var ec = getEmailContent();
                if (!ec){ toast('Open an email first', 'err'); return; }
                var t = toast('Generating 3 variations...', 'load');
                var res = await callBg({ type: 'GENERATE_VARIATIONS', emailContent: ec, tone: tone, customPrompt: custom });
                t.remove(); renderVariations(panel, res.variations || []);
                toast('3 variations ready', 'ok');
            }
        } catch(err) {
            toast(err.message || 'Something went wrong', 'err');
        } finally {
            fab.classList.remove('busy');
        }
    })();
}

function renderVariations(panel, vars) {
    var list = panel.querySelector('.nm-var-list'), wrap = panel.querySelector('.nm-var-wrap');
    wrap.style.display = 'block'; list.innerHTML = '';
    ['Formal', 'Friendly', 'Concise'].forEach(function(lbl, i){
        var text = (vars[i] || '').trim();
        var d = document.createElement('div'); d.className = 'nm-var-item';
        d.innerHTML = '<div class="nm-var-tag">' + lbl + '</div>' +
            '<div class="nm-var-txt">' + (text.slice(0, 120) + (text.length > 120 ? '...' : '')) + '</div>' +
            '<button class="nm-var-use">Use this reply</button>';
        d.querySelector('.nm-var-use').onclick = function(e){
            e.stopPropagation(); insertCompose(text); toast('Inserted', 'ok');
        };
        d.onclick = function(){
            list.querySelectorAll('.nm-var-item').forEach(function(x){ x.classList.remove('sel'); });
            d.classList.toggle('sel');
        };
        list.appendChild(d);
    });
}

function injectFAB(toolbar) {
    if (!toolbar || toolbar.querySelector('.nm-fab')) return;
    var sendBtn =
        toolbar.querySelector('div[role="button"].T-I.J-J5-Ji.aoO.v7') ||
        toolbar.querySelector('[data-tooltip="Send"]') ||
        toolbar.querySelector('.T-I.J-J5-Ji.aoO');
    if (!sendBtn) return;
    injectStyles();
    var wrap = document.createElement('div'); wrap.className = 'nm-wrap';
    var fab  = document.createElement('button'); fab.className = 'nm-fab'; fab.title = 'NeuralMail AI';
    fab.innerHTML =
        '<div class="nm-fab-bg"></div>' +
        '<div class="nm-fab-inner">' +
            '<svg width="15" height="15" viewBox="0 0 14 14" fill="none">' +
                '<path d="M2 3.5h10M2 7h7M2 10.5h4.5" stroke="white" stroke-width="1.9" stroke-linecap="round"/>' +
            '</svg>' +
        '</div>';
    var active = null;
    fab.onclick = function(e){
        e.stopPropagation();
        if (active){ closePanel(active, fab); active = null; return; }
        fab.classList.add('open');
        var panel = buildPanel(fab);
        positionPanel(panel, fab);
        active = panel;
        setTimeout(function(){
            function out(ev){
                if (!panel.contains(ev.target) && ev.target !== fab){
                    closePanel(panel, fab); active = null;
                    document.removeEventListener('click', out, true);
                }
            }
            document.addEventListener('click', out, true);
        }, 180);
    };
    wrap.appendChild(fab);
    var ins = sendBtn; var nx = sendBtn.nextElementSibling;
    if (nx && (nx.classList.contains('T-I-Js-Gs') || nx.getAttribute('role') === 'button')) ins = nx;
    if (ins.nextSibling) ins.parentNode.insertBefore(wrap, ins.nextSibling);
    else ins.parentNode.appendChild(wrap);
}

function scan(){
    document.querySelectorAll('.gU.Up').forEach(injectFAB);
    document.querySelectorAll('[role="dialog"]').forEach(function(d){
        var t = d.querySelector('.gU.Up'); if(t) injectFAB(t);
    });
}
new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
setTimeout(scan, 800); setTimeout(scan, 2500);