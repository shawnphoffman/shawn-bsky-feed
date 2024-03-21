import express from 'express'
import { AppContext } from '../types/config'
import redis, { RedisKeys } from '../util/redis'

const makeRouter = (ctx: AppContext) => {
	const router = express.Router()

	// ================
	// HEALTH CHECK
	// ================

	router.get('/health', async (_req: express.Request, res: express.Response) => {
		const temp = await ctx.db
			.selectFrom('post')
			.select(({ fn }) => fn.countAll().as('num_posts'))
			.executeTakeFirst()
		console.log(`✅ health check | post count: ${temp?.num_posts ?? 0}`)
		res.sendStatus(200)
	})

	// ================
	// DATABASE ROUTES
	// ================

	// PRINT ALL DB POSTS
	router.get('/db/print', async (_req: express.Request, res: express.Response) => {
		const posts = await ctx.db.selectFrom('post').selectAll().orderBy('indexedAt', 'desc').execute()
		console.log(`📙 /list posts`)
		for (const post of posts) {
			console.log(`   - ${post.uri} (${post.indexedAt})`)
		}
		console.log(`📙 end/list`)
		return res.json(posts)
	})

	// LIST DB CURSOR STATE
	router.get('/db/state', async (_req: express.Request, res: express.Response) => {
		await ctx.db
			.selectFrom('sub_state')
			.selectAll()
			.execute()
			.then(state => {
				res.json(state)
			})
	})

	// ================
	// REDIS ROUTES
	// ================

	// LIST ALL REDIS POSTS
	router.get('/redis', async (_req: express.Request, res: express.Response) => {
		try {
			const data = await redis.hgetall(RedisKeys.ShawnBotPost)
			if (!data) {
				return res.json({ redis: [] })
			}
			let dataArray = Object.values(data)
			dataArray.sort((a: any, b: any) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime())
			res.json({ length: dataArray.length, redis: dataArray })
		} catch (error) {
			console.log('error', error)
			res.json({ error })
		}
	})

	return router
}
export default makeRouter
