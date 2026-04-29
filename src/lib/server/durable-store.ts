type RedisValue = string | number;
type RedisCommand = RedisValue[];

interface RedisResponse<T> {
  result?: T;
  error?: string;
}

export function isDurableStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  if (!url || !token) return null;
  return { url, token };
}

export async function redisCommand<T>(
  command: RedisCommand,
): Promise<T | null> {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Durable store request failed: ${response.status}`);
  }

  const payload = (await response.json()) as RedisResponse<T>;
  if (payload.error) {
    throw new Error(`Durable store command failed: ${payload.error}`);
  }
  return payload.result ?? null;
}
