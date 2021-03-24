const { Schema, model } = require("mongoose")

const SceneSchema = new Schema(
	{
		name: String,
		dsc: String,
		imageUrl: String,
		owner: { type: Schema.Types.ObjectId, ref: "Profiles" },
		members: [],
		messages: [
			{
				user: { type: Schema.Types.ObjectId, ref: "users" },
				recipients: [{ type: Schema.Types.ObjectId, ref: "users" }],
				name: String,
				message: String,
				imageUrl: String,
			},
		],
	},
	{ timestamps: true }
)

module.exports = model("Scene", SceneSchema)
