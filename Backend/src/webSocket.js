// const session = require('express-session')
const WebSocket = require('ws')
const {randomUUID} = require('crypto')

const url  = require('url')
const { type } = require('os')
const roomData = require('./shareMemory')
module.exports = function setupWebSocket(server) {
    const rooms = new Map()

    const wsServer = new WebSocket.Server({noServer: true})
    
    server.on('upgrade', (req, socket, head) =>{
         const { pathname, query } = url.parse(req.url, true)

  if (pathname !== '/ws' || !query.room) {
    socket.destroy()
    return
  }
            
            wsServer.handleUpgrade(req,socket,head, ws =>{
                ws.roomId=query.room
                console.log(ws.roomId)
               console.log(roomData.get())
                  if (!rooms.has(ws.roomId)) {
      rooms.set(ws.roomId, {
        clients: new Set(),
        encryptedData:roomData.get()
      })
    }

                wsServer.emit("connection", ws, req)
            })
    })
    const handleSceneUpdate=(ws, message)=>{
        broadCasteToRoom(ws.roomId, {
            type: 'SCENE_UPDATE', 
            payload: {
                elements: message.payload, 
                userId: ws.id
            }
        }, ws)
    }
    const handleMouseLocation=(ws, message)=>{
        broadCasteToRoom(ws.roomId, {
            type: 'MOUSE_LOCATION', 
            payload: {
                x: message.payload.x,
                y:message.payload.y, 
                userId: ws.id,
                userName: ws.userName
            }
        }, ws)
    }
    const handleIdleStatus=(ws, message)=>{
        broadCasteToRoom(ws.roomId, {
            type: 'IDLE_STATUS', 
            payload: {
                idle:message.payload.idle, 
                userId: ws.id
            }
        }, ws)
    }
    const broadCasteToRoom=(roomId,message,sender)=>{
        
        const room = rooms.get(roomId)
        if(room){
            room.clients.forEach((client)=>{
                if(client !== sender && client.readyState === WebSocket.OPEN ){
                    client.send(JSON.stringify(message))
                }
            })
        }
        
    }
    wsServer.on('connection', (ws, req)=>{
        /*___________________________________
        
            Retrieve UserName From Request              
            ____________________________________*/
            
        ws.id = randomUUID()
        console.log('Server Connected')
     if (ws.roomId && rooms.has(ws.roomId)) {
    const room = rooms.get(ws.roomId)

    room.clients.add(ws)

    // ✅ DEBUG LOGS (HERE)
    console.log("Room:", ws.roomId)
    console.log(
      "Clients in room:",
      room.clients.size
    )

    

        ws.send(JSON.stringify({
            type: "SCENE_UPDATE",
            payload: {
                encryptedData:roomData.get()
            }
        }))

    broadCasteToRoom(ws.roomId, {
      type: "USER_JOINED",
      payload: { userId: ws.id }
    }, ws)
  }
        ws.on("message", data =>{
            try{
                const message = JSON.parse(data)
                console.log(message.type)
                switch(message.type){
                    case "SCENE_UPDATE":
                        handleSceneUpdate(ws, message);
                        break;
                    case 'MOUSE_LOCATION':
                        handleMouseLocation(ws, message);
                        break;
                    case "USER_JOINED":
                        console.log('User-Joined')
                        break;
                    case "IDLE_STATUS":
                        handleIdleStatus(ws, message);
                        break;
                    default :
                        console.log("Unknown Message-Type", message.type);

                    }
           }catch(error){
            console.error("Error Parsing Message", error)
           }
        })
        ws.on('close',() =>{

            console.log("Client Disconnect", ws.id);
            if(ws.roomId && rooms.has(ws.roomId)){
                rooms.get(ws.roomId).clients.delete(ws)
                broadCasteToRoom(ws.roomId, {
                    type: "USER_LEFT",
                    payload: {
                        userId: ws.id,

                    }}
                ,ws)

                if(rooms.get(ws.roomId).clients.size === 0){
                     rooms.delete(ws.roomId)
                     console.log("Room Deleted", ws.roomId);
                     
                }
            }
            
        })
    })
}
