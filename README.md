# DEX Liquidity Scanner

Cloud-ready liquidity scanner for DEX pools: a containerized Node API/worker, local Docker Compose stack, and AWS Terraform (VPC, ECR, ECS Fargate, RDS Postgres, ElastiCache Redis, ALB).

## Architecture

```text
Internet → ALB → ECS Fargate (scanner)
                    ├─ RDS PostgreSQL (pools + snapshots)
                    └─ ElastiCache Redis (latest snapshot cache)
```

Locally, Compose mirrors the same shape with Postgres + Redis + scanner on port `8080`.

## Quick start (local)

```bash
./scripts/verify-local.sh
# or
docker compose up --build
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/v1/liquidity/latest
```

API:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/healthz` | Liveness for ALB / Compose |
| `GET` | `/v1/liquidity/latest` | Cached latest scan |
| `POST` | `/v1/scan` | Trigger one scan immediately |

Without `RPC_URL`, the scanner seeds demo Uniswap-style pools and writes **synthetic** reserves so infra can be verified offline. Set `RPC_URL` later to point at a real EVM endpoint.

## AWS deploy

1. Copy `infra/terraform/terraform.tfvars.example` → `terraform.tfvars` and set `db_password`.
2. `cd infra/terraform && terraform init && terraform apply`
3. Push an image: `ECR_REPOSITORY=$(terraform output -raw ecr_repository_url) ./scripts/push-image.sh`
4. Force a new ECS deployment (or re-apply with `scanner_image` set to the digest/tag you pushed).
5. Hit `http://$(terraform output -raw alb_dns_name)/healthz`

## Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | local Compose DSN | Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379` | Cache for latest snapshot |
| `PORT` | `8080` | HTTP listen port |
| `SCAN_INTERVAL_MS` | `15000` | Background scan cadence |
| `CHAIN_ID` | `1` | EVM chain id |
| `RPC_URL` | empty | Empty = synthetic mode |

## Layout

```text
services/scanner/     API + worker
infra/terraform/      AWS IaC modules
scripts/              local verify + ECR push helpers
docker-compose.yml    local stack
```
