const { Schema, model } = require("mongoose")

const MessageSchema = new Schema({
	text: String, //the content of a message
	sender: String, //the user who sent the message (will be visible only to dm and sender itself)
	alias: String, //the alias of the sender (in most cases character name)
	avatar: String, //the avatar of the sender (characterpic)
	room: String, //tyhe scene that is being played
})

module.exports = model("Message", MessageSchema)
