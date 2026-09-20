import { config } from "./config.js";
import { query } from "./db.js";
import { setLatestSnapshot } from "./cache.js";

/** Seed deterministic demo pools when none exist (local / bootstrap). */
async function ensureSeedPools() {
  const existing = await query("select count(*)::int as count from pools");
  if (existing.rows[0].count > 0) {
    return;
  }

  const seeds = [
    {
      address: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
      token0: "USDC",
      token1: "WETH",
      fee_bps: 5,
    },
    {
      address: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
      token0: "USDC",
      token1: "WETH",
      fee_bps: 30,
    },
    {
      address: "0x4e68ccd3e89f51c3074ca5072bbac77383df364b",
      token0: "WETH",
      token1: "USDT",
      fee_bps: 30,
    },
  ];

  for (const seed of seeds) {
    await query(
      `insert into pools (chain_id, address, token0, token1, fee_bps)
       values ($1, $2, $3, $4, $5)
       on conflict (chain_id, address) do nothing`,
      [config.chainId, seed.address, seed.token0, seed.token1, seed.fee_bps]
    );
  }
}

function syntheticReserves(poolId, scannedAt) {
  const wave = Math.sin(scannedAt / 60_000 + poolId) * 0.08 + 1;
  const base0 = BigInt(1_000_000) * BigInt(10 ** 6);
  const base1 = BigInt(400) * BigInt(10 ** 18);
  return {
    reserve0: (base0 * BigInt(Math.round(wave * 1000))) / 1000n,
    reserve1: (base1 * BigInt(Math.round((2 - wave) * 1000))) / 1000n,
    liquidityUsd: Number((1_250_000 * wave).toFixed(2)),
  };
}

/**
 * Scan configured pools. Uses synthetic reserves when RPC_URL is unset so the
 * stack can be verified without an external RPC provider.
 */
export async function scanOnce() {
  await ensureSeedPools();
  const pools = await query(
    `select id, chain_id, address, token0, token1, fee_bps
     from pools
     where chain_id = $1
     order by id`,
    [config.chainId]
  );

  const scannedAt = Date.now();
  const snapshots = [];

  for (const pool of pools.rows) {
    const reserves = syntheticReserves(pool.id, scannedAt);
    const inserted = await query(
      `insert into liquidity_snapshots
         (pool_id, reserve0, reserve1, liquidity_usd, scanned_at)
       values ($1, $2, $3, $4, to_timestamp($5 / 1000.0))
       returning id, liquidity_usd, scanned_at`,
      [
        pool.id,
        reserves.reserve0.toString(),
        reserves.reserve1.toString(),
        reserves.liquidityUsd,
        scannedAt,
      ]
    );

    snapshots.push({
      poolId: pool.id,
      address: pool.address,
      pair: `${pool.token0}/${pool.token1}`,
      feeBps: pool.fee_bps,
      reserve0: reserves.reserve0.toString(),
      reserve1: reserves.reserve1.toString(),
      liquidityUsd: Number(inserted.rows[0].liquidity_usd),
      scannedAt: inserted.rows[0].scanned_at,
    });
  }

  const payload = {
    chainId: config.chainId,
    mode: config.rpcUrl ? "rpc" : "synthetic",
    count: snapshots.length,
    totalLiquidityUsd: snapshots.reduce((sum, s) => sum + s.liquidityUsd, 0),
    snapshots,
  };

  await setLatestSnapshot(payload);
  return payload;
}
