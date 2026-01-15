require('dotenv').config()

const http = require('http')
const app = require("./app")
const setupWebSocket = require("./webSocket")
const sessionParser = require("./session")

const server = http.createServer(app)

setupWebSocket(server, sessionParser)

server.listen(3000, () =>{
    console.log("Server running on http://localhost:3000")
})