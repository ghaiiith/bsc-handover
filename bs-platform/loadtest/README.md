# EduWork Durability / Load Tests

A zero-dependency harness that drives [`autocannon`](https://github.com/mcollina/autocannon)
(fetched on-demand via `npx`) against a deployed EduWork instance.

## Usage

```bash
node loadtest/run.mjs <baseUrl> <scenario> [--full]
```

- `<baseUrl>` — e.g. `https://your-app.vercel.app` (no trailing slash)
- `<scenario>` — `smoke` | `load` | `stress` | `spike` | `soak` (default `smoke`)
- `--full` — also hit API endpoints (rejection-path only). Off by default.

## Scenarios

| Scenario | Connections | Duration | Purpose                                  |
| -------- | ----------- | -------- | ---------------------------------------- |
| smoke    | 5           | 20s      | Baseline sanity / correctness            |
| load     | 30          | 60s      | Expected peak traffic                    |
| stress   | 100         | 60s      | Push beyond capacity to find the wall    |
| spike    | 200         | 30s      | Sudden surge / autoscaling cold starts   |
| soak     | 20          | 600s     | Endurance — memory / connection leaks    |

## Scope & safety

- **Default scope is read-only public pages** (`/`, `/courses`, `/jobs`,
  `/services`) in both locales — no data is written, no payments, no AI spend.
- `--full` adds API endpoints that should be **rejected cheaply** (400/401/429);
  it does not send valid payloads, so it tests that the app sheds bad load
  without melting down.
- Load testing a production deployment consumes hosting + Supabase quota. Prefer
  a staging/preview URL. Never run against live payment gateways.

## Reading results

- **p95 / p99 latency** — tail latency; watch for blow-ups under stress/spike.
- **RPS** — sustained throughput per endpoint.
- **non2xx / errors** — should be ~0 for read pages; under stress, graceful
  degradation means clean 5xx/429, not timeouts or connection resets.
