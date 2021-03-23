const { Schema, model } = require("mongoose")

const CharacterSchema = new Schema({
	name: String,
	bio: String,
	imageUrl: String,
	owner: { type: Schema.Types.ObjectId, ref: "users" },
})

module.exports = model("Character", CharacterSchema)
