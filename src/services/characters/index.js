const express = require("express")
const ObjectId = require("mongoose").Types.ObjectId
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const { cloudinary } = require("../../cloudinary")
const cloudStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: "rpgTool/portraits",
	},
})
const cloudMulter = multer({ storage: cloudStorage })

const { authorize } = require("../../auth")

const CharacterModel = require("./schema")
const UserModel = require("../users/schema")

const charactersRouter = express.Router()
charactersRouter.get("/", authorize, async (req, res, next) => {
	try {
		console.log("**********GET Character LIST**********")
		console.log(req.user)
		const users = await CharacterModel.find({ owner: ObjectId(req.user._id) })
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

charactersRouter.get("/byUser/:id", authorize, async (req, res, next) => {
	try {
		const profile = await CharacterModel.find({ owner: req.params.id })
		res.send(profile)
	} catch (error) {
		next(error)
	}
})

charactersRouter.post("/", authorize, async (req, res, next) => {
	try {
		const newCharacter = new CharacterModel(req.body)
		newCharacter.owner = req.user._id

		console.log("null? ->", newCharacter._id)
		const { _id } = await newCharacter.save()
		console.log("save this inside the user pls", _id)
		const user = await UserModel.findByIdAndUpdate(
			req.user._id,
			{
				$push: { characters: _id },
			},
			{
				runValidators: true,
				new: true,
			}
		)
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
		await character.save()
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
		console.log(
			"**********************************************************************"
		)
		try {
			const imageUrl = req.file.path
			const post = { imageUrl }
			console.log("request body", req.body)
			console.log("request user", req.user)
			console.log("request id", req.params.id)
			console.log("request file buffer", req.file.buffer)
			console.log("help")
			const character = await CharacterModel.findById(req.params.id)
			console.log("foundCharacter", character)
			if (String(character.owner) !== String(req.user._id)) {
				console.log("owner ", typeof character.owner, character.owner)
				console.log("-user ", typeof req.user._id, req.user._id)

				const error = new Error(
					`User does not own the Character with id ${req.params.id}`
				)
				error.httpStatusCode = 403
				return next(error)
			}
			console.log(
				"**********************************************************************"
			)
			//res.json({ msg: "image uploaded" })

			const newPost = await CharacterModel.findByIdAndUpdate(
				req.params.id,
				post,
				{
					runValidators: true,
					new: true,
				}
			)
			if (newPost) {
				res.status(201).send(imageUrl)
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
