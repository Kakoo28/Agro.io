const ws = new WebSocket('ws://localhost:3000');

const HTML_ROOMS = '<div id="rooms-container"></div>' +
    '<form id="create-room-form">' +
    '<input id="room-name" type="text" placeholder="Nom de la partie">' +
    '<label for="room-limit"><input type="range" min="4" max="25" value="4" id="room-limit"><span id="range-limit-value">4</span> MAX</label>' +
    '<label for="room-private">Privé : <input type="checkbox" id="room-private"></label>' +
    '<label for="room-password">🔐 <input type="password" id="room-password" placeholder="Mot de passe"></label>' +
    '<input type="submit" value="Créer la partie">' +
    '</form>';

const CONTAINER = document.getElementById('container');
let username;

function joinRoom(e) {
    send('join-room', e.target.id);
}

const send = (event, data = null) => {
    ws.send(JSON.stringify({event: event, data: data}));
}

ws.addEventListener('message', message => {
    const {data, event} = JSON.parse(message.data);

    switch (event) {
        case "send-rooms":
            if (data.goto_rooms) {
                CONTAINER.innerHTML = HTML_ROOMS;
                document.getElementById('room-private').addEventListener('change', () => {
                    document.querySelector('#create-room-form label[for="room-password"]').classList.toggle('active');
                });
                document.getElementById('room-limit').addEventListener('input', (e) => {
                    document.getElementById('range-limit-value').innerText = e.target.value;
                });
                document.getElementById('create-room-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    send('create-room', {
                        name: document.getElementById('room-name').value,
                        limit: document.getElementById('room-limit').value,
                        private: document.getElementById('room-private').checked,
                        password: document.getElementById('room-password').value,
                    });
                });
            }
            const ROOM_CONTAINER = document.getElementById('rooms-container');
            ROOM_CONTAINER.innerHTML = "";
            for (const i in data.ROOMS) {
                const room = data.ROOMS[i];
                ROOM_CONTAINER.innerHTML += `<div class="room">
                        <div>${room.name} 
                            <span class="author">Créateur : ${room.author.name}</span>
                            </div><div class="limit">${room.players.length}/${room.limit} ${room.private ? '🔐' : '🔓'}
                        </div>
                        <button id="${room.room_id}" class="join-btn">Join</button>
                    </div>`;
            }
            [...document.getElementsByClassName('join-btn')].forEach(btn => btn.addEventListener('click', joinRoom));
            break;

        case "join-room":
            CONTAINER.innerHTML = `<button id="leave-btn">QUITTER</button><div id="select-color-form">SELECT YOUR COLOR</div>`;
            document.getElementById('leave-btn').addEventListener('click', () => {
                send('leave-room');
            })
            break;
    }
});

// set-username-form
document.getElementById('set-username-form').addEventListener('submit', (e) => {
    e.preventDefault();
    username = document.querySelector('#set-username-form #username').value;
    send('set-username', username);
})