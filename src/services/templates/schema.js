const { Schema, model } = require("mongoose")

const TemplateSchema = new Schema({
	name: String,
	dsc: String,
	imageUrl: String,
	sheet: { type: {} },
	owner: { type: Schema.Types.ObjectId, ref: "users" },
})

module.exports = model("Template", TemplateSchema)
