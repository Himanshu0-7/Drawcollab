const cors = require('cors')

module.exports = cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
    methods:['GET', 'POST'],
    allowedHeaders:['Content-Type'],
    
})