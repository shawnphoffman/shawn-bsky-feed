import dotenv from 'dotenv'
import { Redis } from '@upstash/redis'

dotenv.config()

export const RedisKeys = {
	ShawnBotPost: 'bsky:feed:shawnbot:posts:',
}

const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export default redis
