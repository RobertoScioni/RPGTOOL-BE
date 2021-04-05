const express = require("express")
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

const TemplateSchema = require("./schema")
const UserModel = require("../users/schema")

const templateRouter = express.Router()
templateRouter.get("/", authorize, async (req, res, next) => {
	try {
		console.log("**********GET Character LIST**********")
		console.log(req.user)
		const users = await TemplateSchema.find()
		console.log(users)
		res.send(users)
	} catch (error) {
		next(error)
	}
})

templateRouter.get("/:id", authorize, async (req, res, next) => {
	try {
		const profile = await TemplateSchema.findById(req.params.id)
		res.send(profile)
	} catch (error) {
		next(error)
	}
})

templateRouter.get("/byUser/:id", authorize, async (req, res, next) => {
	try {
		const profile = await TemplateSchema.find({ owner: req.params.id })
		res.send(profile)
	} catch (error) {
		next(error)
	}
})

templateRouter.post("/", authorize, async (req, res, next) => {
	try {
		const newCharacter = new TemplateSchema(req.body)
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

templateRouter.put("/:id", authorize, async (req, res, next) => {
	try {
		const updates = Object.keys(req.body)
		const character = await TemplateSchema.findById(req.params.id)
		//add check for ownership before updating
		updates.forEach((update) => (character[update] = req.body[update]))
		await character.save()
		res.send(req.user)
	} catch (error) {
		next(error)
	}
})

templateRouter.delete("/:id", authorize, async (req, res, next) => {
	try {
		const character = await TemplateSchema.findById(req.params.id)
		await character.deleteOne(res.send("Deleted"))
	} catch (error) {
		next(error)
	}
})

templateRouter.post(
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
			const character = await TemplateSchema.findById(req.params.id)
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

			const newPost = await TemplateSchema.findByIdAndUpdate(
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

module.exports = templateRouter
