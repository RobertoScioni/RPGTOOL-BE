const { Schema, model } = require("mongoose")

const CampaignSchema = new Schema(
	{
		name: String,
		dsc: String,
		imageUrl: String,
		owner: { type: Schema.Types.ObjectId, ref: "users" },
		members: [
			{
				name: String,
				dsc: String,
				imageUrl: String,
				characters: [{ type: Schema.Types.ObjectId, ref: "Character" }],
			},
		],
		scenes: [{ type: Schema.Types.ObjectId, ref: "Scene" }],
		messages: { type: [], select: false },
	},
	{ timestamps: true }
)

module.exports = model("Campaigns", CampaignSchema)
