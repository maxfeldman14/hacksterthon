var socketio = require('socket.io');
 
// Listen on 8080
var io = socketio.listen(8080);
var playerCount = 0;

io.on('connection', function (socket) {
    // player 0 sent a message, route it to player 1
    socket.on('0', function (data) {
        console.log('player 0');
        console.log(data);
        // send on channel 1
        io.sockets.emit('1', data);
        // TODO: keep a socket on a certain channel for perf reasons
        //socket.join('0');
        //io.to('1').emit('1', data);
    });

    // handle a message from player 1
    socket.on('1', function (data) {
        console.log('player 1');
        console.log(data);
        // send on channel 0
        io.sockets.emit('0', data);
        // TODO: keep a socket on a certain channel for perf reasons
        //socket.join('1');
        //io.to('0').emit('0', data);
    });
});


    /*
    // a new client has connected. we don't know what player it is
    // assign it a player number and stop, then increment playerCount
    socket.emit('player', { number: playerCount });
    console.log('Assiging player number ' + playerCount.toString());
    playerCount++;
    */
