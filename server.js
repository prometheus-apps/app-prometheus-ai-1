const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const sql = neon(process.env.DATABASE_URL);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ideas (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init failed:', err);
    throw err;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── IDEA INPUT SCREEN ──────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prometheus AI — Your Idea. Our Agents.</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    * { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    body { background: #080b12; }
    .grid-bg {
      background-image: 
        linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .glow-purple {
      box-shadow: 0 0 30px rgba(139,92,246,0.3), 0 0 60px rgba(139,92,246,0.1);
    }
    .glow-purple:hover {
      box-shadow: 0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.2);
    }
    .textarea-dark {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(139,92,246,0.2);
      transition: all 0.3s ease;
    }
    .textarea-dark:focus {
      background: rgba(255,255,255,0.06);
      border-color: rgba(139,92,246,0.6);
      box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
      outline: none;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    .float { animation: float 4s ease-in-out infinite; }
    @keyframes pulse-slow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    .pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
    @keyframes orbit {
      from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
      to { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
    }
    .orbit-1 { animation: orbit 6s linear infinite; }
    .orbit-2 { animation: orbit 9s linear infinite reverse; }
    .orbit-3 { animation: orbit 12s linear infinite; }
  </style>
</head>
<body class="grid-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">

  <!-- Ambient glow orbs -->
  <div class="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full opacity-5 blur-3xl pointer-events-none"></div>
  <div class="fixed bottom-1/4 right-1/4 w-96 h-96 bg-violet-500 rounded-full opacity-5 blur-3xl pointer-events-none"></div>

  <!-- Header -->
  <div class="mb-12 text-center">
    <div class="flex items-center justify-center gap-3 mb-6">
      <!-- Animated logo -->
      <div class="relative w-12 h-12">
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-4 h-4 bg-purple-400 rounded-full pulse-slow"></div>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-2 h-2 bg-white rounded-full orbit-1"></div>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-violet-300 rounded-full orbit-2"></div>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-1 h-1 bg-purple-200 rounded-full orbit-3"></div>
        </div>
      </div>
      <span class="text-2xl font-bold text-white tracking-tight">Prometheus <span class="text-purple-400">AI</span></span>
    </div>
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
      Your idea.<br>
      <span class="text-purple-400">Our agents.</span><br>
      <span class="text-gray-400 text-3xl md:text-4xl font-normal">A company that runs itself.</span>
    </h1>
    <p class="text-gray-500 text-lg max-w-xl mx-auto mt-4">
      Describe your business idea. Our AI agents will build your strategy, identify your market, and map your first steps — in seconds.
    </p>
  </div>

  <!-- Input Card -->
  <div class="w-full max-w-2xl">
    <div class="bg-gray-900 bg-opacity-80 border border-purple-900 border-opacity-50 rounded-2xl p-8 backdrop-blur-sm">
      <div class="flex items-center gap-2 mb-6">
        <div class="w-3 h-3 rounded-full bg-red-500 opacity-70"></div>
        <div class="w-3 h-3 rounded-full bg-yellow-500 opacity-70"></div>
        <div class="w-3 h-3 rounded-full bg-green-500 opacity-70"></div>
        <span class="mono text-gray-600 text-sm ml-2">idea_input.sh</span>
      </div>

      <form id="idea-form" action="/api/submit-idea" method="POST">
        <div class="mb-6">
          <label class="block text-gray-400 text-sm font-medium mb-3 mono">
            <span class="text-purple-400">$</span> describe_your_idea
          </label>
          <textarea
            name="idea"
            id="idea-input"
            rows="5"
            required
            minlength="10"
            placeholder="e.g. A subscription service that delivers curated vintage records to music lovers every month, paired with exclusive liner notes and artist stories..."
            class="textarea-dark w-full rounded-xl px-5 py-4 text-white text-base placeholder-gray-600 resize-none"
          ></textarea>
          <div class="flex justify-between mt-2">
            <span class="text-gray-600 text-xs mono">10 characters minimum</span>
            <span id="char-count" class="text-gray-600 text-xs mono">0 chars</span>
          </div>
        </div>

        <button
          type="submit"
          id="submit-btn"
          class="glow-purple w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 flex items-center justify-center gap-3"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Deploy Agents
        </button>
      </form>

      <div class="mt-6 flex items-center justify-center gap-6 text-xs text-gray-600">
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span> Market Research</span>
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block"></span> Strategy Planning</span>
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-purple-400 rounded-full inline-block"></span> Task Generation</span>
      </div>
    </div>
  </div>

  <!-- Social proof -->
  <p class="mt-10 text-gray-700 text-sm">Join founders turning ideas into operating companies &mdash; powered by AI agents</p>

  <script>
    const textarea = document.getElementById('idea-input');
    const charCount = document.getElementById('char-count');
    const form = document.getElementById('idea-form');
    const btn = document.getElementById('submit-btn');

    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length + ' chars';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idea = textarea.value.trim();
      if (idea.length < 10) return;

      btn.disabled = true;
      btn.innerHTML = '<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Initializing Agents...';
      btn.className = btn.className.replace('bg-purple-600 hover:bg-purple-500', 'bg-purple-800 cursor-not-allowed');

      try {
        const res = await fetch('/api/submit-idea', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = '/processing?id=' + data.id;
        } else {
          btn.disabled = false;
          btn.textContent = 'Deploy Agents';
          alert('Error: ' + data.error);
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Deploy Agents';
        alert('Something went wrong. Please try again.');
      }
    });
  </script>
</body>
</html>`);
});

// ── API: Submit Idea ───────────────────────────────────────
app.post('/api/submit-idea', async (req, res) => {
  const { idea } = req.body;
  if (!idea || idea.trim().length < 10) {
    return res.status(400).json({ success: false, error: 'Idea must be at least 10 characters' });
  }
  try {
    const [row] = await sql`
      INSERT INTO ideas (text) VALUES (${idea.trim()})
      RETURNING id
    `;
    res.json({ success: true, id: row.id });
  } catch (err) {
    console.error('Submit idea error:', err);
    res.status(500).json({ success: false, error: 'Failed to save idea' });
  }
});

// ── PROCESSING SCREEN ─────────────────────────────────────
app.get('/processing', (req, res) => {
  const id = parseInt(req.query.id) || 0;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prometheus AI — Agents at Work</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    * { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    body { background: #060910; }
    @keyframes scanline {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }
    .scanline {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0,255,200,0.15), transparent);
      animation: scanline 4s linear infinite;
      pointer-events: none;
      z-index: 100;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .cursor { animation: blink 1s step-end infinite; }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .log-entry { animation: fadeSlideIn 0.4s ease forwards; }
    .grid-bg {
      background-image:
        linear-gradient(rgba(0,255,200,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,200,0.02) 1px, transparent 1px);
      background-size: 30px 30px;
    }
    .agent-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(0,255,200,0.1);
      transition: all 0.5s ease;
    }
    .agent-card.active {
      background: rgba(0,255,200,0.05);
      border-color: rgba(0,255,200,0.4);
      box-shadow: 0 0 20px rgba(0,255,200,0.1);
    }
    .agent-card.done {
      background: rgba(0,255,100,0.04);
      border-color: rgba(0,255,100,0.3);
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner { animation: spin 1s linear infinite; }
    @keyframes progressFill {
      from { width: 0%; }
      to { width: 100%; }
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #00ffcc, #7c3aed);
      border-radius: 9999px;
      transition: width 0.5s ease;
    }
    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 10px rgba(0,255,200,0.3); }
      50% { box-shadow: 0 0 30px rgba(0,255,200,0.7), 0 0 60px rgba(0,255,200,0.3); }
    }
    .glow-cyan { animation: glowPulse 2s ease-in-out infinite; }
  </style>
</head>
<body class="grid-bg min-h-screen text-white">
  <div class="scanline"></div>

  <div class="min-h-screen flex flex-col items-center justify-center px-4 py-16">
    
    <!-- Header -->
    <div class="text-center mb-12">
      <div class="flex items-center justify-center gap-2 mb-4">
        <div class="w-2 h-2 bg-cyan-400 rounded-full glow-cyan"></div>
        <span class="mono text-cyan-400 text-sm tracking-widest uppercase">System Active</span>
      </div>
      <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">Agents <span class="text-cyan-400">Deploying</span></h1>
      <p class="text-gray-500 mono text-sm">Your company is being assembled in real-time</p>
    </div>

    <!-- Agent Grid -->
    <div class="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
      <div id="agent-market" class="agent-card rounded-xl p-5">
        <div class="flex items-center gap-3 mb-3">
          <div id="icon-market" class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-lg">🔍</div>
          <div>
            <div class="text-white text-sm font-semibold">Market Agent</div>
            <div id="status-market" class="mono text-gray-600 text-xs">standby</div>
          </div>
        </div>
        <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div id="prog-market" class="progress-bar-fill" style="width:0%"></div>
        </div>
      </div>

      <div id="agent-strategy" class="agent-card rounded-xl p-5">
        <div class="flex items-center gap-3 mb-3">
          <div id="icon-strategy" class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-lg">🧠</div>
          <div>
            <div class="text-white text-sm font-semibold">Strategy Agent</div>
            <div id="status-strategy" class="mono text-gray-600 text-xs">standby</div>
          </div>
        </div>
        <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div id="prog-strategy" class="progress-bar-fill" style="width:0%"></div>
        </div>
      </div>

      <div id="agent-tasks" class="agent-card rounded-xl p-5">
        <div class="flex items-center gap-3 mb-3">
          <div id="icon-tasks" class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-lg">⚡</div>
          <div>
            <div class="text-white text-sm font-semibold">Task Agent</div>
            <div id="status-tasks" class="mono text-gray-600 text-xs">standby</div>
          </div>
        </div>
        <div class="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div id="prog-tasks" class="progress-bar-fill" style="width:0%"></div>
        </div>
      </div>
    </div>

    <!-- Live Activity Feed -->
    <div class="w-full max-w-3xl">
      <div class="bg-black bg-opacity-60 border border-cyan-900 border-opacity-40 rounded-2xl overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3 border-b border-cyan-900 border-opacity-30">
          <div class="w-2.5 h-2.5 rounded-full bg-red-500 opacity-70"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-70"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-green-500 opacity-70"></div>
          <span class="mono text-gray-600 text-xs ml-2">prometheus_agent.log</span>
          <div class="ml-auto flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            <span class="mono text-green-400 text-xs">LIVE</span>
          </div>
        </div>
        <div id="log-feed" class="px-5 py-4 space-y-2 min-h-64 max-h-80 overflow-y-auto">
          <div class="mono text-cyan-400 text-sm"><span class="text-gray-600">00:00</span> Prometheus AI v2.1 — Agent Runtime Initialized<span class="cursor">_</span></div>
        </div>
      </div>
    </div>

    <!-- Overall Progress -->
    <div class="w-full max-w-3xl mt-6">
      <div class="flex justify-between mono text-xs text-gray-600 mb-2">
        <span>Overall Progress</span>
        <span id="progress-pct">0%</span>
      </div>
      <div class="h-2 bg-gray-900 rounded-full overflow-hidden">
        <div id="overall-prog" class="progress-bar-fill" style="width:0%; transition: width 0.8s ease;"></div>
      </div>
    </div>
  </div>

  <script>
    const ideaId = ${id};
    const logFeed = document.getElementById('log-feed');
    let startTime = Date.now();

    function timestamp() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      return mins + ':' + secs;
    }

    function addLog(msg, color) {
      const colors = {
        cyan: 'text-cyan-400',
        green: 'text-green-400',
        yellow: 'text-yellow-400',
        purple: 'text-purple-400',
        gray: 'text-gray-500',
        white: 'text-white',
      };
      const div = document.createElement('div');
      div.className = 'log-entry mono text-sm ' + (colors[color] || 'text-gray-300');
      div.innerHTML = '<span class="text-gray-600">' + timestamp() + '</span> ' + msg;
      logFeed.appendChild(div);
      logFeed.scrollTop = logFeed.scrollHeight;
    }

    function setAgent(name, state) {
      const card = document.getElementById('agent-' + name);
      const status = document.getElementById('status-' + name);
      const prog = document.getElementById('prog-' + name);
      card.classList.remove('active', 'done');
      if (state === 'active') {
        card.classList.add('active');
        status.textContent = 'running...';
        status.className = 'mono text-cyan-400 text-xs';
        prog.style.width = '60%';
      } else if (state === 'done') {
        card.classList.add('done');
        status.textContent = 'complete ✓';
        status.className = 'mono text-green-400 text-xs';
        prog.style.width = '100%';
      }
    }

    function setProgress(pct) {
      document.getElementById('overall-prog').style.width = pct + '%';
      document.getElementById('progress-pct').textContent = pct + '%';
    }

    const sequence = [
      { delay: 500,  fn: () => { addLog('Scanning idea input...', 'cyan'); setProgress(5); } },
      { delay: 1200, fn: () => { addLog('Tokenizing business concept — 3 entities detected', 'gray'); } },
      { delay: 1800, fn: () => { addLog('[MARKET AGENT] Spawning research subprocess...', 'purple'); setAgent('market', 'active'); setProgress(12); } },
      { delay: 2400, fn: () => { addLog('[MARKET AGENT] Querying TAM/SAM/SOM datasets...', 'cyan'); } },
      { delay: 3100, fn: () => { addLog('[MARKET AGENT] Identifying competitor landscape...', 'cyan'); } },
      { delay: 3700, fn: () => { addLog('[MARKET AGENT] Segmenting target demographics...', 'cyan'); setProgress(25); } },
      { delay: 4300, fn: () => { addLog('[MARKET AGENT] ICP profile generated — confidence: 94%', 'green'); setAgent('market', 'done'); setProgress(33); } },
      { delay: 4900, fn: () => { addLog('[STRATEGY AGENT] Spawning planning subprocess...', 'purple'); setAgent('strategy', 'active'); } },
      { delay: 5500, fn: () => { addLog('[STRATEGY AGENT] Analyzing competitive positioning...', 'cyan'); setProgress(45); } },
      { delay: 6100, fn: () => { addLog('[STRATEGY AGENT] Modeling revenue streams...', 'cyan'); } },
      { delay: 6700, fn: () => { addLog('[STRATEGY AGENT] Drafting go-to-market playbook...', 'cyan'); setProgress(58); } },
      { delay: 7300, fn: () => { addLog('[STRATEGY AGENT] Strategy locked — 3 growth vectors identified', 'green'); setAgent('strategy', 'done'); setProgress(66); } },
      { delay: 7900, fn: () => { addLog('[TASK AGENT] Spawning execution planner...', 'purple'); setAgent('tasks', 'active'); } },
      { delay: 8500, fn: () => { addLog('[TASK AGENT] Mapping critical path to first revenue...', 'cyan'); setProgress(75); } },
      { delay: 9100, fn: () => { addLog('[TASK AGENT] Prioritizing by impact-to-effort ratio...', 'cyan'); } },
      { delay: 9700, fn: () => { addLog('[TASK AGENT] Generating week-1 action items...', 'cyan'); setProgress(88); } },
      { delay: 10300,fn: () => { addLog('[TASK AGENT] 5 high-priority tasks queued', 'green'); setAgent('tasks', 'done'); setProgress(95); } },
      { delay: 10900,fn: () => { addLog('Compiling company plan...', 'cyan'); } },
      { delay: 11500,fn: () => { addLog('\u2714 All agents complete. Company initialized.', 'green'); setProgress(100); } },
      { delay: 12200,fn: () => { window.location.href = '/dashboard?id=' + ideaId; } },
    ];

    sequence.forEach(({ delay, fn }) => setTimeout(fn, delay));
  </script>
</body>
</html>`);
});

// ── DASHBOARD SCREEN ───────────────────────────────────────
app.get('/dashboard', async (req, res) => {
  const id = parseInt(req.query.id) || 0;
  let ideaText = 'Your business idea';

  try {
    if (id > 0) {
      const [row] = await sql`SELECT text FROM ideas WHERE id = ${id}`;
      if (row) ideaText = row.text;
    }
  } catch (err) {
    console.error('Fetch idea error:', err);
  }

  // Generate a dynamic-feeling plan from the idea text
  const plan = generatePlan(ideaText);

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prometheus AI — Command Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    * { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    body { background: #060910; }
    .grid-bg {
      background-image:
        linear-gradient(rgba(139,92,246,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(139,92,246,0.025) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
    }
    .card-purple {
      background: rgba(139,92,246,0.08);
      border: 1px solid rgba(139,92,246,0.2);
    }
    .card-cyan {
      background: rgba(0,255,200,0.05);
      border: 1px solid rgba(0,255,200,0.15);
    }
    .card-green {
      background: rgba(0,255,100,0.05);
      border: 1px solid rgba(0,255,100,0.15);
    }
    .badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.65rem;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .section-1 { animation: fadeIn 0.5s ease forwards; }
    .section-2 { animation: fadeIn 0.5s ease 0.15s forwards; opacity: 0; }
    .section-3 { animation: fadeIn 0.5s ease 0.3s forwards; opacity: 0; }
    .section-4 { animation: fadeIn 0.5s ease 0.45s forwards; opacity: 0; }
    .section-5 { animation: fadeIn 0.5s ease 0.6s forwards; opacity: 0; }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
    .task-item {
      border-left: 2px solid rgba(139,92,246,0.3);
      transition: all 0.2s ease;
    }
    .task-item:hover {
      border-left-color: rgba(139,92,246,0.8);
      background: rgba(139,92,246,0.05);
    }
    .glow-text-purple { text-shadow: 0 0 20px rgba(139,92,246,0.5); }
    .glow-text-cyan { text-shadow: 0 0 20px rgba(0,255,200,0.5); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }
  </style>
</head>
<body class="grid-bg min-h-screen text-white">

  <!-- Top Nav -->
  <nav class="border-b border-white border-opacity-5 px-6 py-4">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <span class="font-bold text-white">Prometheus <span class="text-purple-400">AI</span></span>
        <span class="text-gray-700 mx-2">|</span>
        <span class="mono text-gray-500 text-xs">command_center</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
          <span class="mono text-green-400 text-xs">3 agents active</span>
        </div>
        <a href="/" class="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          New Idea
        </a>
      </div>
    </div>
  </nav>

  <div class="max-w-6xl mx-auto px-6 py-8">

    <!-- Idea Header -->
    <div class="section-1 mb-8">
      <div class="flex items-start gap-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="badge bg-green-900 text-green-400 border border-green-700">INITIALIZED</span>
            <span class="mono text-gray-600 text-xs">idea_id: #${id}</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">${escapeHtml(plan.companyName)}</h1>
          <p class="text-gray-400 text-sm max-w-2xl leading-relaxed">&ldquo;${escapeHtml(ideaText)}&rdquo;</p>
        </div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="section-2 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="card rounded-xl p-4">
        <div class="mono text-gray-600 text-xs mb-1">market size</div>
        <div class="text-xl font-bold text-white glow-text-purple">${escapeHtml(plan.marketSize)}</div>
      </div>
      <div class="card rounded-xl p-4">
        <div class="mono text-gray-600 text-xs mb-1">confidence</div>
        <div class="text-xl font-bold text-cyan-400 glow-text-cyan">${plan.confidence}%</div>
      </div>
      <div class="card rounded-xl p-4">
        <div class="mono text-gray-600 text-xs mb-1">time to revenue</div>
        <div class="text-xl font-bold text-white">${escapeHtml(plan.timeToRevenue)}</div>
      </div>
      <div class="card rounded-xl p-4">
        <div class="mono text-gray-600 text-xs mb-1">growth vector</div>
        <div class="text-xl font-bold text-purple-400">${escapeHtml(plan.growthVector)}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Left Column -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Strategy Overview -->
        <div class="section-3 card-purple rounded-2xl p-6">
          <div class="flex items-center gap-2 mb-5">
            <span class="text-purple-400 text-lg">🧠</span>
            <h2 class="font-semibold text-white">Strategy Overview</h2>
            <span class="badge bg-purple-900 text-purple-300 border border-purple-700 ml-auto">AI GENERATED</span>
          </div>
          <p class="text-gray-300 text-sm leading-relaxed mb-4">${escapeHtml(plan.strategy)}</p>
          <div class="grid grid-cols-3 gap-3 mt-4">
            ${plan.strategyPillars.map(p => `
            <div class="bg-purple-900 bg-opacity-30 rounded-xl p-3">
              <div class="text-purple-300 text-xs font-semibold mb-1">${escapeHtml(p.label)}</div>
              <div class="text-white text-sm">${escapeHtml(p.value)}</div>
            </div>
            `).join('')}
          </div>
        </div>

        <!-- Target Market -->
        <div class="section-4 card-cyan rounded-2xl p-6">
          <div class="flex items-center gap-2 mb-5">
            <span class="text-cyan-400 text-lg">🎯</span>
            <h2 class="font-semibold text-white">Target Market</h2>
          </div>
          <p class="text-gray-300 text-sm leading-relaxed mb-5">${escapeHtml(plan.targetMarket)}</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="mono text-cyan-400 text-xs mb-2">PRIMARY SEGMENT</div>
              <ul class="space-y-1.5">
                ${plan.primarySegment.map(s => `<li class="text-gray-300 text-sm flex items-start gap-2"><span class="text-cyan-500 mt-0.5">›</span>${escapeHtml(s)}</li>`).join('')}
              </ul>
            </div>
            <div>
              <div class="mono text-cyan-400 text-xs mb-2">ACQUISITION CHANNELS</div>
              <ul class="space-y-1.5">
                ${plan.channels.map(c => `<li class="text-gray-300 text-sm flex items-start gap-2"><span class="text-cyan-500 mt-0.5">›</span>${escapeHtml(c)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- First 5 Tasks -->
        <div class="section-5 card rounded-2xl p-6">
          <div class="flex items-center gap-2 mb-5">
            <span class="text-yellow-400 text-lg">⚡</span>
            <h2 class="font-semibold text-white">First 5 Tasks</h2>
            <span class="badge bg-yellow-900 text-yellow-300 border border-yellow-800 ml-auto">WEEK 1</span>
          </div>
          <div class="space-y-3">
            ${plan.tasks.map((t, i) => `
            <div class="task-item rounded-r-xl pl-4 pr-4 py-3 cursor-pointer">
              <div class="flex items-start gap-3">
                <span class="mono text-purple-500 text-xs pt-0.5 font-bold">${String(i+1).padStart(2,'0')}</span>
                <div class="flex-1">
                  <div class="text-white text-sm font-medium mb-0.5">${escapeHtml(t.title)}</div>
                  <div class="text-gray-500 text-xs">${escapeHtml(t.description)}</div>
                </div>
                <span class="badge ${
                  t.priority === 'CRITICAL' ? 'bg-red-900 text-red-300 border-red-800' :
                  t.priority === 'HIGH' ? 'bg-orange-900 text-orange-300 border-orange-800' :
                  'bg-gray-800 text-gray-400 border-gray-700'
                } border">${t.priority}</span>
              </div>
            </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column: Agent Activity Log -->
      <div class="space-y-6">
        <div class="section-3 card rounded-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-white border-opacity-5">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-white text-sm">Agent Activity Log</h2>
              <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot"></div>
                <span class="mono text-green-400 text-xs">LIVE</span>
              </div>
            </div>
          </div>
          <div id="activity-log" class="px-4 py-4 space-y-3 max-h-96 overflow-y-auto">
            ${plan.activityLog.map(entry => `
            <div class="flex items-start gap-2">
              <span class="mono text-gray-700 text-xs mt-0.5 shrink-0">${escapeHtml(entry.time)}</span>
              <span class="text-xs ${
                entry.type === 'success' ? 'text-green-400' :
                entry.type === 'info' ? 'text-cyan-400' :
                entry.type === 'agent' ? 'text-purple-400' :
                'text-gray-500'
              }">${escapeHtml(entry.msg)}</span>
            </div>
            `).join('')}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="section-4 card rounded-2xl p-5">
          <h2 class="font-semibold text-white text-sm mb-4">Quick Actions</h2>
          <div class="space-y-2">
            <button onclick="alert('Coming soon — agents will generate a full pitch deck!')" class="w-full text-left px-4 py-3 bg-purple-900 bg-opacity-30 hover:bg-opacity-50 border border-purple-800 border-opacity-50 rounded-xl text-sm text-purple-300 transition-colors flex items-center gap-2">
              <span>📊</span> Generate Pitch Deck
            </button>
            <button onclick="alert('Coming soon — agents will draft outreach emails!')" class="w-full text-left px-4 py-3 bg-gray-800 bg-opacity-50 hover:bg-opacity-80 border border-gray-700 border-opacity-50 rounded-xl text-sm text-gray-300 transition-colors flex items-center gap-2">
              <span>📧</span> Draft Outreach Emails
            </button>
            <button onclick="alert('Coming soon — agents will build a landing page!')" class="w-full text-left px-4 py-3 bg-gray-800 bg-opacity-50 hover:bg-opacity-80 border border-gray-700 border-opacity-50 rounded-xl text-sm text-gray-300 transition-colors flex items-center gap-2">
              <span>🌐</span> Build Landing Page
            </button>
            <a href="/" class="w-full text-left px-4 py-3 bg-gray-800 bg-opacity-50 hover:bg-opacity-80 border border-gray-700 border-opacity-50 rounded-xl text-sm text-gray-300 transition-colors flex items-center gap-2 block">
              <span>💡</span> New Idea
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Live-feeling activity log ticker
    const log = document.getElementById('activity-log');
    const liveMessages = [
      { type: 'info', msg: 'Monitoring market signals...' },
      { type: 'agent', msg: '[MARKET AGENT] Scanning competitor updates' },
      { type: 'info', msg: 'Tracking industry trends...' },
      { type: 'agent', msg: '[STRATEGY AGENT] Refining positioning model' },
      { type: 'success', msg: 'Data pipeline synced ✓' },
      { type: 'info', msg: 'Analyzing customer segment shifts...' },
      { type: 'agent', msg: '[TASK AGENT] Prioritizing backlog items' },
    ];
    let msgIdx = 0;
    setInterval(() => {
      const entry = liveMessages[msgIdx % liveMessages.length];
      msgIdx++;
      const now = new Date();
      const time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
      const div = document.createElement('div');
      div.className = 'flex items-start gap-2';
      const colors = { success: 'text-green-400', info: 'text-cyan-400', agent: 'text-purple-400' };
      div.innerHTML = '<span class="mono text-gray-700 text-xs mt-0.5 shrink-0">' + time + '</span><span class="text-xs ' + (colors[entry.type] || 'text-gray-500') + '">' + entry.msg + '</span>';
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }, 3500);
  </script>
</body>
</html>`);
});

// ── Plan Generator ─────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generatePlan(ideaText) {
  const idea = ideaText.toLowerCase();

  // Detect keywords to personalize
  const isSubscription = /subscri|monthly|box|recurring/.test(idea);
  const isSaaS = /software|platform|saas|app|tool|dashboard|automat/.test(idea);
  const isMarketplace = /marketplace|connect|match|network|platform/.test(idea);
  const isConsumer = /consumer|b2c|people|individual|personal/.test(idea);
  const isAI = /ai|machine learning|ml|gpt|chatbot|artificial/.test(idea);

  const marketSizes = ['$2.4B', '$8.1B', '$14.7B', '$3.9B', '$22.3B', '$6.8B'];
  const timeframes = ['6–8 weeks', '4–6 weeks', '8–12 weeks', '3–5 weeks'];
  const vectors = ['Organic', 'Viral', 'Paid', 'Partner', 'Product-Led'];
  const confidences = [87, 91, 94, 89, 93, 96];
  
  const hash = ideaText.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = hash % marketSizes.length;

  let strategy, targetMarket, primarySegment, channels, tasks, strategyPillars;
  let companyName;

  // Extract a short name from the idea
  const words = ideaText.split(' ').filter(w => w.length > 3);
  const nameWord = words[0] ? words[0].replace(/[^a-zA-Z]/g, '') : 'Venture';
  const suffixes = ['Labs', 'HQ', 'AI', 'Hub', 'OS', 'Base'];
  companyName = nameWord.charAt(0).toUpperCase() + nameWord.slice(1).toLowerCase() + ' ' + suffixes[idx % suffixes.length];

  if (isSaaS || isAI) {
    strategy = 'Build a product-led growth engine that converts users through a freemium funnel. Focus on a narrow vertical first — nail the core use case before expanding. Monetize through seats and advanced features. The AI layer creates a defensible moat as usage data compounds over time.';
    targetMarket = 'Tech-forward SMBs and prosumers who are currently duct-taping workflows with spreadsheets or legacy tools. Early adopters who value speed over enterprise-grade compliance. These buyers can self-serve and convert within a single product session.';
    primarySegment = ['Founders & operators at 10–50 person companies', 'Individual contributors frustrated by tool sprawl', 'Early adopters with budget authority under $500/mo'];
    channels = ['Product Hunt launch for initial spike', 'Content SEO targeting pain-point queries', 'LinkedIn thought leadership by founders', 'Integration partnerships with complementary tools'];
    strategyPillars = [
      { label: 'MOAT', value: 'Data flywheel' },
      { label: 'MODEL', value: 'Product-led' },
      { label: 'METRIC', value: 'Weekly active users' },
    ];
    tasks = [
      { title: 'Ship an interactive MVP demo', description: 'Build a clickable prototype users can test without signing up. Reduce friction to first aha moment.', priority: 'CRITICAL' },
      { title: 'Interview 10 target users this week', description: 'Validate the core pain point. Record sessions. Look for moments of strong emotion.', priority: 'CRITICAL' },
      { title: 'Set up a waitlist with email capture', description: 'Use a simple landing page. Aim for 100 signups before building the full product.', priority: 'HIGH' },
      { title: 'Define the single core action that creates value', description: 'What is the one thing users must do to get value? Optimize everything toward that moment.', priority: 'HIGH' },
      { title: 'Launch in 3 niche online communities', description: 'Find subreddits, Slack groups, or Discord servers where your ICP hangs out. Be genuinely helpful.', priority: 'MEDIUM' },
    ];
  } else if (isSubscription) {
    strategy = 'Launch as a curated, limited-availability subscription to create scarcity and social proof. Start with a founding member cohort of 100 subscribers to validate unit economics before scaling. Build community around the product — subscribers should feel like they\'re part of something exclusive, not just buying a box.';
    targetMarket = 'Affluent enthusiasts aged 28–45 who value curation over discovery. They already spend on the category but lack the time or expertise to source premium options themselves. They share their finds on social media, making them organic ambassadors.';
    primarySegment = ['Urban professionals with $80K+ household income', 'Gift buyers seeking premium, thoughtful options', 'Enthusiasts who want expert curation they can trust'];
    channels = ['Instagram/TikTok unboxing content & influencer seeding', 'Gift occasion targeting (birthdays, holidays)', 'Email nurture sequences from quiz-based lead gen', 'Referral program with free month incentive'];
    strategyPillars = [
      { label: 'HOOK', value: 'Curation + scarcity' },
      { label: 'MODEL', value: 'Subscription + gifting' },
      { label: 'METRIC', value: 'Churn & LTV' },
    ];
    tasks = [
      { title: 'Launch a founding 100 waitlist', description: 'Offer a discount or exclusive perk for the first 100 subscribers. Creates FOMO and social proof.', priority: 'CRITICAL' },
      { title: 'Source and photograph the first box', description: 'Create visual content showing the unboxing experience. This is your primary sales asset.', priority: 'CRITICAL' },
      { title: 'Calculate unit economics', description: 'Map COGS, fulfillment, and packaging against price point. Ensure 50%+ gross margin target.', priority: 'HIGH' },
      { title: 'Reach out to 5 micro-influencers for seeding', description: '5K–50K follower accounts in your niche. Offer a free box in exchange for honest content.', priority: 'HIGH' },
      { title: 'Set up automated email welcome sequence', description: 'Reduce early churn with post-purchase content that deepens the brand story and experience.', priority: 'MEDIUM' },
    ];
  } else if (isMarketplace) {
    strategy = 'Solve the chicken-and-egg problem by hand-picking 20 exceptional supply-side participants first. Guarantee their early bookings personally. The demand side will follow quality supply. Focus on a single city or vertical to achieve liquidity before expanding.';
    targetMarket = 'Two-sided market: supply side (individuals or businesses providing a service/product) and demand side (customers seeking convenience and trust). The critical insight is that both sides have high switching costs once network effects kick in.';
    primarySegment = ['Early supply: motivated independents seeking income', 'Early demand: early adopters comfortable with new platforms', 'Geo or vertical focus: one city or one category initially'];
    channels = ['Direct outreach to supply side (cold DM + email)', 'Local community groups for demand-side awareness', 'PR story around the founding mission', 'Partnership with complementary local businesses'];
    strategyPillars = [
      { label: 'UNLOCK', value: 'Supply first' },
      { label: 'MODEL', value: 'Take rate / SaaS' },
      { label: 'METRIC', value: 'GMV & liquidity rate' },
    ];
    tasks = [
      { title: 'Manually recruit 20 supply-side participants', description: 'Quality over quantity. Hand-pick people who represent the experience you want to be known for.', priority: 'CRITICAL' },
      { title: 'Launch a simple manual MVP (no-code)', description: 'Use Typeform + Calendly + Stripe to validate the transaction flow before building tech.', priority: 'CRITICAL' },
      { title: 'Complete 10 transactions personally', description: 'Do things that don\'t scale. Be the matchmaker. Learn what creates a great experience.', priority: 'HIGH' },
      { title: 'Define trust & safety baseline', description: 'What verification, insurance, or guarantees do both sides need to transact with confidence?', priority: 'HIGH' },
      { title: 'Map the repeat purchase trigger', description: 'What makes a customer come back? Design the experience to maximize second transactions.', priority: 'MEDIUM' },
    ];
  } else {
    strategy = 'Enter the market through a narrow wedge — a specific customer type with a specific acute pain. Solve it completely. Once you own that wedge, expand adjacently. Resist the temptation to broaden too early. The riches are in the niches, especially at the validation stage.';
    targetMarket = 'Early majority pragmatists who have a clear, measurable problem and existing budget to solve it. They\'re not looking for innovation — they\'re looking for something that works reliably. Focus on buyers who have already tried to solve this problem and failed.';
    primarySegment = ['Decision-makers with existing pain & budget', 'Those who have tried DIY solutions without success', 'Referral-driven buyers who trust peer recommendations'];
    channels = ['Direct outreach to a curated list of 50 dream customers', 'Case study content after first 3 wins', 'Referral program activated after product-market fit signal', 'Partnership with 1–2 trusted advisors in the space'];
    strategyPillars = [
      { label: 'ENTRY', value: 'Narrow wedge' },
      { label: 'MODEL', value: 'Services → product' },
      { label: 'METRIC', value: 'Customer satisfaction' },
    ];
    tasks = [
      { title: 'Define the single most painful problem you solve', description: 'Write a one-sentence problem statement. Test it with 5 potential customers. Does it resonate?', priority: 'CRITICAL' },
      { title: 'Find and contact 20 potential first customers', description: 'Build a list. Use LinkedIn, communities, or warm intros. Start conversations, not pitches.', priority: 'CRITICAL' },
      { title: 'Deliver value to 1 customer for free or cheap', description: 'Get a reference case. Collect testimonials and data. Make them wildly successful.', priority: 'HIGH' },
      { title: 'Document your delivery process step-by-step', description: 'Create a repeatable playbook. This is the foundation of a scalable business.', priority: 'HIGH' },
      { title: 'Define your pricing model and first price point', description: 'Research what alternatives cost. Price on value, not cost. Test with the first 3 real prospects.', priority: 'MEDIUM' },
    ];
  }

  const activityLog = [
    { time: '00:01', type: 'info', msg: 'Agent runtime initialized' },
    { time: '00:02', type: 'agent', msg: '[MARKET AGENT] Scanning TAM datasets' },
    { time: '00:04', type: 'info', msg: 'Tokenizing idea — 3 entities found' },
    { time: '00:06', type: 'agent', msg: '[MARKET AGENT] ICP profile generated' },
    { time: '00:07', type: 'success', msg: 'Market research complete ✓' },
    { time: '00:08', type: 'agent', msg: '[STRATEGY AGENT] Analyzing positioning' },
    { time: '00:10', type: 'agent', msg: '[STRATEGY AGENT] Revenue model selected' },
    { time: '00:11', type: 'success', msg: 'Strategy locked ✓' },
    { time: '00:12', type: 'agent', msg: '[TASK AGENT] Mapping critical path' },
    { time: '00:13', type: 'agent', msg: '[TASK AGENT] 5 tasks queued' },
    { time: '00:14', type: 'success', msg: 'Company plan compiled ✓' },
  ];

  return {
    companyName,
    marketSize: marketSizes[idx],
    confidence: confidences[idx % confidences.length],
    timeToRevenue: timeframes[idx % timeframes.length],
    growthVector: vectors[idx % vectors.length],
    strategy,
    targetMarket,
    primarySegment,
    channels,
    strategyPillars,
    tasks,
    activityLog,
  };
}

// ── Error Handling ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start Server ───────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => console.log('Server running on port ' + PORT));
  })
  .catch(err => {
    console.error('DB init failed:', err);
    app.listen(PORT, () => console.log('Server running on port ' + PORT + ' (DB init failed)'));
  });

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  process.exit(0);
});
