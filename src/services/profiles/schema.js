const { Schema, model } = require("mongoose")

const ProfileSchema = new Schema({
	name: String,
	imageUrl: String,
	user: { type: Schema.Types.ObjectId, ref: "Users" },
})

module.exports = model("Profile", ProfileSchema)
