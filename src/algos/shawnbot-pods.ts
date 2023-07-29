// import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { BskyAgent } from '@atproto/api'
import dotenv from 'dotenv'

dotenv.config()

const handle = process.env.BSKY_USERNAME ?? 'uhoh'
const password = process.env.BSKY_PASSWORD ?? 'uhoh'

// max 15 chars
// This needs to match something
export const shortname = 'shawnbot-pods'

export const handler = async (ctx: AppContext, params: QueryParams) => {
	// console.log('handler', { handle, password })
	// only update this if in a test environment
	const agent = new BskyAgent({ service: 'https://bsky.social' })
	const loginResponse = await agent.login({ identifier: handle, password })
	if (!loginResponse?.success) {
		console.error('BLUESKY LOGIN FAILED', loginResponse)
	}
	console.log('logged in', { handle, password })
	const resp = await agent.getAuthorFeed({
		actor: handle,
		limit: params.limit,
		cursor: params.cursor,
	})
	const feed = resp.data.feed.map(post => ({ post: post.post.uri }))
	let cursor: string | undefined
	// const cursor = resp.data.cursor
	console.log('feed', feed)
	// console.log('cursor', cursor)
	// const last = feed.slice(-1)
	const last = resp.data.feed.at(-1)
	if (last) {
		cursor = `${new Date(last.post.indexedAt).getTime()}::${last.cid}`
	}
	return {
		cursor,
		feed,
	}

	// let builder = ctx.db.selectFrom('post').selectAll().orderBy('indexedAt', 'desc').orderBy('cid', 'desc').limit(params.limit)
	// if (params.cursor) {
	// 	const [indexedAt, cid] = params.cursor.split('::')
	// 	if (!indexedAt || !cid) {
	// 		throw new InvalidRequestError('malformed cursor')
	// 	}
	// 	const timeStr = new Date(parseInt(indexedAt, 10)).toISOString()
	// 	builder = builder
	// 		.where('post.indexedAt', '<', timeStr)
	// 		.orWhere(qb => qb.where('post.indexedAt', '=', timeStr))
	// 		.where('post.cid', '<', cid)
	// }
	// const res = await builder.execute()
	// console.log('res', res)
	// const feed = res.map(row => ({
	// 	post: row.uri,
	// }))
	// let cursor: string | undefined
	// const last = res.at(-1)
	// if (last) {
	// 	cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`
	// }
	// return {
	// 	cursor,
	// 	feed,
	// }
}
