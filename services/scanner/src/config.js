function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required(
    "DATABASE_URL",
    "postgres://scanner:scanner@localhost:5432/scanner"
  ),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  scanIntervalMs: Number(process.env.SCAN_INTERVAL_MS ?? 15_000),
  chainId: Number(process.env.CHAIN_ID ?? 1),
  rpcUrl: process.env.RPC_URL ?? "",
  serviceName: process.env.SERVICE_NAME ?? "dex-liquidity-scanner",
};
