import { AppContext } from '../config'
import { AppBskyFeedGetFeedSkeleton } from '@atproto/api'
import * as shawnPods from './shawnbot-pods'

type AlgoHandler = (ctx: AppContext, params: AppBskyFeedGetFeedSkeleton.QueryParams) => Promise<AppBskyFeedGetFeedSkeleton.OutputSchema>

const algos: Record<string, AlgoHandler> = {
	[shawnPods.shortname]: shawnPods.handler,
}

export default algos
