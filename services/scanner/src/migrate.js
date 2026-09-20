import { pool, query } from "./db.js";

const statements = [
  `create table if not exists schema_migrations (
     id text primary key,
     applied_at timestamptz not null default now()
   )`,
  `create table if not exists pools (
     id bigserial primary key,
     chain_id integer not null,
     address text not null,
     token0 text not null,
     token1 text not null,
     fee_bps integer not null default 0,
     created_at timestamptz not null default now(),
     unique (chain_id, address)
   )`,
  `create table if not exists liquidity_snapshots (
     id bigserial primary key,
     pool_id bigint not null references pools(id) on delete cascade,
     reserve0 numeric(78, 0) not null,
     reserve1 numeric(78, 0) not null,
     liquidity_usd numeric(36, 8),
     scanned_at timestamptz not null default now()
   )`,
  `create index if not exists liquidity_snapshots_pool_scanned_idx
     on liquidity_snapshots (pool_id, scanned_at desc)`,
];

async function migrate() {
  for (const sql of statements) {
    await query(sql);
  }
  await query(
    `insert into schema_migrations (id) values ($1)
     on conflict (id) do nothing`,
    ["001_init"]
  );
  console.log("migrations_applied");
}

migrate()
  .catch((err) => {
    console.error("migration_failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
