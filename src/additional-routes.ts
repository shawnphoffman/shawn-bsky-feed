import express from 'express'
import { AppContext } from './config'
import redis, { RedisKeys } from './util/redis'
import { getPodcastEmbedFeed } from './util/bsky'

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

	router.get('/db/posts', async (_req, res) => {
		await ctx.db
			.selectFrom('post')
			.selectAll()
			.orderBy('indexedAt', 'desc')
			.execute()
			.then(posts => {
				res.json(posts)
			})
	})

	router.get('/db/state', async (_req, res) => {
		await ctx.db
			.selectFrom('sub_state')
			.selectAll()
			.execute()
			.then(state => {
				res.json(state)
			})
	})

	// router.get('/db/stats', async (_req, res) => {
	// 	await ctx.db
	// 		.selectFrom('pragma_page_count()')
	// 		.selectAll()
	// 		.execute()
	// 		.then(state => {
	// 			res.json(state)
	// 		})
	// })

	router.get('/refresh', async (_req, res) => {
		const feed = await getPodcastEmbedFeed()
		console.log('feed', feed)
		await ctx.db
			.insertInto('post')
			.values(
				feed.map(({ post }) => {
					return {
						uri: post.uri,
						cid: post.cid,
						indexedAt: post.indexedAt,
						// @ts-ignore
						replyParent: post?.record?.reply?.parent?.uri,
						// @ts-ignore
						replyRoot: post?.record?.reply?.root?.uri,
					}
				})
			)
			.onConflict(oc => oc.doNothing())
			.execute()
			.then(state => {
				res.json({ state })
			})
	})

	return router
}
export default makeRouter
