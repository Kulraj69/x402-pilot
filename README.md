# QualiaBits x402 pilot - working proof (Base Sepolia testnet)

Built 9 Nov 2026. First implementation step of the x402/ACP openings brief.

## What this proves
A real HTTP API selling data per-call over the x402 protocol, end to end:
1. Buyer agent requests `GET /api/premium/base-stats` with no payment -> server answers HTTP 402 with machine-readable payment requirements (0.01 USDC on Base Sepolia, payee, asset, timeout).
2. Buyer signs an EIP-3009 `transferWithAuthorization` for testnet USDC (gasless for the buyer) and retries with the `X-PAYMENT` header.
3. The public x402.org testnet facilitator verifies the signature and settles onchain.
4. Server returns live Base Sepolia stats (block number + gas price from the public RPC).

No accounts, no API keys, no checkout page: that is the protocol's point.

## Evidence (settled payments, publicly verifiable)
Five testnet payments settled onchain through two different facilitators:

via the public x402.org facilitator:
- https://base-sepolia.blockscout.com/tx/0x56ec1b0e276ad720029c858e6b4fdb88a8454d5de6dd2a9c9281566aca763a47 (block 56262574)
- https://base-sepolia.blockscout.com/tx/0x4ade62d54846ef6e682bea134c3c3afef682f96096acd39e6fb3d78273d15bfc (block 56262681)
- https://base-sepolia.blockscout.com/tx/0xc8af52b3abafba2d9a627c30ead6e3941e2ef1ac44fe9f130b35c9f329619568 (block 56262790)
- one more (see run-evidence-settled.log)

via PayAI's facilitator (facilitator.payai.network):
- https://base-sepolia.blockscout.com/tx/0x085183bc21daae4bb06a05a79fb87c9a4a5e20704950669f0fa4bd4db883436a (block 56269257)

All independently confirmed via Base Sepolia RPC `eth_getTransactionReceipt` (status SUCCESS, calling Circle's official testnet USDC contract 0x036CbD53842c5426634e7929541eC2318f3dCF7e).

- Payer (buyer agent, disposable testnet-only): 0x80DB831Ae18A81d1A68B5391aEEE0a4d05664AC6
- Payee (seller, disposable testnet-only): 0x8593A282E91887032e0B9d4946780CE0073d802c

## Honest limits
- Testnet only. Tokens are valueless; no real money moved, no real revenue proven.
- Deployment: DEPLOY.md covers a free public testnet deployment; run-public.sh exposes a local run via a quick tunnel.
- Mainnet would need a real wallet, a production facilitator (Coinbase CDP hosted facilitator is free to 1,000 tx/month, then $0.001/tx) and KYC decisions.
- One transient facilitator error observed ("replacement transaction underpriced"), resolved on retry - real-world reliability data point for the trust-tooling thesis.
- This is x402 only. ACP (OpenAI/Stripe agentic checkout) is a separate spec and not implemented here.

## Run it
```
npm install
cp .env.example .env   # PAYER_PRIVATE_KEY (testnet-only key with Base Sepolia USDC), PAYEE_ADDRESS
node server.mjs        # serves on :4021
node client.mjs        # buyer agent: discovers, pays, prints settlement tx
```
Stack: x402-express + x402-fetch + viem, public facilitator https://x402.org/facilitator, public RPC https://sepolia.base.org.
Secrets: `.env` is gitignored; keys are freshly generated disposable testnet keys, never user-funded wallets.

## Facilitator probe (probe.mjs)

Reproducible cross-facilitator probe - the seed of the reliability product.

    node probe.mjs --dry-run                 # /supported + local 402 quote checks only, no payment
    node probe.mjs                           # one live $0.01 testnet-USDC payment per facilitator
    node probe.mjs --attempts 24 --cooldown-ms 3600000   # hourly x 24 (run on a persistent host)

Every attempt appends one JSONL record to probe-log.jsonl: ts, facilitator,
network, scheme, attempt, result (settled|failed|error|dry_ok), tx hash or
facilitator error, latency. probe-log.jsonl currently holds dry-run records.

LABELING RULE: a single run is a directional observation, never a benchmark.
Only scheduled repeats (hours-days) support reliability claims. Verify failures
reproduce and are facilitator-side (same payload settling elsewhere) before
attributing them to an operator.
