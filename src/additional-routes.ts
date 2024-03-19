import express from 'express'
import { AppContext } from './config'
import redis, { RedisKeys } from './util/redis'
import { getPodcastEmbedFeed } from './util/bsky'
import bodyParser from 'body-parser'
// import { createClient, RedisClientOptions, RedisClientType } from "redis";

// type BskyPost = {
// 	uri: string
// 	cid: string
// 	replyParent: boolean
// 	replyRoot: boolean
// 	indexedAt: string
// }

var jsonParser = bodyParser.json()

const makeRouter = (ctx: AppContext) => {
	const router = express.Router()

	router.get('/health', async (_req, res) => {
		const temp = await ctx.db
			.selectFrom('post')
			.select(({ fn }) => fn.countAll().as('num_posts'))
			.executeTakeFirst()
		console.log(`✅ health check | post count: ${temp?.num_posts ?? 0}`)
		res.sendStatus(200)
	})

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

	router.post('/force', jsonParser, async (req, res) => {
		const key = req.headers['x-force-key']
		if (process.env.FORCE_KEY !== key) {
			return res.status(403).send('Forbidden')
		}

		if (!req.body) {
			return res.status(400).send('Bad Request')
		}

		const { uri, cid, indexedAt, replyParent, replyRoot } = req.body

		if (!uri || !cid || !indexedAt) {
			return res.status(400).send('Bad Request')
		}

		const post = {
			uri,
			cid,
			indexedAt,
			replyParent,
			replyRoot,
		}

		const resp = await ctx.db
			.insertInto('post')
			.values(post)
			.returningAll()
			.onConflict(oc => oc.doNothing())
			.execute()

		res.send(resp)
	})

	router.get('/kill', async (_req, res) => {
		process.exit(0)
	})

	return router
}
export default makeRouter
