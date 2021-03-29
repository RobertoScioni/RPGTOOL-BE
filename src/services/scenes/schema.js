const { Schema, model } = require("mongoose")

const SceneSchema = new Schema(
	{
		name: String,
		dsc: String,
		imageUrl: String,
		campaign: { type: Schema.Types.ObjectId, ref: "Campaigns" },
		owner: { type: Schema.Types.ObjectId, ref: "users" },
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
