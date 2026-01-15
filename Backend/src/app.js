const express = require('express')
const sessionParser = require('./session')
const cors = require('./config/cors')
const routes = require('./routes')

const app = express()

app.use(cors)
app.use(express.json())
app.use(sessionParser)
app.use("/api",routes)

module.exports = app