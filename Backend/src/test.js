const express = require("express")
const webSocket = require("ws")
const { randomUUID } = require("crypto")
const url = require("url");
const cors = require("cors");

const app = express()
const port = 3000
const myServer = app.listen(port)

// Store rooms with their scenes and users
const rooms = new Map();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: "*",
    credentials: false
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Save encrypted scene to server
app.post("/api/scenes", (req, res) => {
    const encryptedBlob = req.body; // IV + encrypted scene data
    const sceneId = randomUUID();
    
    // Store encrypted scene
    if (!rooms.has(sceneId)) {
        rooms.set(sceneId, {
            encryptedBlob: encryptedBlob,
            createdAt: Date.now(),
            clients: new Set()
        });
    }
    
    console.log("Scene saved:", sceneId, "Size:", encryptedBlob.length);
    
    res.json({ 
        ok: true,
        id: sceneId
    });
});

// Load encrypted scene from server
app.get("/api/scenes/:sceneId", (req, res) => {
    const sceneId = req.params.sceneId;
    const room = rooms.get(sceneId);
    
    if (room && room.encryptedBlob) {
        res.json({
            ok: true,
            encryptedBlob: Array.from(room.encryptedBlob)
        });
    } else {
        res.status(404).json({ ok: false, error: "Scene not found" });
    }
});

const wsServer = new webSocket.Server({
    noServer: true
});

wsServer.on('connection', function(ws) {
    console.log("Client connected");
    ws.id = randomUUID();
    ws.userName = "Anonymous";
    
    // Add client to room
    if (ws.roomId) {
        if (!rooms.has(ws.roomId)) {
            rooms.set(ws.roomId, {
                clients: new Set(),
                elements: []
            });
        }
        rooms.get(ws.roomId).clients.add(ws);
        
        // Notify others about new user
        broadcastToRoom(ws.roomId, {
            type: "USER_JOINED",
            payload: {
                userId: ws.id,
                userName: ws.userName
            }
        }, ws);
    }
    
    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case "SCENE_UPDATE":
                    handleSceneUpdate(ws, message);
                    break;
                    
                case "MOUSE_LOCATION":
                    handleMouseLocation(ws, message);
                    break;
                    
                case "IDLE_STATUS":
                    handleIdleStatus(ws, message);
                    break;
                    
                default:
                    console.log("Unknown message type:", message.type);
            }
        } catch(e) {
            console.log("Error parsing message:", e);
        }
    });
    
    ws.on('close', () => {
        console.log("Client disconnected:", ws.id);
        
        if (ws.roomId && rooms.has(ws.roomId)) {
            rooms.get(ws.roomId).clients.delete(ws);
            
            // Notify others about user leaving
            broadcastToRoom(ws.roomId, {
                type: "USER_LEFT",
                payload: {
                    userId: ws.id
                }
            }, ws);
            
            // Clean up empty rooms
            if (rooms.get(ws.roomId).clients.size === 0) {
                rooms.delete(ws.roomId);
                console.log("Room deleted:", ws.roomId);
            }
        }
    });
});

function handleSceneUpdate(ws, message) {
    // Broadcast element updates to all clients in the room
    broadcastToRoom(ws.roomId, {
        type: "SCENE_UPDATE",
        payload: {
            elements: message.payload.elements,
            userId: ws.id
        }
    }, ws);
}

function handleMouseLocation(ws, message) {
    // Broadcast cursor position to all clients in the room
    broadcastToRoom(ws.roomId, {
        type: "MOUSE_LOCATION",
        payload: {
            x: message.payload.x,
            y: message.payload.y,
            userId: ws.id,
            userName: ws.userName
        }
    }, ws);
}

function handleIdleStatus(ws, message) {
    broadcastToRoom(ws.roomId, {
        type: "IDLE_STATUS",
        payload: {
            userId: ws.id,
            idle: message.payload.idle
        }
    }, ws);
}

function broadcastToRoom(roomId, message, sender) {
    const room = rooms.get(roomId);
    
    if (room) {
        room.clients.forEach(client => {
            if (client !== sender && client.readyState === webSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

myServer.on("upgrade", async function upgrade(req, socket, head) {
    const { pathname, query } = url.parse(req.url, true);
    wsServer.handleUpgrade(req, socket, head, (ws) => {
        console.log("UPGRADE REQUEST:", req.url);
        ws.roomId = query.room;
        if (query.name) {
            ws.userName = decodeURIComponent(query.name);
        }
        wsServer.emit('connection', ws, req);
    });
});

app.get("/", (req, res) => {
    res.json({ status: "ok" });
});

console.log(`Server running on port ${port}`);