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

function updateRooms(ws) {
    if (ws) {
        if (ws.currentRoom) {
            if (ROOMS[ws.currentRoom].author.id === ws.id) {
                let remainingUsers = ROOMS[ws.currentRoom].players.filter(id => id !== ws.id);
                console.log('# La room', ROOMS[ws.currentRoom].name, 'a était supprimée, R: deconnection de l\'hôte.');
                delete ROOMS[ws.currentRoom];
                remainingUsers.forEach(user => {
                    USERS[user].waiting = true;
                    USERS[user].currentRoom = null;
                    send(USERS[user], 'send-rooms', {goto_rooms: true, ROOMS});
                });
            } else {
                ROOMS[ws.currentRoom].players.splice(ROOMS[ws.currentRoom].players.indexOf(ws.id), 1);
            }
        }
    }

    for (const i in USERS) {
        if (USERS[i].waiting) {
            send(USERS[i], 'send-rooms', {goto_rooms: false, ROOMS});
        }
    }
}

function joinRoom(ws, data) {
    ROOMS[data].players.push(ws.id);
    ws.currentRoom = ROOMS[data].room_id;
    ws.waiting = false;
    send(ws, 'join-room', ROOMS[data]);
    console.log(`# ${ws.username} a rejoint une room (${ROOMS[data].name})`);
    updateRooms();
}

function send(ws, event, data = null) {
    ws.send(JSON.stringify({event: event, data: data}));
}

wss.on("connection", ws => {
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
                        ws.waiting = true;
                        send(ws, 'send-rooms', {goto_rooms: true, ROOMS});
                        console.log(`# ${ws.id} => ${ws.username}`);
                    }
                    break;

                case "create-room":
                    if (data.name !== '' && data.name !== undefined && data.name.length > 0 && ws.waiting) {
                        let newRoomID = uuid();
                        ROOMS[newRoomID] = {
                            name: data.name,
                            room_id: newRoomID,
                            limit: data.limit,
                            author: {name: ws.username, id: ws.id},
                            players: [ws.id,],
                            private: data.private
                        }
                        if (data.private) ROOMS_PASSWORD[newRoomID] = data.password;
                        ws.waiting = false;
                        ws.currentRoom = newRoomID;
                        updateRooms();
                        send(ws, 'join-room', ROOMS[ws.currentRoom]);
                        console.log(`# ${ws.username} (${ws.id}) à crée une nouvelle room (${ROOMS[newRoomID].name})`);
                    }
                    break;

                case "join-room":
                    if (ROOMS[data].players.length < ROOMS[data].limit) {
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
                    ROOMS[ws.currentRoom].players.splice(ROOMS[ws.currentRoom].players.indexOf(ws.id), 1);
                    console.log(`# ${ws.username} a quitter la room ${ROOMS[ws.currentRoom].name}`);
                    ws.waiting = true;

                    if (ROOMS[ws.currentRoom].author.id === ws.id) updateRooms(ws);
                    ws.currentRoom = null;
                    send(ws, 'send-rooms', {goto_rooms: true, ROOMS});
                    updateRooms();
                    break;

                case "request-rooms":
                    send(ws, 'send-rooms', {ROOMS, goto_rooms: false});
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