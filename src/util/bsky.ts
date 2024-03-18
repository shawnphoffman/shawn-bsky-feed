import { BskyAgent } from '@atproto/api'
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs'

import dotenv from 'dotenv'

dotenv.config()

const handle = process.env.BSKY_USERNAME ?? 'uhoh'
const password = process.env.BSKY_PASSWORD ?? 'uhoh'

export const getPodcastEmbedFeed = async () => {
	const agent = new BskyAgent({ service: 'https://bsky.social' })

	const loginResponse = await agent.login({ identifier: handle, password })
	if (!loginResponse?.success) {
		console.error('BLUESKY LOGIN FAILED', loginResponse)
		return []
	}

	const resp = await agent.getAuthorFeed({
		actor: handle,
	})

	// Filter out replies and posts without embeds
	const feed = resp.data.feed.filter(item => item.reply === undefined && item.post.embed !== undefined)

	// console.log('feed', JSON.stringify(feed, null, 2))

	return feed
}

export const labelPostAsSpoiler = async ({ uri, cid }) => {
	try {
		const agent = new BskyAgent({ service: 'https://bsky.social' })

		const loginResponse = await agent.login({
			identifier: process.env.MOD_BSKY_USERNAME!,
			password: process.env.MOD_BSKY_PASSWORD!,
		})
		if (!loginResponse?.success) {
			console.error('BLUESKY MOD LOGIN FAILED', loginResponse)
			return
		}

		const data = {
			event: {
				$type: 'tools.ozone.moderation.defs#modEventLabel',
				createLabelVals: ['spoiler'],
				negateLabelVals: [],
			},
			subject: {
				$type: 'com.atproto.repo.strongRef',
				uri: uri,
				cid: cid,
			},
			subjectBlobCids: [],
			createdBy: process.env.MOD_BSKY_USERNAME!,
			createdAt: new Date().toISOString(),
		}

		await agent.withProxy('atproto_labeler', process.env.MOD_BSKY_USERNAME!).api.xrpc.call('tools.ozone.moderation.emitEvent', {}, data)

		// console.log('temp', temp)
	} catch (error) {
		console.log('❌❌❌ spoiler label error', error)
	}
}
