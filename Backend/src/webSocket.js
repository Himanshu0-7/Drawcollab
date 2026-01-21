// const session = require('express-session')
const WebSocket = require("ws");
const { randomUUID } = require("crypto");

const url = require("url");
const roomFrames = require("./roomFrames");
const { Buffer } = require("buffer");
module.exports = function setupWebSocket(server) {
  const rooms = new Map();

  const wsServer = new WebSocket.Server({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname, query } = url.parse(req.url, true);

    if (pathname !== "/ws" || !query.room) {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(req, socket, head, (ws) => {
      ws.roomId = query.room;
      // console.log(roomData.get());
      if (!rooms.has(ws.roomId)) {
        rooms.set(ws.roomId, {
          clients: new Set(),
          encryptedFrame: roomFrames.get(ws.roomId) || null,
        });
      }

      wsServer.emit("connection", ws, req);
    });
  });

  const broadCasteToRoom = (roomId, frame, sender) => {
    const room = rooms.get(roomId);
    if (room) {
      room.clients.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
          client.send(frame);
        }
      });
    }
  };
  function buildServerFrame(type, payload) {
    const headerBytes = Buffer.from(JSON.stringify({ type }));
    const payloadBytes = Buffer.from(JSON.stringify(payload));

    const buffer = Buffer.alloc(4 + headerBytes.length + payloadBytes.length);

    buffer.writeUInt32BE(headerBytes.length, 0);
    headerBytes.copy(buffer, 4);
    payloadBytes.copy(buffer, 4 + headerBytes.length);

    return buffer;
  }
  /*________________________________________

          Establish Ws Socket Connection 
  _______________________________________*/

  wsServer.on("connection", (ws, req) => {
    /*___________________________________
        
            Retrieve UserName From Request              
            ____________________________________*/
    console.log("roomId on connect:", ws.roomId);

    ws.id = randomUUID();
    console.log("Server Connected");
    if (ws.roomId && rooms.has(ws.roomId)) {
      const room = rooms.get(ws.roomId);

      room.clients.add(ws);
      console.log("Room:", ws.roomId);
      console.log("Clients in room:", room.clients.size);
      if (room.encryptedFrame) {
        ws.send(room.encryptedFrame);
      }
    }

    ws.on("message", (data) => {
      try {
        broadCasteToRoom(ws.roomId, data, ws);
      } catch (error) {
        console.error("Error Parsing Message", error);
      }
    });
    ws.on("close", () => {
      console.log("Client Disconnect", ws.id);
      if (ws.roomId && rooms.has(ws.roomId)) {
        const room = rooms.get(ws.roomId);
        room.clients.delete(ws);
        if (room.clients.size > 0) {
          const frame = buildServerFrame("USER_LEFT", { userId: ws.id });
          broadCasteToRoom(ws.roomId, frame, ws);
        } else {
          // 3️⃣ Cleanup empty room
          rooms.delete(ws.roomId);
          console.log("Room Deleted", ws.roomId);
        }
      }
    });
  });
};
