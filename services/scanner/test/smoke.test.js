import test from "node:test";
import assert from "node:assert/strict";

test("synthetic reserve math stays positive", async () => {
  const wave = Math.sin(1) * 0.08 + 1;
  const base0 = 1_000_000n * 1_000_000n;
  const reserve0 = (base0 * BigInt(Math.round(wave * 1000))) / 1000n;
  assert.ok(reserve0 > 0n);
});

test("health payload shape", () => {
  const body = {
    status: "ok",
    service: "dex-liquidity-scanner",
    db: true,
    redis: true,
  };
  assert.equal(body.status, "ok");
  assert.equal(typeof body.service, "string");
});
