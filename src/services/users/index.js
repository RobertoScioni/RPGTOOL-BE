const express = require("express")
const q2m = require("query-to-mongo")
const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const { cloudinary } = require("../../cloudinary")
const cloudStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: "Instagram/posts",
	},
})
const cloudMulter = multer({ storage: cloudStorage })
const { authenticate, refreshTokens, authorize } = require("../../auth")
const passport = require("passport")

const UserModel = require("./schema")
const usersRouter = express.Router()
usersRouter.get("/", authorize, async (req, res, next) => {
	try {
		console.log("**********GET USER LIST**********")
		console.log(req.user)
		const users = await UserModel.find().populate("characters")
		console.log(users)
		res.send(users)
	} catch (error) {
		next(error)
	}
})

usersRouter.get("/me", authorize, async (req, res, next) => {
	try {
		console.log("help me")
		const profile = await UserModel.find(req.user._id).select(
			"name dsc imageUrl"
		)
		console.log("got this as profile", profile)
		res.send(profile[0])
	} catch (error) {
		next(error)
	}
})

usersRouter.get("/my-chars", authorize, async (req, res, next) => {
	try {
		console.log("help me")
		const profile = await UserModel.findById(req.user._id).populate(
			"characters"
		)
		console.log("got this as profile", profile)
		res.send(profile.characters)
	} catch (error) {
		next(error)
	}
})

usersRouter.get(
	"/googleLogin",
	passport.authenticate("google", { scope: ["profile", "email"] })
)

usersRouter.get(
	"/googleRedirect",
	passport.authenticate("google"),
	async (req, res, next) => {
		try {
			res.cookie("accessToken", req.user.tokens.accessToken, {
				httpOnly: true,
			})
			res.cookie("refreshToken", req.user.tokens.refreshToken, {
				httOnly: true,
				path: "/users/refreshToken",
			})
			console.log("last thingy thing")

			res
				.status(200)
				.redirect(
					`http://localhost:3000?accessToken=${req.user.tokens.accessToken}&refreshToken=${req.user.tokens.refreshToken}`
				)
		} catch (error) {
			next(error)
		}
	}
)
usersRouter.post("/login", async (req, res, next) => {
	try {
		const { email, password } = req.body
		console.log("cookies", req.cookies)
		console.log("login attempt by user", email)
		const tokens = await authenticate({ email, password })
		console.log("tokens", tokens)
		res.cookie("accessToken", tokens.accessToken, {
			httpOnly: true,
			//sameSite: "lax",
			sameSite: "none",
			secure: true,
		})
		res.cookie("refreshToken", tokens.refreshToken, {
			httpOnly: true,
			sameSite: "none",
			secure: true,
		})
		res.redirect('/campaigns')
		res.send({ id: tokens._id })
	} catch (error) {
		next(error)
	}
})

usersRouter.post("/refresh", async (req, res, next) => {
	console.log("cookies", req.cookies)
	const tokens = await refreshTokens(req.cookies.refreshToken)
	const { accessToken, refreshToken } = tokens
	res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax" })
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		path: "/users/refresh",
		sameSite: "lax",
	})
	res.send("new tokens" + tokens)
})

usersRouter.get("/:id", authorize, async (req, res, next) => {
	try {
		const profile = await UserModel.findById(req.params.id)
		res.send(profile)
	} catch (error) {
		next(error)
	}
})

usersRouter.post("/register", async (req, res, next) => {
	try {
		if (await UserModel.findOne({ email: req.body.email })) {
			console.log("duplicate", await UserModel.find({ email: req.body.email }))
		} else {
			const newUser = new UserModel(req.body)
			console.log("null? ->", newUser._id)
			const { _id } = await newUser.save()
			console.log(_id)
			res.status(201).send(_id)
		}
	} catch (error) {
		next(error)
	}
})

usersRouter.put("/me", authorize, async (req, res, next) => {
	try {
		const updates = Object.keys(req.body)
		updates.forEach((update) => (req.user[update] = req.body[update]))
		await req.user.save()
		res.send(req.user)
	} catch (error) {
		next(error)
	}
})

/**
 * to implement, constrain the followable ID's to only the existing ones
 */
usersRouter.post("/follow/:id", authorize, async (req, res, next) => {
	try {
		const updated = await UserModel.findByIdAndUpdate(
			req.user,
			{
				$addToSet: {
					follows: req.params.id,
				},
			},
			{ runValidators: true, new: true }
		)
		//await req.user.save()
		res.send(req.params.id)
	} catch (error) {
		next(error)
	}
})

usersRouter.post("/unfollow/:id", authorize, async (req, res, next) => {
	try {
		const updated = await UserModel.findByIdAndUpdate(
			req.user,
			{
				$pull: {
					follows: req.params.id,
				},
			},
			{ runValidators: true, new: true }
		)
		//await req.user.save()
		res.send(req.params.id)
	} catch (error) {
		next(error)
	}
})

usersRouter.delete("/me", authorize, async (req, res, next) => {
	try {
		await req.user.deleteOne(res.send("Deleted"))
	} catch (error) {
		next(error)
	}
})

usersRouter.post("/logout", authorize, async (req, res, next) => {
	try {
		req.user.refreshTokens = req.user.refreshTokens.filter(
			(t) => t.token !== req.body.refreshToken
		)
		await req.user.save()
		res.send()
	} catch (err) {
		next(err)
	}
})
//wtf
usersRouter.post("/logoutAll", authorize, async (req, res, next) => {
	try {
		req.user.refreshTokens = []
		await req.user.save()
		res.send()
	} catch (err) {
		next(err)
	}
})

usersRouter.post("/refreshToken", async (req, res, next) => {
	const oldRefreshToken = req.body.refreshToken
	if (!oldRefreshToken) {
		const err = new Error("Refresh token missing")
		err.httpStatusCode = 400
		next(err)
	} else {
		try {
			const newTokens = await refreshToken(oldRefreshToken)
			res.send(newTokens)
		} catch (error) {
			console.log(error)
			const err = new Error(error)
			err.httpStatusCode = 403
			next(err)
		}
	}
})

usersRouter.post(
	"/imageUpload/me",
	authorize,
	cloudMulter.single("image"),
	async (req, res, next) => {
		try {
			const imageUrl = req.file.path
			const post = { imageUrl }

			const newPost = await UserModel.findByIdAndUpdate(req.user._id, post, {
				runValidators: true,
				new: true,
			})
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

module.exports = usersRouter
