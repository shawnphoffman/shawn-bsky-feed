import { AppContext } from '../config'
import { QueryParams, OutputSchema as AlgoOutput } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as shawnPods from './shawnbot-pods'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
	[shawnPods.shortname]: shawnPods.handler,
}

export default algos
