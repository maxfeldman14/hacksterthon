var readline = require('readline'),
socketio = require('socket.io-client');
 
// cmd line arg of the host
var socket = socketio.connect(process.argv[2]);

// cmd line arg of which player we are
var playerNum = process.argv[3];
var rl = readline.createInterface(process.stdin, process.stdout);

socket.on(playerNum, function (data) {
      console.log('other player sent an update');
      console.log(data.update);
});

rl.on('line', function (line) {
    socket.emit(playerNum, { update: line });
    rl.prompt(true);
});

/*
// listen for an assignment of player number
socket.on('player', function (data) {
    playerNum = data.number;
    console.log("assigned " + playerNum.toString());
});
*/
