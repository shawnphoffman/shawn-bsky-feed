import express from 'express'
import { AppContext } from './config'
import redis, { RedisKeys } from './util/redis'

const makeRouter = (ctx: AppContext) => {
	const router = express.Router()

	router.get('/redis', async (req, res) => {
		const t = await redis.hgetall(RedisKeys.ShawnBotPost)
		res.json({ redis: t })
	})

	router.get('/derp', (_req, res) => {
		res.json({
			herp: 'derp',
		})
	})

	router.get('/health', (_req, res) => {
		res.sendStatus(200)
	})

	return router
}
export default makeRouter
