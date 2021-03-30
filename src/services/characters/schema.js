const { Schema, model } = require("mongoose")

const CharacterSchema = new Schema({
	name: String,
	dsc: String,
	imageUrl: String,
	sheet: { type: {}, select: false },
	owner: { type: Schema.Types.ObjectId, ref: "users" },
})

module.exports = model("Character", CharacterSchema)
