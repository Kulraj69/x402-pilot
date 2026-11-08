// x402 paid-API pilot: QualiaBits test implementation on Base Sepolia (testnet, zero economic value)
// A real HTTP API whose premium route is gated by the x402 protocol.
// Flow: client requests -> 402 Payment Required -> client signs EIP-3009 USDC authorization
//       -> facilitator (x402.org, public testnet) verifies and settles onchain -> data returned.
import express from 'express';
import { paymentMiddleware } from 'x402-express';
import 'dotenv/config';

const PAY_TO = process.env.PAYEE_ADDRESS; // disposable testnet payee, holds no real funds
if (!PAY_TO) throw new Error('PAYEE_ADDRESS missing');

const app = express();

// Free route: no payment required - lets buyers probe the service.
app.get('/api/free/status', (req, res) => {
  res.json({
    service: 'qualiabits-x402-pilot',
    network: 'eip155:84532 (Base Sepolia testnet)',
    paidEndpoints: [{ path: '/api/premium/base-stats', price: '$0.01 USDC' }],
    note: 'Testnet deployment. No real money moves here.',
  });
});

// x402 gate: anything under /api/premium requires a $0.01 testnet USDC payment.
// Facilitator is configurable: default https://x402.org/facilitator (public testnet).
// Set FACILITATOR_URL to probe another facilitator, e.g. https://facilitator.payai.network
app.use(
  paymentMiddleware(
    PAY_TO,
    {
      '/api/premium/*': {
        price: '$0.01',
        network: 'base-sepolia',
        config: { description: 'Live Base network stats, sold per-call over x402' },
      },
    },
    { url: process.env.FACILITATOR_URL || 'https://x402.org/facilitator' }
  )
);

// Premium route: real data fetched at request time from the public Base Sepolia RPC.
app.get('/api/premium/base-stats', async (req, res) => {
  const rpc = async (method, params = []) => {
    const r = await fetch('https://sepolia.base.org', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    return (await r.json()).result;
  };
  const [blockHex, gasHex] = await Promise.all([rpc('eth_blockNumber'), rpc('eth_gasPrice')]);
  res.json({
    paidFor: true,
    settledVia: 'x402',
    data: {
      latestBlock: parseInt(blockHex, 16),
      gasPriceGwei: Number(gasHex) / 1e9,
      chain: 'base-sepolia',
      fetchedAt: new Date().toISOString(),
    },
  });
});

const port = process.env.PORT || 4021;
app.listen(port, () => console.log(`x402 pilot API listening on :${port}`));
