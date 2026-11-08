# Public testnet demo - deployment prep (no production money)

The pilot can be exposed publicly at zero cost while staying entirely on Base Sepolia
testnet: no mainnet wallet, no real money, no KYC.

## What a public demo proves
Any stranger's agent anywhere can discover the price, pay testnet USDC and get data -
the "paid APIs on x402" test (opening 2) measures whether that ever happens organically.

## Option A (verified choice): Render free web service
Verified 2026-11-09 against render.com/docs/free and render.com/docs/your-first-deploy:
free web service instances, no payment method required to deploy, instances sleep
after inactivity and wake on request (fine for a demo URL).

Requirements: a Render account (free, no payment method) and this public repo URL.

New Web Service -> public git URL -> build `npm install`,
start `node server.mjs`, set env PAYEE_ADDRESS + NETWORK=base-sepolia (testnet only).
Then `API_BASE=https://<service>.onrender.com node client.mjs` pays and fetches.

## Option B: instant free tunnel from any machine (no account)
```
node server.mjs &                     # serves on :4021
cloudflared tunnel --url http://localhost:4021   # prints a public https://*.trycloudflare.com URL
```
`run-public.sh` wraps this. Quick tunnels are unbranded random URLs and die with the
process - good for demos, not for a listing.

## Hard lines for the demo
- Testnet only. The free route JSON says so; keep it that way.
- Never point the middleware at mainnet or a production facilitator from this kit.
- Bazaar listing and social promotion are separate decisions from deploying the demo.
