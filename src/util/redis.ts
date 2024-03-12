import dotenv from 'dotenv'
import { Redis } from '@upstash/redis'
import { createClient } from 'redis'

dotenv.config()

export const RedisKeys = {
	ShawnBotPost: 'bsky:feed:shawnbot:posts:',
	StarWarsZRANGE: 'bsky:feed:starwars:zrange',
}

const upstashRedis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const redisClient: ReturnType<typeof createClient> = createClient({
	url: process.env.REDIS_PRIVATE_URL || process.env.REDIS_PUBLIC_URL || undefined,
	legacyMode: false,
})

export default upstashRedis
