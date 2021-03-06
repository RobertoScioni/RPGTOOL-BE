const express = require("express")
const http = require("http")
const cors = require("cors")
const { join } = require("path")
const listEndpoints = require("express-list-endpoints")
const mongoose = require("mongoose")
const passport = require("passport")
const cookieParser = require("cookie-parser")
//const oauth = require("./auth/oauth")
const createSocketServer = require("./services/chat")

const usersRouter = require("./services/users")
const campaignsRouter = require("./services/campaigns")
const charactersRouter = require("./services/characters")
const scenesRouter = require("./services/scenes")
const templatesRouter = require("./services/templates")

const {
	notFoundHandler,
	forbiddenHandler,
	badRequestHandler,
	genericErrorHandler,
} = require("./errorHandlers")

const server = express()
const httpServer = http.createServer(server)
createSocketServer(httpServer)

const whitelist = [
	"https://rpgtool-fe.vercel.app",
	"https://rpgtool-fe-robertoscioni.vercel.app",
	"https://rpgtool-fe-bsvlxbd0t-robertoscioni.vercel.app",
	"http://93.43.219.120",
	"http://127.0.0.1:3000",
	"http://localhost:3000",
]
const corsOptions = {
	origin: (origin, callback) => {
		if (whitelist.indexOf(origin) !== -1 || !origin) {
			callback(null, true)
		} else {
			callback(new Error("Not allowed by CORS"))
		}
	},
	credentials: true,
}

server.use(cors(corsOptions))
const port = process.env.PORT

const staticFolderPath = join(__dirname, "../public")
server.use(express.static(staticFolderPath))
server.use(express.json())
server.use(cookieParser())
server.use(passport.initialize())
server.use("/users", usersRouter)
server.use("/campaigns", campaignsRouter)
server.use("/characters", charactersRouter)
server.use("/scenes", scenesRouter)
server.use("/templates", templatesRouter)

// ERROR HANDLERS MIDDLEWARES

server.use(badRequestHandler)
server.use(forbiddenHandler)
server.use(notFoundHandler)
server.use(genericErrorHandler)

const endpoints = listEndpoints(server)

//console.log(listEndpoints(server))

mongoose
	.connect(process.env.MONGO_CONNECTION_STRING, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
	.then(
		httpServer.listen(port, () => {
			console.log("******************NEW INSTANCE******************")
			console.log("Running on port", port)
			/* endpoints.forEach((endpoint) => {
				console.log(endpoint.methods, " - ", endpoint.path)
			}) */
		})
	)
	.catch((err) => console.log(err))
