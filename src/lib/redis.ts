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
      disableOfflineQueue: true,
      socket: {
        reconnectStrategy: (retries) => {
          return Math.min(retries * 100, 3000);
        }
      }
    });
    let lastErrorLogTime = 0;
    client.on("error", (err: any) => {
      if (err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED")) {
        const now = Date.now();
        if (now - lastErrorLogTime > 10000) { // Log once every 10 seconds
          console.warn("[redis] Connection refused. Client will keep trying to reconnect silently...");
          lastErrorLogTime = now;
        }
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

    const bgConnect = client.connect().catch((err: unknown) => {
      console.error("[redis] Initial connection failed:", err);
    });

    const connect = Promise.race([
      bgConnect.then(() => client),
      new Promise<RedisClientType>((resolve) => {
        setTimeout(() => resolve(client), 200); // 200ms timeout to avoid hanging
      })
    ]).then((c) => {
      global.redis = c;
      return c;
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
