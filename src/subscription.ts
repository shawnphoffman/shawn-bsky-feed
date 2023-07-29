import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import redis, { RedisKeys } from './util/redis'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    for (const post of ops.posts.creates) {
      // console.log(`$: ${post.record.text}`)
      if (post.author === process.env.FEEDGEN_PUBLISHER_DID) {
        // console.log(`+CREATE+`, post)
        console.log(`${post.author}: "${post.record.text}" [${post.uri}]`)
      }
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // only alf-related posts
        // return create.record.text.toLowerCase().includes('shawn')
        return create.author === process.env.FEEDGEN_PUBLISHER_DID
      })
      .map((create) => {
        // map alf-related posts to a db row
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
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
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
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
