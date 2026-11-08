// x402 buyer agent: discovers the 402 price, pays testnet USDC, consumes the API.
// Uses a disposable testnet-only key (never user funds; no real economic value).
import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

const key = process.env.PAYER_PRIVATE_KEY;
if (!key) throw new Error('PAYER_PRIVATE_KEY missing');
const account = privateKeyToAccount(key);
const fetchWithPay = wrapFetchWithPayment(fetch, account);

const base = process.env.API_BASE || 'http://localhost:4021';

console.log('buyer agent address:', account.address);
console.log('1) free route (no payment):');
const free = await fetch(`${base}/api/free/status`);
console.log('   ', free.status, await free.text());

console.log('2) premium route WITHOUT payment (expect 402):');
const unpaid = await fetch(`${base}/api/premium/base-stats`);
console.log('   ', unpaid.status, (await unpaid.text()).slice(0, 300));

console.log('3) premium route WITH x402 payment:');
const paid = await fetchWithPay(`${base}/api/premium/base-stats`);
console.log('   status:', paid.status);
const body = await paid.json();
console.log('   body:', JSON.stringify(body));
const settle = paid.headers.get('x-payment-response');
if (settle) {
  const decoded = JSON.parse(Buffer.from(settle, 'base64').toString('utf8'));
  console.log('   settlement:', JSON.stringify(decoded, null, 2));
  if (decoded.transaction) {
    console.log('   explorer: https://sepolia.basescan.org/tx/' + decoded.transaction);
  }
}
