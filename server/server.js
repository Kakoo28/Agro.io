const http = require('http');
const express = require('express');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});
const {v4: uuid} = require('uuid');

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: '../client'});
});
app.use('/static', express.static('../client/assets/'));

const USERS = {};
const ROOMS = {};
const ROOMS_PASSWORD = {};
const GAME_INTERVALS = {};

function updateRooms(ws) {
    if (ws) {
        if (ws.currentRoom) {
            if (ROOMS[ws.currentRoom].author.id === ws.id) {
                for (const playerID in ROOMS[ws.currentRoom].players) {
                    if (ws.id !== playerID) {
                        USERS[playerID].isWaiting = true;
                        USERS[playerID].currentRoom = null;
                        send(USERS[playerID], 'send-rooms', {goto_rooms: true, ROOMS});
                    }
                }
                console.log(`[${ROOMS[ws.currentRoom].name}] # ROOM SUPPRIMER | RAISON: l\'hôte à quitter.`);
                clearInterval(GAME_INTERVALS[ws.currentRoom]);
                delete ROOMS[ws.currentRoom];
            } else {
                delete ROOMS[ws.currentRoom].players[ws.id];
            }
        }
    }

    for (const i in USERS) {
        if (USERS[i].isWaiting) {
            send(USERS[i], 'send-rooms', {goto_rooms: false, ROOMS});
        }
    }
}

function joinRoom(ws, data) {
    if (ws.id !== ROOMS[data].author.id) {
        ROOMS[data].players[ws.id] = { id: ws.id, username: ws.username, color: ws.color };
    }
    ws.currentRoom = ROOMS[data].room_id;
    ws.isWaiting = false;
    send(ws, 'join-room', {room: ROOMS[data], uid: ws.id});
    console.log(`[${ROOMS[data].name}] + ${ws.username}`);
    updateRooms();
}

function send(ws, event, data = null) {
    ws.send(JSON.stringify({event: event, data: data}));
}

function intervalUpdate(room_id) {
    for (const id in ROOMS[room_id].players) {
        send(USERS[id], 'request-status');
        send(USERS[id], 'receive-state', ROOMS[room_id].players);
    }
}

wss.on("connection", ws => {
    ws.color = 'random';
    ws.id = uuid();
    USERS[ws.id] = ws;
    console.log(' +', ws.id);
    ws.on("message", message => {
        try {
            const {data, event} = JSON.parse(message);

            switch (event) {
                case "set-username":
                    if (data !== '' && data !== undefined && data.length > 0 && data.length <= 20) {
                        ws.username = data;
                        ws.isWaiting = true;
                        send(ws, 'send-rooms', {goto_rooms: true, ROOMS});
                        console.log(`# ${ws.id} => ${ws.username}`);
                    }
                    break;

                case "create-room":
                    if (data.name !== '' && data.name !== undefined && data.name.length > 0 && ws.isWaiting) {
                        let newRoomID = uuid();
                        ROOMS[newRoomID] = {
                            name: data.name,
                            room_id: newRoomID,
                            limit: data.limit,
                            author: {name: ws.username, id: ws.id},
                            players: {},
                            private: data.private
                        }

                        ROOMS[newRoomID].players[ws.id] = {id: ws.id, username: ws.username, color: ws.color};
                        if (data.private) ROOMS_PASSWORD[newRoomID] = data.password;
                        joinRoom(ws, newRoomID);
                        console.log(`# ${ws.username} a crée une nouvelle room [${ROOMS[newRoomID].name}]`);
                        GAME_INTERVALS[newRoomID] = setInterval(() => intervalUpdate(ws.currentRoom), 200);
                        updateRooms();
                    }
                    break;

                case "change-color":
                    ws.color = data;
                    break;

                case "join-room":
                    if (Object.keys(ROOMS[data].players).length < ROOMS[data].limit) {
                        if (ROOMS[data].private) {
                            send(ws, 'request-room-password', data);
                            break;
                        }
                        joinRoom(ws, data);
                    } else {
                        send(ws, 'alert', "La partie est pleine.");
                    }
                    break;

                case "room-password":
                    if (ROOMS_PASSWORD[data.room] === data.password) {
                        joinRoom(ws, data.room);
                    } else {
                        send(ws, "alert", "Mot de passe incorrect!");
                    }
                    break;

                case "leave-room":
                    delete ROOMS[ws.currentRoom].players[ws.id];
                    console.log(`[${ROOMS[ws.currentRoom].name}] - ${ws.username}`);
                    ws.isWaiting = true;

                    if (ROOMS[ws.currentRoom].author.id === ws.id) updateRooms(ws);
                    ws.currentRoom = null;
                    send(ws, 'send-rooms', {goto_rooms: true, ROOMS});
                    updateRooms();
                    break;

                case "request-rooms":
                    send(ws, 'send-rooms', {ROOMS, goto_rooms: data});
                    break;

                case "send-status":
                    ROOMS[ws.currentRoom].players[ws.id] = data;
                    break;
            }
        } catch (error) {
            console.log('[ERROR] Something went wrong with the message => ', error);
        }
    });

    ws.on("close", () => {
        console.log(' -', ws.username ? ws.username : ws.id);
        delete USERS[ws.id];
        updateRooms(ws);
    });
});

server.listen(PORT, () => {
    console.log('Server is running on port:', PORT);
});