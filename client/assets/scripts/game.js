let canvas;
let ctx;

const PLAYER_STATUS = {};
let ROOM_STATE = {};

ws.addEventListener('message', message => {
    const {event, data} = JSON.parse(message.data);
    switch (event) {
        case 'join-room':
            canvas = document.getElementById('canvas');
            ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth - 150;
            canvas.height = window.innerHeight - 150;
            canvas.addEventListener('mousemove', e => {
                PLAYER_STATUS.aim = {
                    x: e.clientX - PLAYER_STATUS.x,
                    y: e.clientY - PLAYER_STATUS.y
                }
            });
            init(data.uid, data.room)
            break;

        case 'request-status':
            send('send-status', PLAYER_STATUS);
            break;

        case 'receive-state':
            ROOM_STATE.players = data;
            break;
    }
});

function random(min, max) {
    return Math.floor(Math.random() *(max - min) + min);
}
function randomColor() {
    return `rgb(${random(40, 200)},${random(40, 200)},${random(40, 200)})`;
}

function init(uid, room) {
    ROOM_STATE = {
        room_id: room.id,
        name: room.name,
        players: room.players
    };
    PLAYER_STATUS.id = uid;
    PLAYER_STATUS.username = room.players[uid].username;
    PLAYER_STATUS.color = room.players[uid].color === 'random' ? randomColor() : room.players[uid].color;
    PLAYER_STATUS.r = 50;
    PLAYER_STATUS.x = random(0, canvas.width - PLAYER_STATUS.r);
    PLAYER_STATUS.y = random(0, canvas.height - PLAYER_STATUS.r);
    send('send-status', {room_id: ROOM_STATE.room_id, state: PLAYER_STATUS});
    arc(PLAYER_STATUS);
    update();
}

function arc(obj) {
    ctx.fillStyle = obj.color;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.r, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

}

function update() { // *loop
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const player in ROOM_STATE.players) {
        arc(ROOM_STATE.players[player]);
    }
    window.requestAnimationFrame(update);
}
