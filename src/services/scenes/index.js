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

const CharacterModel = require("./schema")

const charactersRouter = express.Router()
charactersRouter.get("/", authorize, async (req, res, next) => {
	try {
		console.log("**********GET Character LIST**********")
		console.log(req.user)
		const users = await CharacterModel.find()
		console.log(users)
		res.send(users)
	} catch (error) {
		next(error)
	}
})

charactersRouter.get("/:id", authorize, async (req, res, next) => {
	try {
		const profile = await CharacterModel.findById(req.params.id)
		res.send(profile)
	} catch (error) {
		next(error)
	}
})

charactersRouter.post("/", authorize, async (req, res, next) => {
	try {
		const newCharacter = new CharacterModel(req.body)
		console.log("null? ->", newCharacter._id)
		const { _id } = await newCharacter.save()
		console.log(_id)
		res.status(201).send(_id)
	} catch (error) {
		next(error)
	}
})

charactersRouter.put("/:id", authorize, async (req, res, next) => {
	try {
		const updates = Object.keys(req.body)
		const character = await CharacterModel.findById(req.params.id)
		//add check for ownership before updating
		updates.forEach((update) => (character[update] = req.body[update]))
		await charactet.save()
		res.send(req.user)
	} catch (error) {
		next(error)
	}
})

charactersRouter.delete("/:id", authorize, async (req, res, next) => {
	try {
		const character = await CharacterModel.findById(req.params.id)
		await character.deleteOne(res.send("Deleted"))
	} catch (error) {
		next(error)
	}
})

charactersRouter.post(
	"/imageUpload/:id",
	authorize,
	cloudMulter.single("image"),
	async (req, res, next) => {
		try {
			const post = { profilePicUrl: req.file.path }
			/* const author = await UserSchema.findById(req.params.id, {
				_id: 0,
				user: 1,
			}) */
			const character = await CharacterModel.findById(req.params.id)
			if (character.user._id !== req.user._id) {
				const error = new Error(
					`User does not own the Character with id ${req.params.id}`
				)
				error.httpStatusCode = 403
				return next(error)
			}
			console.log(req.body)
			console.log(req.file.buffer)
			console.log("help")
			//res.json({ msg: "image uploaded" })

			const newPost = await CharacterSchema.findByIdAndUpdate(
				req.params.id,
				post,
				{
					runValidators: true,
					new: true,
				}
			)
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

module.exports = charactersRouter
