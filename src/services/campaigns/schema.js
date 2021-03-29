const { Schema, model } = require("mongoose")

const CampaignSchema = new Schema(
	{
		name: String,
		dsc: String,
		imageUrl: String,
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		members: [],
		scenes: [{ type: Schema.Types.ObjectId, ref: "Scene" }],
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

module.exports = model("Campaigns", CampaignSchema)
