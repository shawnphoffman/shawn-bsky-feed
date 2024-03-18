import { OutputSchema as RepoEvent, isCommit } from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import redis, { RedisKeys } from './util/redis'
import { moderatePost } from '@atproto/api'
import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs'
import { labelPostAsSpoiler } from './util/bsky'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
	async handleEvent(evt: RepoEvent) {
		if (!isCommit(evt)) return
		const ops = await getOpsByType(evt)

		const postsToDelete = ops.posts.deletes.map(del => del.uri)
		const postsToCreate = ops.posts.creates
			.filter(create => {
				// console.log(create)
				// console.log('\n')

				// Only grab posts from ShawnBot
				if (create.author === process.env.FEEDGEN_PUBLISHER_DID) {
					console.log('🆕', create)

					// Ignore replies
					if (create.record.reply !== undefined) {
						console.log(`❌ Ignoring reply: ${create.record.text}`)
						return false
					}

					const hasFacets = create.record.facets !== undefined && create.record.facets.length > 0

					// If it doesn't have facets, it's a simple text post
					// I should probably remove this
					if (!hasFacets) {
						console.log(` - Include no facets: ${create.record.text}`)
						return true
					}

					const hasHashtags =
						hasFacets &&
						// @ts-ignore
						create.record.facets.some(facet => {
							console.log(` - facet: ${JSON.stringify(facet)}`)
							return facet.features.some(f => {
								return f.$type === 'app.bsky.richtext.facet#tag'
							})
						})

					console.log(` - Hashtags: ${hasHashtags}`)

					// If it has hashtags, check for #starwars
					if (hasHashtags) {
						// @ts-ignore
						const hasStarWarsTag = create.record.facets.some(facet => {
							return facet.features.some(f => {
								if (f.$type !== 'app.bsky.richtext.facet#tag') return false
								const wow = f as { tag: string }
								console.log(` - tag: ${wow.tag}`)
								return wow.tag?.toLowerCase() === 'starwars'
							})
						})
						// Don't include posts without the #starwars tag if they have hashtags
						if (!hasStarWarsTag) {
							console.log(`❌ Ignoring non-starwars: ${create.record.text}`)
							return false
						}
						// Include posts with the #starwars tag
						return true
					}

					// Include posts with embeds as a last resort
					const hasEmbed = create.record.embed !== undefined

					console.log(` - HasEmbed: ${hasEmbed}`)

					return hasEmbed
				}

				// C.K. Andor posts
				if (create.author === 'did:plc:aghdedv5e64dlnm2ingixvwe' && process.env.CK_ANDOR_POST === 'true') {
					if (create.record.text.toLowerCase().includes('one day closer to')) {
						console.log('🥷', create)
						return true
					} else {
						console.log(`❌ Ignoring Non-Andor C.K. Post: ${create.record.text}`)
					}
				}

				return false
			})
			.map(create => {
				console.log(`✅ Creating: ${create.record.text}`)
				return {
					uri: create.uri,
					cid: create.cid,
					replyParent: create.record?.reply?.parent.uri ?? null,
					replyRoot: create.record?.reply?.root.uri ?? null,
					indexedAt: new Date().toISOString(),
				}
			})

		if (postsToDelete.length > 0) {
			// const t = await redis.hdel(RedisKeys.ShawnBotPost, ...postsToDelete)
			// console.log(`Deleting: ${t}`)
			await this.db.deleteFrom('post').where('uri', 'in', postsToDelete).execute()
		}
		if (postsToCreate.length > 0) {
			const redisPosts = postsToCreate.reduce((memo, el) => {
				memo[el.uri] = el
				return memo
			}, {})
			const t = await redis.hset(RedisKeys.ShawnBotPost, redisPosts)
			console.log(`Creating: ${t}`)
			await this.db
				.insertInto('post')
				.values(postsToCreate)
				.onConflict(oc => oc.doNothing())
				.execute()
		}

		// Moderation
		ops.posts.creates.forEach(async post => {
			if (!post?.record?.facets) return

			if (post.record.langs?.includes('en') === false) return

			const hasSpoilerTag = post.record.facets.some(facet => {
				return facet.features.some(f => {
					if (f.$type !== 'app.bsky.richtext.facet#tag') return false
					const wow = f as { tag: string }
					return wow.tag?.toLowerCase().includes('spoiler')
				})
			})

			if (!hasSpoilerTag) return

			console.log('⚠️ Labeling spoiler post: ', post.uri)

			labelPostAsSpoiler({ uri: post.uri, cid: post.cid })
		})
	}
}
