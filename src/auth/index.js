const jwt = require("jsonwebtoken")
const UserModel = require("../services/users/schema")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

//make a new token
const newToken = async (payload, expiration) =>
	new Promise((res, rej) =>
		jwt.sign(
			payload,
			process.env.JWT_SECRET,
			{
				expiresIn: expiration,
			},
			(err, token) => {
				if (err) rej(err)
				res(token)
			}
		)
	)

//returns the decoded token or trows an error
//const verifyToken = (token) => jwt.decode(token, process.env.JWT_SECRET)
const verifyToken = (token) => {
	const decoded = jwt.decode(token, process.env.JWT_SECRET)
	//if (decoded.exp < Date.now() / 1000) return false
	return decoded
}
const refreshTokens = async (oldRefreshToken) => {
	try {
		console.log("oldRefreshToken", oldRefreshToken)
		const decodeUser = verifyToken(oldRefreshToken)
		const user = await UserModel.findById(decodeUser._id).select(
			"+refreshTokens"
		)
		if (!user) throw new Error("access is forbidden 1")
		//console.log(user)
		//check that the database and if oldrefreshtoken and access token are not linked trow an error
		const check = user.refreshTokens.find(
			(pair) => pair.refreshToken === oldRefreshToken
		)
		console.log("check", check)
		if (!check) return new Error("access is forbidden 2")
		//remove used token pair from the database to deactivate them
		UserModel.findByIdAndUpdate(decodeUser._id, {
			$pull: { refreshTokens: { refreshToken: oldRefreshToken } },
		})
		const refreshToken = await newToken({ _id: user._id }, "1 week")
		const accessToken = await newToken({ _id: user._id }, "1 week") //this should expire in 1800s
		return { accessToken, refreshToken }
	} catch (error) {
		console.log(error)
	}
}

/**
 * Authenticates a user based on their credentials
 * @param {object} credentials
 * @return {object} contains the accessToken and RefreshToken
 */
const authenticate = async (credentials) => {
	console.log("authentication subroutine")
	const { email, password } = credentials
	try {
		const user = await UserModel.findOne({ email: email }).select("+password")
		if (user) {
			const isMatch = await bcrypt.compare(password, user.password)
			if (isMatch) {
				const accessToken = await newToken({ _id: user._id }, "1800 s")
				const refreshToken = await newToken({ _id: user._id }, "1 week")
				const user2 = await UserModel.findByIdAndUpdate(
					mongoose.Types.ObjectId(user._id),
					{
						$addToSet: {
							refreshTokens: {
								token: accessToken,
								refreshToken: refreshToken,
							},
						},
					},
					{ new: true }
				)
				return { accessToken, refreshToken }
			}
		}
	} catch (error) {
		console.log(error)
	}

	console.log("authentication error")
	return new Error("invalid credentials")
}

const authorize = async (req, res, next) => {
	try {
		const decodedToken = await verifyToken(req.cookies.accessToken)
		console.log("DECODED USER ", decodedToken)
		const user = await UserModel.findById(decodedToken._id) //do i Really want to store the tokens in the user since the user is also stored in the token?
		console.log("**********AUTHORIZE MIDDLEWARE**********")
		console.log(user)
		if (!user) {
			//if we get here it means that the token was valid but the user did not exist
			throw new Error("user not found in the database")
		}
		req.user = user
		next()
	} catch (error) {
		console.log(error)
		/*if, for a given access token, there is no valid refresh token in the database, 
		whe should give a code that can trigger a refresh*/

		const err = new Error("Please log in")
		err.httpStatusCode = 401
		next(err)
	}
}

module.exports = {
	newToken,
	verifyToken,
	refreshTokens,
	authenticate,
	authorize,
}
