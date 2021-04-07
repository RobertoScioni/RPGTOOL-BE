const socketio = require("socket.io")
const CampaignModel = require("../campaigns/schema")
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
	/* console.log("********** SOCKET AUTHORIZE MIDDLEWARE**********")
	console.log("--------------------------------------------------------")
	console.log("cookies", socket.request.headers.cookie)
	console.log("only the access token", socket.request.cookies["accessToken"])
	console.log("--------------------------------------------------------")
	console.log("accessToken from socket", socket.request.auth) */
	try {
		const decodedToken = await verifyToken(
			socket.request.cookies["accessToken"]
		)
		if (!decodedToken) {
			const error = new Error("expired token")
			error.httpStatusCode = "401"
			throw error
		}
		//console.log("DECODED USER ", decodedToken)
		const user = await UserModel.findById(decodedToken._id)

		// console.log(user)
		if (!user) {
			throw new Error("user not found in the database")
			error.httpStatusCode = "404"
		}
		socket.user = user
		next()
	} catch (error) {
		/* console.log("error in chat. js authorize middleware")
		console.log(error) */
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
	let message = []
	let splitted = text.split(/(\[.*?\])/g)
	let rollMap = {}
	console.log("message=", text)
	try {
		rolls = new DiceRoll(text)
		console.log("####################", splitted)
		splitted[0] = rolls.output
		rollMap[rolls.output] = rolls.total
		return { splitted, rollMap }
	} catch (error) {
		//are there expressions enclosed in square brakets?
		splitted = text.split(/\[(.*?)\]/g)
		//if no expression was detected try to detect "not dice notation [diceNotation[diceNotation[dice..."
		if (splitted.length === 1) splitted = text.split(/\[(.[^[]*)/g)
		//if no expression was detected try to detect "...]diceNotation]diceNotation]diceNotation] not dice notation"
		if (splitted.length === 1) splitted = text.split(/(.*?)\]/g)
		splitted.forEach((dieNotation, index) => {
			try {
				rolls = new DiceRoll(dieNotation)
				rolls.roll()
				rollMap[rolls.output] = rolls.total
				splitted[index] = rolls.output
			} catch (error) {
				/*console.log(
					"got an error with this expression",
					dieNotation[1].trim(),
					error
				)*/
				console.log(dieNotation, " was not an expression ", error)
			}
		})
		console.log("inside die engine after the loop message value", splitted)
		return { splitted, rollMap }
	}
}

const createSocketServer = (server) => {
	const io = socketio(server)
	console.log("socket.io server started")
	io.use(cookieParser())
	io.use(authorize)
	let room = ""
	io.on("connection", (socket) => {
		console.log(`New socket connection --> ${socket.id}`)
		socket.db_id = socket.handshake.query.db_id
		//console.log("socket-details", socket)
		socket.on("room", function (room) {
			//room = data
			console.log("room_name", room)
			socket.join(room._id)
		})
		//socket.join("lobby")
		let messageToRoomMembers = {
			sender: "Admin",
			text: `welcome to the lobby`,
			room: `lobby`,
			createdAt: new Date(),
		}
		socket.broadcast.to("lobby").emit("message", messageToRoomMembers)
		messageToRoomMembers = {
			sender: "Admin",
			text: `welcome to your scene`,
			room: `scene`,
			createdAt: new Date(),
		}
		socket.broadcast.to(room._id).emit("message", messageToRoomMembers)
		socket.on(
			"sendMessage",
			async ({ room, user, message, toPlayers, toCharacters, as }) => {
				console.log("a user is sending a message")
				//console.log(room, user.name, message, toPlayers, toCharacters, as)
				let messageContent
				const parsed = diEngine(message)
				console.log("PARSED", parsed)

				if (toPlayers.length === 0) {
					console.log("ROOM: ", room)
					messageContent = {
						sender: { _id: user._id, name: user.name },
						splitted: parsed.splitted,
						rollMap: parsed.rollMap,
						as,
						toCharacters,
					}
					io.in(room).emit("message", messageContent)
				} else {
					console.log(
						"---------------------------------------------------------------------------------------"
					)
					console.log("should be a pm to", toPlayers)
					messageContent = {
						sender: { _id: user._id, name: user.name },
						splitted: parsed.splitted,
						tooltips: parsed.tooltips,
						results: parsed.results,
						rollMap: parsed.rollMap,
						as,
						toCharacters,
						toPlayers,
					}
					for (client in io.sockets.clients(room._id).sockets) {
						if (
							toPlayers.some(
								(player) =>
									io.sockets.clients(room._id).sockets[client].user.id ===
										player._id ||
									io.sockets.clients(room._id).sockets[client].user.id ===
										sender._id
							)
						)
							io.to(client).emit("message", messageContent)
					}
					//remember to add self sending for pm's as they stand now you can send them but you will not see them

					//save message content in the db
				}
				console.log("##############")
				console.log("room id", room, "message", messageContent)

				let dbres = await CampaignModel.findByIdAndUpdate(room, {
					$push: { messages: messageContent },
				})
				console.log("database response", dbres)
			}
		)
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
