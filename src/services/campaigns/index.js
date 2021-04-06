const express = require("express")
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const { cloudinary } = require("../../cloudinary")
const cloudStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: "rpgTool/campaigns",
	},
})
const cloudMulter = multer({ storage: cloudStorage })

const { authorize } = require("../../auth")

const CampaignsModel = require("./schema")

const campaignsRouter = express.Router()
campaignsRouter.get("/", authorize, async (req, res, next) => {
	try {
		console.log("**********GET Campaign LIST**********")
		console.log(req.user)
		const users = await CampaignsModel.find()
		console.log(users)
		res.send(users)
	} catch (error) {
		next(error)
	}
})

campaignsRouter.get(
	"/:id",
	/* authorize, */ async (req, res, next) => {
		try {
			const profile = await CampaignsModel.findById(req.params.id)
				.populate("scenes")
				.populate({
					path: "members",
					populate: { path: "characters", model: "Character" },
				})
			res.send(profile)
		} catch (error) {
			next(error)
		}
	}
)

campaignsRouter.get("/:id/messages", authorize, async (req, res, next) => {
	try {
		const messages = await CampaignsModel.findById(req.params.id).select(
			"messages"
		)
		console.log("#################", req.user._id, "asks for the messages")
		let out = messages.messages.filter((message, index) => {
			console.log(index, "---------------------------", message)
			if (!message.toPlayers) return true
			console.log("message is a pm")
			if (message.sender._id === req.user.id) return true
			console.log("user did not send the pm")
			if (message.toPlayers.includes(req.user.id)) return true
			console.log("user was not a recipient for the pm")
			return false
		})
		res.send(out)
	} catch (error) {
		next(error)
	}
})

campaignsRouter.post("/", authorize, async (req, res, next) => {
	try {
		const newCampaign = new CampaignsModel(req.body)
		newCampaign.owner = req.user._id
		console.log("null? ->", newCampaign._id)
		const { _id } = await newCampaign.save()
		console.log(_id)
		res.status(201).send(_id)
	} catch (error) {
		next(error)
	}
})

campaignsRouter.put("/:id", authorize, async (req, res, next) => {
	try {
		const updates = Object.keys(req.body)
		console.log(updates)
		const campaign = await CampaignsModel.findById(req.params.id)
		//add check for ownership before updating
		updates.forEach((update) => (campaign[update] = req.body[update]))
		await campaign.save()
		res.send(req.user)
	} catch (error) {
		next(error)
	}
})

campaignsRouter.post(
	"/:id/addScene/:scene",
	authorize,
	async (req, res, next) => {
		try {
			const campaign = await CampaignsModel.findByIdAndUpdate(req.params.id, {
				$addToSet: { scenes: req.params.scene },
			})
			//add check for ownership before updating

			//await campaign.save()
			res.send(campaign)
		} catch (error) {
			next(error)
		}
	}
)

campaignsRouter.post(
	"/:id/removeScene/:scene",
	authorize,
	async (req, res, next) => {
		try {
			const campaign = await CampaignsModel.findByIdAndUpdate(req.params.id, {
				$pull: { scenes: req.params.scene },
			})
			//add check for ownership before updating

			//await campaign.save()
			res.send(campaign)
		} catch (error) {
			next(error)
		}
	}
)

campaignsRouter.delete("/:id", authorize, async (req, res, next) => {
	try {
		const campaign = await CampaignsModel.findById(req.params.id)
		await campaign.deleteOne(res.send("Deleted"))
	} catch (error) {
		next(error)
	}
})

campaignsRouter.post(
	"/imageUpload/:id",
	authorize,
	cloudMulter.single("image"),
	async (req, res, next) => {
		try {
			const imageUrl = req.file.path
			const post = { imageUrl }
			const campaign = await CampaignsModel.findById(req.params.id)
			console.log(campaign)
			if (String(campaign.owner._id) !== String(req.user._id)) {
				const error = new Error(
					`User does not own the Campaign with id ${req.params.id}`
				)
				error.httpStatusCode = 403
				return next(error)
			}
			console.log("body", req.body)
			console.log("file", req.file.buffer)
			console.log("image uploaded", post)
			console.log("help")
			//res.json({ msg: "image uploaded" })

			const newPost = await CampaignsModel.findByIdAndUpdate(
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

module.exports = campaignsRouter
