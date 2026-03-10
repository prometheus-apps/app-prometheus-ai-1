const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;
const sql = neon(process.env.DATABASE_URL);

// ── Middleware ──────────────────────────────────────────────
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Payment completed:', session.id, session.customer_email);
  }
  res.json({ received: true });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── DB Init ────────────────────────────────────────────────
async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      source TEXT DEFAULT 'direct',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Database initialized');
}

// ── Health ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Stripe Checkout ────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_1T9YLg4Ho2w0775bQCAdNoVq',
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
      customer_email: req.body.email || undefined
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ success: false, error: 'Checkout failed' });
  }
});

// ── Success / Cancel ───────────────────────────────────────
app.get('/success', async (req, res) => {
  const { session_id } = req.query;
  let customerEmail = '';
  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      customerEmail = session.customer_email || '';
    } catch (err) {
      console.error('Session retrieval error:', err);
    }
  }
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful — Prometheus AI</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black min-h-screen flex items-center justify-center">
  <div class="text-center p-8 max-w-md">
    <div class="text-6xl mb-6">✅</div>
    <h1 class="text-3xl font-bold text-white mb-3">Payment Successful!</h1>
    <p class="text-gray-400 mb-2">Your payment of <span class="text-white font-semibold">$2.00</span> was received.</p>
    ${customerEmail ? `<p class="text-gray-400 mb-6">Confirmation sent to <span class="text-white">${customerEmail}</span></p>` : '<p class="text-gray-400 mb-6">Thank you for supporting Prometheus AI.</p>'}
    <a href="/" class="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition">Back to Home</a>
  </div>
</body>
</html>`);
});

app.get('/cancel', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Cancelled — Prometheus AI</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black min-h-screen flex items-center justify-center">
  <div class="text-center p-8 max-w-md">
    <div class="text-6xl mb-6">❌</div>
    <h1 class="text-3xl font-bold text-white mb-3">Payment Cancelled</h1>
    <p class="text-gray-400 mb-6">No charge was made. You can try again anytime.</p>
    <a href="/" class="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition">Back to Home</a>
  </div>
</body>
</html>`);
});

// ── Waitlist Submit ────────────────────────────────────────
app.post('/submit', async (req, res) => {
  const { email, name, notes } = req.body;
  if (!email) return res.redirect('/?error=1');
  try {
    await sql`INSERT INTO submissions (email, name, notes) VALUES (${email}, ${name || ''}, ${notes || ''})`;
    res.redirect('/thank-you');
  } catch (err) {
    if (err.message?.includes('duplicate')) return res.redirect('/?error=2');
    console.error('Submit error:', err);
    res.redirect('/?error=1');
  }
});

// ── Thank You ──────────────────────────────────────────────
app.get('/thank-you', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the list — Prometheus AI</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black min-h-screen flex items-center justify-center">
  <div class="text-center p-8 max-w-md">
    <div class="text-6xl mb-6">🔥</div>
    <h1 class="text-3xl font-bold text-white mb-3">You're on the list.</h1>
    <p class="text-gray-400 mb-6">We'll reach out when your access is ready. Prometheus is coming.</p>
    <a href="/" class="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition">Back to Home</a>
  </div>
</body>
</html>`);
});

// ── Admin ──────────────────────────────────────────────────
app.get('/admin', async (req, res) => {
  try {
    const rows = await sql`SELECT id, name, email, notes, source, created_at FROM submissions ORDER BY created_at DESC`;
    const tableRows = rows.map(r => `
      <tr class="border-b border-gray-800 hover:bg-gray-900">
        <td class="py-3 px-4 text-gray-300">${r.id}</td>
        <td class="py-3 px-4 text-white">${r.name || '—'}</td>
        <td class="py-3 px-4 text-white">${r.email}</td>
        <td class="py-3 px-4 text-gray-400">${r.notes || '—'}</td>
        <td class="py-3 px-4 text-gray-400">${new Date(r.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Prometheus AI</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black min-h-screen p-8">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-white">Prometheus AI — Submissions</h1>
      <a href="/admin/export" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Export CSV</a>
    </div>
    <div class="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-900">
          <tr>
            <th class="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
            <th class="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
            <th class="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
            <th class="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
            <th class="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
          </tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="5" class="py-8 text-center text-gray-600">No submissions yet</td></tr>'}</tbody>
      </table>
    </div>
    <p class="mt-4 text-gray-600 text-sm">${rows.length} total submissions</p>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error('Admin error:', err);
    res.status(500).send('Error loading admin');
  }
});

