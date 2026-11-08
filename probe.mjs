// probe.mjs - reproducible x402 facilitator probe.
// For each facilitator: (dry-run) check /supported + local 402 quote only, no payment;
// (live) run a real $0.01 testnet-USDC payment through it and record the outcome.
// Every run appends one JSONL record per attempt to probe-log.jsonl.
// LABELING RULE: results are directional single-point observations, not a benchmark.
// A benchmark needs scheduled repeats (e.g. hourly over days) - run this on a cron
// on a persistent host, never from a claim made on n=1.
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const getArg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FACILITATORS = getArg('--facilitators', 'https://x402.org/facilitator,https://facilitator.payai.network,https://pay.openfacilitator.io,https://x402.dexter.cash').split(',');
const ATTEMPTS = parseInt(getArg('--attempts', '1'), 10);
const COOLDOWN_MS = parseInt(getArg('--cooldown-ms', '120000'), 10);
const PORT = 4031;
const LOG = 'probe-log.jsonl';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function startServer(facilitator) {
  const srv = spawn('node', ['server.mjs'], { env: { ...process.env, FACILITATOR_URL: facilitator, PORT: String(PORT) }, stdio: 'ignore' });
  return new Promise((ok, no) => {
    const t0 = Date.now();
    const poll = setInterval(async () => {
      try { const r = await fetch(`http://localhost:${PORT}/`); if (r.status) { clearInterval(poll); ok(srv); } } catch {} // any HTTP response = up
      if (Date.now() - t0 > 10000) { clearInterval(poll); no(new Error('server did not start')); }
    }, 300);
  });
}

function runClient() {
  return new Promise((ok) => {
    const c = spawn('node', ['client.mjs'], { env: { ...process.env, API_BASE: `http://localhost:${PORT}` } });
    let out = '';
    c.stdout.on('data', d => out += d);
    c.stderr.on('data', d => out += d);
    c.on('close', () => ok(out));
  });
}

async function probe(facilitator, attempt) {
  const rec = { ts: new Date().toISOString(), facilitator, network: 'base-sepolia', scheme: 'exact', asset: 'testnet-USDC', amount: '0.01', attempt, dry_run: DRY };
  const t0 = Date.now();
  let srv;
  try {
    if (DRY) {
      const r = await fetch(facilitator.replace(/\/$/, '') + '/supported');
      rec.supported_ok = r.ok;
      const kinds = r.ok ? (await r.json()).kinds || [] : [];
      rec.supports_base_sepolia = kinds.some(k => String(k.network).includes('84532') || String(k.network).includes('base-sepolia'));
      srv = await startServer(facilitator);
      const q = await fetch(`http://localhost:${PORT}/api/premium/base-stats`);
      rec.quote_status = q.status; // expect 402
      rec.result = rec.supported_ok && rec.supports_base_sepolia && q.status === 402 ? 'dry_ok' : 'dry_mismatch';
    } else {
      srv = await startServer(facilitator);
      const out = await runClient();
      const tx = out.match(/"transaction":\s*"(0x[0-9a-f]+)"/);
      const err = out.match(/"error":\s*"([^"]+)"/);
      if (tx) { rec.result = 'settled'; rec.tx = tx[1]; }
      else { rec.result = 'failed'; rec.error = err ? err[1] : 'unknown (see client output)'; }
    }
  } catch (e) {
    rec.result = 'error'; rec.error = String(e && e.message || e);
  } finally {
    if (srv) srv.kill();
  }
  rec.latency_ms = Date.now() - t0;
  appendFileSync(LOG, JSON.stringify(rec) + '\n');
  console.log(JSON.stringify(rec));
}

for (let a = 1; a <= ATTEMPTS; a++) {
  for (const f of FACILITATORS) await probe(f, a);
  if (a < ATTEMPTS) await sleep(COOLDOWN_MS);
}
