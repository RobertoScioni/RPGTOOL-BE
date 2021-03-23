const { Schema, model } = require("mongoose")

const SceneSchema = new Schema({
	name: String,
	creator: { type: Schema.Types.ObjectId, ref: "Profiles" },
	members: [{ type: Schema.Types.ObjectId, ref: "users" }],
})

module.exports = model("Scene", SceneSchema)