app.get('/admin/export', async (req, res) => {
  try {
    const rows = await sql`SELECT id, name, email, notes, source, created_at FROM submissions ORDER BY created_at DESC`;
    const csv = ['id,name,email,notes,source,created_at', ...rows.map(r =>
      `${r.id},"${(r.name||'').replace(/"/g,'""')}","${r.email}","${(r.notes||'').replace(/"/g,'""')}",${r.source},${r.created_at}`
    )].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Export failed');
  }
});

// ── Main Page ──────────────────────────────────────────────
app.get('/', (req, res) => {
  const error = req.query.error;
  const errorMsg = error === '1' ? 'Something went wrong. Please try again.' : error === '2' ? 'That email is already on the list.' : '';
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prometheus AI — Your idea. Our agents. A company that runs itself.</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black min-h-screen text-white">

  <!-- TOP NAV -->
  <nav class="flex items-center justify-between px-6 py-4 border-b border-gray-800">
    <span class="text-white font-bold text-lg tracking-tight">Prometheus AI</span>
    <button
      data-checkout="true"
      class="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold px-6 py-2 rounded-lg text-sm transition shadow-lg shadow-red-900/30">
      Pay Now $2
    </button>
  </nav>

  <!-- HERO -->
  <main class="max-w-2xl mx-auto px-6 py-20 text-center">
    <div class="inline-block bg-red-600/10 border border-red-600/30 text-red-400 text-xs font-semibold px-3 py-1 rounded-full mb-8 uppercase tracking-widest">Phase 1 — Validation</div>
    <h1 class="text-5xl font-black mb-6 leading-tight">
      Your idea.<br>
      <span class="text-red-500">Our agents.</span><br>
      A company that runs itself.
    </h1>
    <p class="text-gray-400 text-xl mb-12 leading-relaxed">
      Prometheus AI deploys autonomous agents that build, market, and operate your business — while you watch it grow.
    </p>

    <!-- WAITLIST FORM -->
    <div class="bg-gray-950 border border-gray-800 rounded-2xl p-8 text-left">
      <h2 class="text-xl font-bold text-white mb-2">Join the Waitlist</h2>
      <p class="text-gray-500 text-sm mb-6">Be first when we open the doors. No spam — ever.</p>
      ${errorMsg ? `<div class="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">${errorMsg}</div>` : ''}
      <form action="/submit" method="POST" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">Name</label>
          <input type="text" name="name" placeholder="Your name" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">Email <span class="text-red-500">*</span></label>
          <input type="email" name="email" required placeholder="you@example.com" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">What would you build? <span class="text-gray-600">(optional)</span></label>
          <textarea name="notes" rows="3" placeholder="Describe your idea..." class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition resize-none"></textarea>
        </div>
        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition text-lg">
          Join the Waitlist →
        </button>
      </form>
    </div>
  </main>

  <!-- FOOTER -->
  <footer class="text-center py-8 text-gray-700 text-sm border-t border-gray-900">
    © 2026 Prometheus AI — Your idea. Our agents. A company that runs itself.
  </footer>

</body>
</html>`);
});

// ── Error Middleware ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('DB init failed:', err);
    app.listen(PORT, () => console.log(`Server running on port ${PORT} (no DB)`));
  });

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  process.exit(0);
});
