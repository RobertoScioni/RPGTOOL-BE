const { Schema, model } = require("mongoose")

const EntitySchema = new Schema({
	name: String,
	imageUrl: String,
	owners: [{ type: Schema.Types.ObjectId, ref: "Profiles" }],
})

module.exports = model("Entity", EntitySchema)
