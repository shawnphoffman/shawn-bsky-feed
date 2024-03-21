import express from 'express'
import { AppContext } from './config'
import redis, { RedisKeys } from './util/redis'
import { getPodcastEmbedFeed } from './util/bsky'
import bodyParser from 'body-parser'
import { Post } from './db/schema'
import cors from 'cors'
// import { createClient, RedisClientOptions, RedisClientType } from "redis";

var jsonParser = bodyParser.json()

const makeRouter = (ctx: AppContext) => {
	const router = express.Router()

	router.use(cors())

	//
	const checkKey = function (req: express.Request, res: express.Response, next: express.NextFunction) {
		console.log('🔑🔑 CHECKING KEY 🔑🔑')
		const key = req.headers['x-force-key']
		if (process.env.FORCE_KEY !== key) {
			console.warn('🚫🚫 INVALID OR MISSING KEY 🚫🚫')
			return res.status(403).send('Forbidden')
		}
		next()
	}

	// HEALTH CHECK
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

	// LIST ALL DB POSTS
	router.get('/db/list', async (_req: express.Request, res: express.Response) => {
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

	// REFRESH DB POSTS
	router.get('/db/refresh', async (_req: express.Request, res: express.Response) => {
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

	// ================
	// MISC ROUTES
	// ================

	// FORCE ADD POST TO DB
	router.post('/force', [jsonParser, checkKey], async (req: express.Request, res: express.Response) => {
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

	// FORCE KILL SERVER
	router.get('/kill', checkKey, async (_req, _res) => {
		process.exit(0)
	})

	// ================
	// CRUD
	// ================

	router.get('/posts', checkKey, async (_req: express.Request, res: express.Response) => {
		const posts = await ctx.db.selectFrom('post').selectAll().orderBy('indexedAt', 'desc').execute()
		return res.json(posts)
	})

	router.post('/posts', [jsonParser, checkKey], async (req: express.Request, res: express.Response) => {
		if (!req.body) {
			return res.status(400).send('Bad Request')
		}
		const post: Post = req.body
		const resp = await ctx.db
			.insertInto('post')
			.values(post)
			.returningAll()
			.onConflict(oc => oc.doNothing())
			.execute()
		return res.json(resp)
	})

	router.delete('/posts/:cid', checkKey, async (req: express.Request, res: express.Response) => {
		await ctx.db.deleteFrom('post').where('post.cid', '=', req.params.cid).execute()
		return res.sendStatus(200)
	})

	return router
}
export default makeRouter
