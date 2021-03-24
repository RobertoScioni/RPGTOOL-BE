const socketio = require("socket.io")
const MessageModel = require("./messageSchema")
const {
	addUserToRoom,
	getUsersInRoom,
	getUserBySocket,
	removeUserFromRoom,
} = require("./utils")
const { verifyToken } = require("../../auth")
const UserModel = require("../users/schema")
const cookieParser = require("socket.io-cookie-parser")
const { DiceRoll } = require("rpg-dice-roller")

const authorize = async (socket, next) => {
	console.log("********** SOCKET AUTHORIZE MIDDLEWARE**********")
	console.log("--------------------------------------------------------")
	console.log("cookies", socket.request.headers.cookie)
	console.log("only the access token", socket.request.cookies["accessToken"])
	console.log("--------------------------------------------------------")
	console.log("accessToken from socket", socket.request.auth)
	try {
		const decodedToken = await verifyToken(
			socket.request.cookies["accessToken"]
		)
		if (!decodedToken) {
			const error = new Error("expired token")
			error.httpStatusCode = "401"
			throw error
		}
		console.log("DECODED USER ", decodedToken)
		const user = await UserModel.findById(decodedToken._id)

		console.log(user)
		if (!user) {
			throw new Error("user not found in the database")
			error.httpStatusCode = "404"
		}
		socket.user = user
		next()
	} catch (error) {
		console.log(error)
		//const err = new Error("Please log in")
		//err.httpStatusCode = 401
		next(error)
	}
}

/**
 *
 * @param {string} text a string that may contain one or more dice expression
 * @return {string} the input with the dice expression's solved in place
 */
const diEngine = (text) => {
	let rolls
	let message = text
	let dieNotations = []
	console.log("message=", text)
	try {
		rolls = new DiceRoll(message)
		message = rolls.output
	} catch (error) {
		//are there expressions enclosed in square brakets?
		dieNotations = [...text.matchAll(/\[(.*?)\]/g)]
		//if no expression was detected try to detect "not dice notation [diceNotation[diceNotation[dice..."
		if (dieNotations.length === 0)
			dieNotations = [...text.matchAll(/\[(.[^[]*)/g)]
		//if no expression was detected try to detect "...]diceNotation]diceNotation]diceNotation] not dice notation"
		if (dieNotations.length === 0) dieNotations = [...text.matchAll(/(.*?)\]/g)]
		//console.log(dieNotations)
		dieNotations.forEach((dieNotation) => {
			try {
				rolls = new DiceRoll(dieNotation[1].trim())
				rolls.roll()
				message = message.replace(dieNotation[0], " " + rolls.output + " ")
			} catch (error) {
				console.log("got an error with this expression", dieNotation[1].trim())
			}
		})
	}
	console.log("die notation=", dieNotations)
	console.log("message=", text)
	return message
}

const createSocketServer = (server) => {
	const io = socketio(server)
	console.log("socket.io server started")
	io.use(cookieParser())
	io.use(authorize)

	io.on("connection", (socket) => {
		console.log(`New socket connection --> ${socket.id}`)
		console.log("socket-details", socket)
		socket.on("room", function (data) {
			socket.join(data.room_name)
		})
		socket.join("lobby")
		const messageToRoomMembers = {
			sender: "Admin",
			text: `welcome to the lobby`,
			room: `lobby`,
			createdAt: new Date(),
		}
		socket.broadcast.to("lobby").emit("message", messageToRoomMembers)
		socket.on("sendMessage", async ({ room, message }) => {
			const messageContent = {
				text: message,
				sender: "user", //user.username,
				room,
			}
			const parsed = diEngine(message)
			socket.emit("message", { sender: "demo", text: parsed, room })
			//console.log(message)
		})
	})

	/*socket.on("joinRoom", async (data) => {
			try {
				// add user to specified room (in mongo)
				const { username, room } = await addUserToRoom({
					socketId: socket.id,
					...data,
				})

				socket.join(room)

				const messageToRoomMembers = {
					sender: "Admin",
					text: `${username} has joined the room!`,
					createdAt: new Date(),
				}

				socket.broadcast.to(room).emit("message", messageToRoomMembers) // sending the message to all the users connected in the room

				// send rooms info (users list) to all users
				const roomMembers = await getUsersInRoom(room)

				io.to(room).emit("roomData", { room, users: roomMembers })
			} catch (error) {
				console.log(error)
			}
		}) // joining chat room

		socket.on("sendMessage", async ({ room, message }) => {
			// when a client sends a message

			// search in the room for that user (search by socket.id)
			const user = await getUserBySocket(room, socket.id)

			const messageContent = {
				text: message,
				sender: user.username,
				room,
			}
			// save message in db
			try {
				const newMessage = new MessageModel(messageContent)
			} catch (error) {
				console.log(error)
			}

			// send the message to all the people in that room
			io.to(room).emit("message", messageContent)
		})

		socket.on("leaveRoom", async ({ room }) => {
			// when a client leaves chat room

			try {
				// Remove socketid from room in db

				const username = await removeUserFromRoom(socket.id, room)

				const messageToRoomMembers = {
					sender: "Admin",
					text: `${username} has left`,
					createdAt: new Date(),
				}
				io.to(room).emit("message", messageToRoomMembers)

				// send rooms info (users list) to all users
				const roomMembers = await getUsersInRoom(room)
				io.to(room).emit("roomData", { room, users: roomMembers })
			} catch (error) {
				console.log(error)
			}
		})
	})*/
}

module.exports = createSocketServer
