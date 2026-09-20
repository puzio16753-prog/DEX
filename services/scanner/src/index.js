import http from "node:http";
import { config } from "./config.js";
import { healthCheck as dbHealthy, pool } from "./db.js";
import {
  connectRedis,
  getLatestSnapshot,
  healthCheck as redisHealthy,
  redis,
} from "./cache.js";
import { scanOnce } from "./scanner.js";

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    try {
      const [db, cache] = await Promise.all([dbHealthy(), redisHealthy()]);
      return json(res, db && cache ? 200 : 503, {
        status: db && cache ? "ok" : "degraded",
        service: config.serviceName,
        db,
        redis: cache,
      });
    } catch (err) {
      return json(res, 503, { status: "error", message: err.message });
    }
  }

  if (req.method === "GET" && url.pathname === "/v1/liquidity/latest") {
    const latest = await getLatestSnapshot();
    if (!latest) {
      return json(res, 404, { error: "no_snapshot_yet" });
    }
    return json(res, 200, latest);
  }

  if (req.method === "POST" && url.pathname === "/v1/scan") {
    const result = await scanOnce();
    return json(res, 200, result);
  }

  return json(res, 404, { error: "not_found" });
}

async function main() {
  await connectRedis();

  let scanning = false;
  const tick = async () => {
    if (scanning) return;
    scanning = true;
    try {
      const result = await scanOnce();
      console.log(
        JSON.stringify({
          event: "scan_complete",
          count: result.count,
          totalLiquidityUsd: result.totalLiquidityUsd,
          mode: result.mode,
        })
      );
    } catch (err) {
      console.error("scan_failed", err);
    } finally {
      scanning = false;
    }
  };

  await tick();
  const timer = setInterval(tick, config.scanIntervalMs);

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error("request_failed", err);
      json(res, 500, { error: "internal_error" });
    });
  });

  server.listen(config.port, "0.0.0.0", () => {
    console.log(
      JSON.stringify({
        event: "listening",
        port: config.port,
        service: config.serviceName,
        chainId: config.chainId,
      })
    );
  });

  const shutdown = async (signal) => {
    console.log(JSON.stringify({ event: "shutdown", signal }));
    clearInterval(timer);
    server.close();
    await Promise.allSettled([pool.end(), redis.quit()]);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("fatal", err);
  process.exit(1);
});
