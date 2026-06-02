import { createClient, type RedisClientType } from "redis";

declare global {
  var redis: RedisClientType | undefined;
  var redisConnectPromise: Promise<RedisClientType> | undefined;
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

/**
 * Returns a connected Redis client. Reuses the same connection in dev (hot reload).
 * Requires `REDIS_URL` (e.g. `redis://localhost:6379`).
 */
export async function getRedis(): Promise<RedisClientType> {
  if (global.redis?.isOpen) {
    return global.redis;
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is not set.");
  }

  if (!global.redisConnectPromise) {
    const client = createClient({ url });
    client.on("error", (err) => {
      console.error("[redis]", err);
    });
    client.on("connect", () => {
      console.log("[redis] connected");
    });
    client.on("reconnecting", () => {
      console.log("[redis] reconnecting");
    });
    client.on("end", () => {
      console.log("[redis] disconnected");
    });
    global.redisConnectPromise = client.connect().then(() => {
      global.redis = client;
      return client;
    });
  }

  return global.redisConnectPromise;
}
