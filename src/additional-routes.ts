import express from 'express'
import { AppContext } from './config'

const makeRouter = (ctx: AppContext) => {
	const router = express.Router()

	router.get('/derp', (_req, res) => {
		res.json({
			herp: 'derp',
		})
	})

	router.get('/health', (_req, res) => {
		res.sendStatus(200)
	})

	return router
}
export default makeRouter
