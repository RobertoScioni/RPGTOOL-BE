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

const CharacterModel = require("./schema")
const UserModel = require("../users/schema")

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

const templateSheet = {
	Counters: [
		{
			name: "Physical Stress",
			min: 0,
			value: 0,
			max: 2,
			abbreviation: "PS",
		},
		{
			name: "Mental Stress",
			min: 0,
			value: 0,
			max: 2,
			abbreviation: "MS",
		},
		{ name: "Fate Points", min: 0, value: 2, max: 2, abbreviation: "FP" },
	],
	Pages: {
		Skills: [
			{ name: "Lore", macro: "[4dF+4]" },
			{ name: "Rapport", macro: "[4dF+3]" },
			{ name: "Crafts", macro: "[4dF+3]" },
			{ name: "Athletics", macro: "[4dF+2]" },
			{ name: "Will", macro: "[4dF+2]" },
			{ name: "Investigate", macro: "[4dF+2]" },
			{ name: "Fight", macro: "[4dF+1]" },
			{ name: "Resources", macro: "[4dF+1]" },
			{ name: "Contacts", macro: "[4dF+1]" },
			{ name: "Notice", macro: "[4dF+1]" },
		],
		Aspects: [
			{ name: "Wizard for hire" },
			{ name: "Rivals in the collegia arcana" },
			{ name: "If i haven't been there, i've read about it" },
			{ name: "not the face!" },
			{ name: "doesn't suffer fools gladly" },
		],

		Consequences: [
			{ name: "Mild", value: "" },
			{ name: "Moderate", value: "" },
			{ name: "Severe", value: "" },
		],
		extras: [],
		Stunts: [
			{
				name: "Scholar,healer",
				dsc: "can attempt physical recovery using Lore",
			},
			{
				name: "Friendly Liar",
				dsc:
					"Can use Rapport in place of Deceive to create advantages predicated on a lie.",
			},
			{
				name: "The Power of Deduction",
				dsc: ` 
					Once per scene you can spend a fate point
					(and a few minutes of observation) to make 
					a special Investigate roll 
					representing your potent deductive faculties.
					For each shift you make on this roll you discover 
					or create an aspect, on either the scene or	
					the target of your observations, 
					though you may only invoke one of them for free.
				`,
			},
			{
				name: "I’ve Read about That!",
				dsc: `
					You’ve read hundreds—if not thousands—of
					books on a wide variety of topics. 
					You can spend a fate point to use
					Lore in place of any other skill 
					for one roll or exchange, provided you
					can justify having read about 
					the action you’re attempting.
				`,
			},
		],
	},
}

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
		newCharacter.sheet = templateSheet
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
			const post = { imageUrl: req.file.path }
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
				res.status(201).send("image updated")
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
