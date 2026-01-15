// const session = require('express-session')
const WebSocket = require('ws')
const {randomUUID} = require('crypto')

const url  = require('url')

module.exports = function setupWebSocket(server, sessionParser) {
    const wsServer = new WebSocket.Server({noServer: true})
    
    server.on('upgrade', (req, socket, head) =>{
        const query =  url.parse(req.url, true)
        sessionParser(req, {},() =>{
            
            wsServer.handleUpgrade(req,socket,head, ws =>{
                ws.roomId=query.query.roomId
                wsServer.emit("connection", ws, req)
            })
        })
    })
    const users = new Map()
    wsServer.on('connection', (ws, req)=>{
        const query =  url.parse(req.url, true)
        const userName = randomUUID()
        console.log('Connection Established')
            users.set(userName, ws,query)
        ws.on("message", msg =>{
            const data = JSON.parse(msg.toString())
            wsServer.clients.forEach(client =>{
                if(client.readyState === WebSocket.OPEN && client.roomId === ws.roomId){
                    client.send(JSON.stringify({
                        x:data.x,
                        y:data.y,
                        id:userName
                    }))
                }
            })
        })
        ws.on('close',() =>{
            users.delete(userName)
        })
    })
}
