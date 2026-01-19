const express = require('express')
const cors = require('./config/cors')
const routes = require('./routes')

const app = express()

app.use(cors)
app.use(express.json())
app.use(express.raw({type: ()=>true, limit: '50mb'}))
app.use("/api",routes)

module.exports = app