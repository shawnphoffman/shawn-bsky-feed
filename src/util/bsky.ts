import { BskyAgent } from '@atproto/api'

import dotenv from 'dotenv'

dotenv.config()

const handle = process.env.BSKY_USERNAME ?? 'uhoh'
const password = process.env.BSKY_PASSWORD ?? 'uhoh'

export const getPodcastEmbedFeed = async () => {
	const agent = new BskyAgent({ service: 'https://bsky.social' })

	const loginResponse = await agent.login({ identifier: handle, password })
	if (!loginResponse?.success) {
		console.error('BLUESKY LOGIN FAILED', loginResponse)
	}

	const resp = await agent.getAuthorFeed({
		actor: handle,
	})

	// Filter out replies and posts without embeds
	const feed = resp.data.feed.filter(item => item.reply === undefined && item.post.embed !== undefined)

	// console.log('feed', JSON.stringify(feed, null, 2))

	return feed
}
