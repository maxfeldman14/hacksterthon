var socketio = require('socket.io');
 
// Listen on 8080
var io = socketio.listen(8080);
var playerCount = 0;

io.on('connection', function (socket) {
    // player 0 sent a message, broadcast it
    socket.on('0', function (data) {
        console.log('player 0');
        console.log(data);
        // send as msg from player 0
        io.sockets.emit('0', data);
        // TODO: keep a socket on a certain channel for perf reasons
        //socket.join('0');
        //io.to('1').emit('1', data);
    });

    // handle a message from player 1, broadcast to all
    socket.on('1', function (data) {
        console.log('player 1');
        console.log(data);
        // send as msg from player 1 
        io.sockets.emit('1', data);
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
