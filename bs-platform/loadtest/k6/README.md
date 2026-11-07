# EduWork — k6 / k6 Cloud Load Tests

Distributed load testing that generates traffic from **many IPs/regions**, so it
behaves like real users and won't trip Vercel's single-IP firewall (Attack
Challenge Mode) the way a local single-machine flood does.

## 1. Install k6

Windows (choose one):

```powershell
winget install k6.k6
# or
choco install k6
```

Verify: `k6 version`

## 2. Get a k6 Cloud token (free tier available)

1. Sign up at https://grafana.com/products/cloud/k6/ (Grafana Cloud k6).
2. In the k6 app, go to **Settings -> API token** and copy it.
3. Log in locally:

```powershell
k6 cloud login --token <YOUR_TOKEN>
```

> The token is a secret. Do **not** commit it. `k6 cloud login` stores it in
> your user config, not in the repo.

## 3. Run

Local (single IP — fine for smoke / correctness, will be challenged at high RPS):

```powershell
k6 run -e BASE_URL=https://platform-12.vercel.app -e SCENARIO=smoke loadtest/k6/eduwork.js
```

Cloud (distributed — use this for load/stress/spike/soak):

```powershell
k6 cloud run -e BASE_URL=https://platform-12.vercel.app -e SCENARIO=load loadtest/k6/eduwork.js
```

`SCENARIO` = `smoke` | `load` | `stress` | `spike` | `soak`

## Scenarios

| Scenario | Shape                                  | Purpose                         |
| -------- | -------------------------------------- | ------------------------------- |
| smoke    | 5 VUs, 30s                             | Baseline / correctness          |
| load     | ramp to 50 VUs, hold 1m                | Expected peak                   |
| stress   | ramp 100 -> 200 VUs over 3m            | Find the wall                   |
| spike    | jump to 500 VUs for 30s                | Sudden surge / cold starts      |
| soak     | 30 VUs, 15m                            | Endurance / leak hunt           |

## Thresholds (auto pass/fail)

- `http_req_failed`: rate < 1%
- `http_req_duration`: p95 < 2000ms
- `vercel_challenge_rate`: rate < 5% — if this trips, the firewall is
  challenging the test (reduce rate, run on cloud, or allowlist the zone).

## Notes

- The script only hits **public read pages** (no writes, no payments, no AI).
- If you must run heavy load from a single IP, temporarily add a Vercel firewall
  allow-rule for that IP (Dashboard -> Firewall) and remove it afterwards.
- `distribution` in `options.cloud` is set to Frankfurt + Bahrain (near Iraq);
  adjust load zones to match your audience.
