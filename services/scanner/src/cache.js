import { createClient } from "redis";
import { config } from "./config.js";

export const redis = createClient({ url: config.redisUrl });

redis.on("error", (err) => {
  console.error("redis_error", err.message);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function healthCheck() {
  const pong = await redis.ping();
  return pong === "PONG";
}

export async function setLatestSnapshot(payload) {
  await redis.set("scanner:latest", JSON.stringify(payload), { EX: 300 });
}

export async function getLatestSnapshot() {
  const raw = await redis.get("scanner:latest");
  return raw ? JSON.parse(raw) : null;
}
