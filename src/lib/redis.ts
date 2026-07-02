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
 *
 * **Graceful fallback:** returns `null` when Redis is not configured or the
 * connection fails — callers must handle `null` and fall through to the DB.
 */
export async function getRedis(): Promise<RedisClientType | null> {
  if (global.redis?.isReady) {
    return global.redis;
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return null;
  }

  if (!global.redisConnectPromise) {
    const client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          return Math.min(retries * 100, 3000);
        }
      }
    });
    client.on("error", (err: any) => {
      if (err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED")) {
        console.warn("[redis] Connection refused. Client will try to reconnect...");
      } else {
        console.error("[redis]", err);
      }
    });
    client.on("connect", () => {
      console.log("[redis] connected");
    });
    client.on("reconnecting", () => {
      // quiet down reconnect logging
    });
    client.on("end", () => {
      console.log("[redis] disconnected");
    });

    const connect = client.connect().then(() => {
      global.redis = client;
      return client;
    });

    // Surface connection failures so callers get a clean rejection
    // instead of an unhandled promise rejection.
    connect.catch((err: unknown) => {
      console.error("[redis] Initial connection failed:", err);
    });

    global.redisConnectPromise = connect;
  }

  try {
    return await global.redisConnectPromise;
  } catch {
    // Connection failed — callers fall through to DB
    return null;
  }
}
