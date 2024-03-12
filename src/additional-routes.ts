import express from 'express'
import { AppContext } from './config'
import redis, { RedisKeys, redisClient } from './util/redis'
import { getPodcastEmbedFeed } from './util/bsky'
// import { createClient, RedisClientOptions, RedisClientType } from "redis";

type BskyPost = {
	uri: string
	cid: string
	replyParent: boolean
	replyRoot: boolean
	indexedAt: string
}

const makeRouter = (ctx: AppContext) => {
	const router = express.Router()

	router.get('/health', (_req, res) => {
		res.sendStatus(200)
	})

	router.get('/redis2', async (req, res) => {
		const client = await redisClient.connect()
		try {
			const data = await client.ZRANGE(RedisKeys.StarWarsZRANGE, '+inf', 0, { REV: true, BY: 'SCORE' })

			if (!data) {
				return res.json({ redis: [] })
			}

			// let dataArray = Object.values(data)

			// dataArray.sort((a: any, b: any) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime())

			res.json({ length: data.length, redis: data })
		} catch (error) {
			console.log('error', error)
			res.json({ error })
		} finally {
			client.disconnect()
		}
	})

	// router.get('/redis2/update', async (req, res) => {
	// 	const upstashExisting = await redis.hgetall(RedisKeys.ShawnBotPost)

	// 	const client = await redisClient.connect()

	// 	client.on('error', function (err) {
	// 		console.log('Error ' + err)
	// 	})

	// 	// let testValues: string[] = []
	// 	let out = {}

	// 	try {
	// 		if (upstashExisting) {
	// 			Object.entries(upstashExisting).forEach(([key, value]: [string, BskyPost]) => {
	// 				// client.multi().lPush(RedisKeys.ShawnBotPost, key).exec()
	// 				const dt = new Date(value.indexedAt).getTime()
	// 				client.multi().zAdd(RedisKeys.StarWarsZRANGE, { score: dt, value: key }).exec()
	// 			})
	// 		}

	// 		// testValues = await client.lRange(RedisKeys.ShawnBotPost, 0, -1)
	// 		out = {
	// 			// lrange: await client.lRange(RedisKeys.ShawnBotPost, 0, -1),
	// 			zrange: await client.zRange('z', 0, -1),
	// 		}
	// 	} catch (error) {
	// 		console.log('error', error)
	// 	} finally {
	// 		client.disconnect()
	// 	}

	// 	res.json(out)
	// 	// res.json({
	// 	// 	redis: {
	// 	// 		testValues,
	// 	// 	},
	// 	// })
	// })

	router.get('/redis', async (req, res) => {
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

	router.get('/db/posts', async (_req, res) => {
		const posts = await ctx.db.selectFrom('post').selectAll().orderBy('indexedAt', 'desc').execute()
		res.json({ length: posts.length, posts })
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

	router.get('/kill', async (_req, res) => {
		process.exit(0)
	})

	return router
}
export default makeRouter
