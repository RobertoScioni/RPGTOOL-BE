const { Schema, model } = require("mongoose")
const bcrypt = require("bcryptjs")

const UserSchema = new Schema(
	{
		googleId: String,
		password: {
			type: String,
			select: false,
		},
		email: {
			type: String,
			required: true,
		},
		userName: String,
		profilePicUrl: String,
		refreshTokens: {
			type: [
				{
					token: {
						type: String,
					},
					refreshToken: {
						type: String,
					},
				},
			],
			select: false,
		},
	},
	{ timestamps: true }
)

UserSchema.statics.findByCredentials = async function (email, plainPW) {
	const user = await this.findOne({ email }).select("+password")
	console.log(user)
	if (user) {
		const isMatch = await bcrypt.compare(plainPW, user.password)
		if (isMatch) return user
		else return null
	} else {
		return null
	}
}
UserSchema.pre("save", async function (next) {
	const user = this
	const plainPW = user.password

	if (user.isModified("password")) {
		user.password = await bcrypt.hash(plainPW, 10)
	}
	next()
})

UserSchema.static("findPopulated", async (id) => {
	const User = await UserModel.findById(id)
	return User
})

UserSchema.methods.toJSON = function () {
	const user = this
	const userObject = user.toObject()

	delete userObject.password
	delete userObject.__v

	return userObject
}

module.exports = model("user", UserSchema)
