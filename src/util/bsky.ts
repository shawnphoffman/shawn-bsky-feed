import { BskyAgent } from '@atproto/api'

import dotenv from 'dotenv'

dotenv.config()

const handle = process.env.BSKY_USERNAME ?? 'uhoh'
const password = process.env.BSKY_PASSWORD ?? 'uhoh'

export const getAuthorFeed = async () => {
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
		// limit: params.limit,
		// cursor: params.cursor,
	})

	const feed = resp.data.feed
	// const feed = resp.data.feed.map(post => {
	// 	const parent = post?.reply?.parent
	// 	const root = post?.reply?.root

	// 	return {
	// 		uri: post.post.uri,
	// 		cid: post.post.cid,
	// 		replyParent: parent?.uri ?? null,
	// 		replyRoot: root?.uri ?? null,
	// 		indexedAt: new Date().toISOString(),
	// 	}
	// })
	console.log('feed', JSON.stringify(feed, null, 2))

	// let cursor: string | undefined
	// console.log('cursor', cursor)
	// const last = resp.data.feed.at(-1)
	// if (last) {
	// 	cursor = `${new Date(last.post.indexedAt).getTime()}::${last.cid}`
	// }

	return feed

	// return {
	// 	// cursor,
	// 	feed,
	// }
}
