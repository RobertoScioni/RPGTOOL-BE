const express = require("express")
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const { cloudinary } = require("../../cloudinary")
const cloudStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: "rpgTool/scenes",
	},
})
const cloudMulter = multer({ storage: cloudStorage })

const { authorize } = require("../../auth")

const ScenesModel = require("./schema")

const scenesRouter = express.Router()
scenesRouter.get("/", authorize, async (req, res, next) => {
	try {
		console.log("**********GET Scene LIST**********")
		console.log(req.user)
		const users = await ScenesModel.find()
		console.log(users)
		res.send(users)
	} catch (error) {
		next(error)
	}
})

scenesRouter.get("/:id", authorize, async (req, res, next) => {
	try {
		const profile = await ScenesModel.findById(req.params.id)
		res.send(profile).populate({
			path: "members",
			populate: { path: "characters", model: "Character" },
		})
	} catch (error) {
		next(error)
	}
})

scenesRouter.post("/", authorize, async (req, res, next) => {
	try {
		const newScene = new ScenesModel(req.body)
		newScene.owner = req.user._id
		console.log("null? ->", newScene._id)
		const { _id } = await newScene.save()
		console.log(_id)
		res.status(201).send(_id)
	} catch (error) {
		next(error)
	}
})

scenesRouter.put("/:id", authorize, async (req, res, next) => {
	try {
		const updates = Object.keys(req.body)
		console.log(updates)
		const scene = await ScenesModel.findById(req.params.id)
		//add check for ownership before updating
		updates.forEach((update) => (scene[update] = req.body[update]))
		await scene.save()
		res.send(req.user)
	} catch (error) {
		next(error)
	}
})

scenesRouter.delete("/:id", authorize, async (req, res, next) => {
	try {
		const scene = await ScenesModel.findById(req.params.id)
		await scene.deleteOne(res.send("Deleted"))
	} catch (error) {
		next(error)
	}
})

scenesRouter.post(
	"/imageUpload/:id",
	authorize,
	cloudMulter.single("image"),
	async (req, res, next) => {
		try {
			const post = { imageUrl: req.file.path }
			const scene = await ScenesModel.findById(req.params.id)
			console.log(scene)
			if (String(scene.owner._id) !== String(req.user._id)) {
				const error = new Error(
					`User does not own the Scene with id ${req.params.id}`
				)
				error.httpStatusCode = 403
				return next(error)
			}
			console.log("body", req.body)
			console.log("file", req.file.buffer)
			console.log("image uploaded", post)
			console.log("help")
			//res.json({ msg: "image uploaded" })

			const newPost = await ScenesModel.findByIdAndUpdate(req.params.id, post, {
				runValidators: true,
				new: true,
			})
			if (newPost) {
				res.status(201).send("immage updated")
			} else {
				const error = new Error(`Post with id ${req.params.id} not found`)
				error.httpStatusCode = 404
				next(error)
			}
		} catch (error) {
			console.log("error", error)
			next(error)
		}
	}
)

module.exports = scenesRouter
