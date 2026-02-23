/* ════════════════════════════════════════
   MEDIASSIST AI — script.js
   Routes: POST /search  |  POST /image-search
   ════════════════════════════════════════ */

/* 1. PARTICLES */
(function spawnParticles() {
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;--dur:${7+Math.random()*10}s;--delay:${Math.random()*10}s;opacity:0;`;
    document.body.appendChild(p);
  }
})();

/* 2. LIVE CLOCK */
function updateClock() {
  const chip = document.getElementById('timeChip');
  if (chip) chip.textContent = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
updateClock();
setInterval(updateClock, 1000);

/* 3. HISTORY */
let queryHistory = JSON.parse(localStorage.getItem('mediHistory') || '[]');
let sessionCount = 0;

function saveHistory(query) {
  queryHistory.unshift({ text: query, time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) });
  if (queryHistory.length > 20) queryHistory.pop();
  localStorage.setItem('mediHistory', JSON.stringify(queryHistory));
  renderHistory();
}

function renderHistory() {
  const icons = ['💊','🩺','🧬','🩸','🔬','💉','🫀','🧠'];
  const list  = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = queryHistory.map((item, i) => `
    <div class="history-item slide-in" onclick="fillAndSearch('${item.text.replace(/'/g,"\\'")}')" style="animation-delay:${i*0.05}s">
      <div class="history-item-icon">${icons[i%icons.length]}</div>
      <div class="history-item-text">
        <div>${item.text.substring(0,36)}${item.text.length>36?'…':''}</div>
        <div style="font-size:10px;margin-top:2px;opacity:0.5">${item.time}</div>
      </div>
    </div>`).join('');
}

function clearHistory() {
  queryHistory = [];
  localStorage.removeItem('mediHistory');
  renderHistory();
  showToast('History cleared');
}
renderHistory();

/* 4. QUICK FILL */
function fillAndSearch(text) {
  const input = document.getElementById('searchInput');
  if (input) input.value = text;
  searchText();
}

/* ════════════════════════════════════════
   5. TEXT SEARCH  →  POST /search
   ════════════════════════════════════════ */
async function searchText() {
  const input   = document.getElementById('searchInput');
  const sendBtn = document.getElementById('sendBtn');
  const results = document.getElementById('results');
  const query   = input.value.trim();
  if (!query) return;

  sendBtn.classList.add('loading');
  input.value = '';
  sessionCount++;
  const counter = document.getElementById('sessionCount');
  if (counter) counter.textContent = sessionCount;
  saveHistory(query);

  const welcome = document.getElementById('welcomeScreen');
  if (welcome) welcome.remove();

  // User bubble
  const block = document.createElement('div');
  block.className = 'chat-block';
  block.innerHTML = `<div class="user-query"><div class="user-bubble">${escapeHtml(query)}</div></div>`;
  results.appendChild(block);

  // Typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'ai-response';
  typingEl.style.maxWidth = '240px';
  typingEl.innerHTML = `
    <div class="ai-label">MediAssist AI</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>`;
  block.appendChild(typingEl);
  results.scrollTop = results.scrollHeight;

  try {
    const res  = await fetch('/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.answer || 'Server error');

    // Replace typing with real answer
    typingEl.outerHTML = `
      <div class="ai-response">
        <div class="ai-label">MediAssist AI</div>
        <div class="formatted-response">${data.answer}</div>
      </div>`;

  } catch (err) {
    typingEl.outerHTML = `
      <div class="ai-response">
        <div class="ai-label">MediAssist AI</div>
        <div class="formatted-response">
          <strong style="color:var(--red)">⚠️ Error:</strong> ${escapeHtml(err.message)}
        </div>
      </div>`;
  }

  sendBtn.classList.remove('loading');
  results.scrollTop = results.scrollHeight;
}

/* ════════════════════════════════════════
   6. IMAGE UPLOAD  →  POST /image-search
   ════════════════════════════════════════ */
function handleImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file   = input.files[0];
  const reader = new FileReader();

  reader.onload = async function(e) {
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.remove();

    const results = document.getElementById('results');
    const sendBtn = document.getElementById('sendBtn');

    // Show image preview
    const block = document.createElement('div');
    block.className = 'chat-block';
    block.innerHTML = `
      <div class="user-query">
        <div class="user-bubble">
          <div style="font-size:11px;opacity:0.7;margin-bottom:6px">📎 Image uploaded</div>
          <img src="${e.target.result}" class="preview-img" alt="Uploaded medical image" />
        </div>
      </div>`;
    results.appendChild(block);

    // Typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-response';
    typingEl.style.maxWidth = '240px';
    typingEl.innerHTML = `
      <div class="ai-label">MediAssist AI</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div>`;
    block.appendChild(typingEl);
    results.scrollTop = results.scrollHeight;
    sendBtn.classList.add('loading');

    try {
      const formData = new FormData();
      formData.append('image', file);                          // key = "image" matches Flask
      formData.append('query', 'Analyze this medical image.');

      const res  = await fetch('/image-search', {
        method: 'POST',
        body:   formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.answer || 'Server error');

      typingEl.outerHTML = `
        <div class="ai-response">
          <div class="ai-label">MediAssist AI</div>
          <div class="formatted-response">${data.answer}</div>
        </div>`;

    } catch (err) {
      typingEl.outerHTML = `
        <div class="ai-response">
          <div class="ai-label">MediAssist AI</div>
          <div class="formatted-response">
            <strong style="color:var(--red)">⚠️ Error:</strong> ${escapeHtml(err.message)}
          </div>
        </div>`;
    }

    sendBtn.classList.remove('loading');
    results.scrollTop = results.scrollHeight;
    input.value = '';
    saveHistory('📎 Medical image uploaded');
  };

  reader.readAsDataURL(file);
}

/* 7. VOICE */
function startVoice() {
  const btn = document.getElementById('voiceBtn');
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showToast('Voice input not supported in this browser'); return;
  }
  const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
  btn.classList.add('listening'); btn.textContent = '🔴';
  rec.onresult = (e) => {
    const input = document.getElementById('searchInput');
    if (input) input.value = e.results[0][0].transcript;
    btn.classList.remove('listening'); btn.textContent = '🎤';
  };
  rec.onerror = rec.onend = () => { btn.classList.remove('listening'); btn.textContent = '🎤'; };
  rec.start();
}

/* 8. HELPERS */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function showToast(message) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--border);color:var(--text);padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;animation:fadeUp 0.3s ease;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:'DM Sans',sans-serif;`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2500);
}