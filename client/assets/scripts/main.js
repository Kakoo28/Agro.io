const ws = new WebSocket('ws://localhost:3000');

const HTML_ROOMS = '<div><div id="rooms-container"></div>' +
    '<div id="colors-container">' + // [red, blue, green, purple, yellow, orange, random]
        '<div id="red" class="color"></div><div id="blue" class="color"></div><div id="green" class="color"></div><div id="purple" class="color"></div><div id="yellow" class="color"></div><div id="orange" class="color"></div><div id="random" class="color active">?</div>' +
    '</div></div>' +
    '<form id="create-room-form">' +
    '<input id="room-name" type="text" placeholder="Nom de la partie">' +
    '<label for="room-limit"><input type="range" min="4" max="25" value="4" id="room-limit"><span id="range-limit-value">4</span> MAX</label>' +
    '<label for="room-private">Privé : <input type="checkbox" id="room-private"></label>' +
    '<label for="room-password">🔐 <input type="password" id="room-password" placeholder="Mot de passe"></label>' +
    '<input type="submit" value="Créer la partie">' +
    '</form>';

const CONTAINER = document.getElementById('container');
let username;
let currentColor = 'random';

function closeAlert(e) {
    if (e.target.parentElement.id === 'alert') {
        e.target.parentElement.remove();
        send('request-rooms', true);
    }
}

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
            if (data.goto_rooms) { // GOTO ROOMS
                CONTAINER.innerHTML = HTML_ROOMS;
                setTimeout(() => {
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
                    // COLORS
                    const COLORS = [...document.getElementsByClassName('color')];
                    if (currentColor) {
                        COLORS.forEach(color => {
                            color.classList.remove('active');
                        });
                        document.getElementById(currentColor).classList.add('active');
                    } else currentColor = 'random';
                    COLORS.forEach(color => color.addEventListener('click', (e) => {
                        currentColor = e.target.id;
                        COLORS.forEach(color => {
                            color.classList.remove('active');
                        });
                        document.getElementById(currentColor).classList.add('active');
                        send('change-color', currentColor);
                    }));
                }, 50);
            }

            setTimeout(() => {
                // ADD ROOMS
                const ROOM_CONTAINER = document.getElementById('rooms-container');
                ROOM_CONTAINER.innerHTML = "";

                for (const i in data.ROOMS) {
                    const room = data.ROOMS[i];
                    ROOM_CONTAINER.innerHTML += `<div class="room">
                        <div>${room.name} 
                            <span class="author">Créateur : ${room.author.name}</span>
                            </div><div class="limit">${Object.keys(room.players).length}/${room.limit} ${room.private ? '🔐' : '🔓'}
                        </div>
                        <button id="${room.room_id}" class="join-btn">Rejoindre</button>
                    </div>`;
                }
                [...document.getElementsByClassName('join-btn')].forEach(btn => btn.addEventListener('click', joinRoom));
            }, 50);
            break;

        case "join-room":
            CONTAINER.innerHTML = `<button id="leave-btn">QUITTER</button><div id="select-color-form">SELECT YOUR COLOR</div>`;
            document.getElementById('leave-btn').addEventListener('click', () => {
                send('leave-room');
            });
            break;

        case "alert":
            CONTAINER.innerHTML += '<div id="alert"><button id="close-alert">X</button>' +
                '<h5>' + data + '</h5>' +
                '</div>';
            document.getElementById('close-alert').addEventListener('click', closeAlert);
            break;
        case "request-room-password":
            CONTAINER.innerHTML += '<div id="alert"><button id="close-alert">X</button>' +
                '<form id="room-password-form">' +
                '<input type="password" placeholder="Mot de passe">' +
                '<input type="submit" value="Envoyer">' +
                '</form>' +
                '</div>';
            document.getElementById('close-alert').addEventListener('click', closeAlert);
            document.getElementById('room-password-form').addEventListener('submit', (e) => {
                e.preventDefault();
                send('room-password', {
                    password: document.querySelector('#room-password-form input[type="password"]').value,
                    room: data
                });
                document.getElementById('alert').remove();
            });
            break;
    }
});

// set-username-form
document.getElementById('set-username-form').addEventListener('submit', (e) => {
    e.preventDefault();
    username = document.querySelector('#set-username-form #username').value;
    send('set-username', username);
});