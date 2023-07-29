import dotenv from 'dotenv'
import { AtpAgent } from '@atproto/api'
import { ids } from '../src/lexicon/lexicons'

const run = async () => {
	dotenv.config()

	// YOUR bluesky handle
	// Ex: user.bsky.social
	if (!process.env.BSKY_HANDLE) {
		throw new Error('Please provide an bsky handle in the .env file')
	}
	const handle = process.env.BSKY_HANDLE

	// YOUR bluesky password, or preferably an App Password (found in your client settings)
	// Ex: abcd-1234-efgh-5678
	if (!process.env.FEEDGEN_PUBLISH_APP_PASSWORD) {
		throw new Error('Please provide an app password in the .env file')
	}
	const password = process.env.FEEDGEN_PUBLISH_APP_PASSWORD

	// A short name for the record that will show in urls
	// Lowercase with no spaces.
	// Ex: whats-hot
	if (!process.env.FEEDGEN_SHORT_NAME) {
		throw new Error('Please provide an bsky handle in the .env file')
	}
	const recordName = process.env.FEEDGEN_SHORT_NAME

	// -------------------------------------
	// NO NEED TO TOUCH ANYTHING BELOW HERE
	// -------------------------------------

	if (!process.env.FEEDGEN_SERVICE_DID && !process.env.FEEDGEN_HOSTNAME) {
		throw new Error('Please provide a hostname in the .env file')
	}

	// only update this if in a test environment
	const agent = new AtpAgent({ service: 'https://bsky.social' })
	await agent.login({ identifier: handle, password })

	// try {
	//   await agent.api.app.bsky.feed.describeFeedGenerator()
	// } catch (err) {
	//   throw new Error(
	//     'The bluesky server is not ready to accept published custom feeds yet',
	//   )
	// }

	// let avatarRef: BlobRef | undefined
	// if (avatar) {
	//   let encoding: string
	//   if (avatar.endsWith('png')) {
	//     encoding = 'image/png'
	//   } else if (avatar.endsWith('jpg') || avatar.endsWith('jpeg')) {
	//     encoding = 'image/jpeg'
	//   } else {
	//     throw new Error('expected png or jpeg')
	//   }
	//   const img = await fs.readFile(avatar)
	//   const blobRes = await agent.api.com.atproto.repo.uploadBlob(img, {
	//     encoding,
	//   })
	//   avatarRef = blobRes.data.blob
	// }

	// await agent.api.com.atproto.repo.putRecord({
	//   repo: agent.session?.did ?? '',
	//   collection: ids.AppBskyFeedGenerator,
	//   rkey: recordName,
	//   record: {
	//     did: feedGenDid,
	//     displayName: displayName,
	//     description: description,
	//     avatar: avatarRef,
	//     createdAt: new Date().toISOString(),
	//   },
	// })

	await agent.api.com.atproto.repo.deleteRecord({
		repo: agent.session?.did ?? '',
		rkey: recordName,
		collection: ids.AppBskyFeedGenerator,
	})

	console.log('All done 🎉')
}

run()
