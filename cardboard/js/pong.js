var mode;  // cardboard, oculus, or mono
var player; // "0" or "1"
var camera, scene, renderer;
var effect;
var element, container;
var paddle;
var ball;
var ballv;
var leapdata;
var score = 0;
var activeController = null;
var disableRendering = false;
var remoteLeapSocket;

var clock = new THREE.Clock();

var leapServer = 'ws://localhost:6437/v6.json';
var remoteLeapServer = 'http://10.90.0.196:8080';
//var multiplayerServer = 'http://10.90.0.196:8080';
var multiplayerServer = 'http://ponger.cloudapp.net:8080';
var oculusServer = 'ws://localhost:9000/';
var initialOculusDirection = null;

var arena = {
  top: 14,
  bottom: 5,
  left: -5,
  right: 5,
  front: -10,
  back: 15,
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer();
  element = renderer.domElement;
  container = document.getElementById('example');
  container.appendChild(element);

  mode = getParameterByName('mode');
  if (mode === 'oculus' || mode === 'oculus/') {
    mode = 'oculus';
  } else if (mode === 'mono' || mode === 'mono/') {
    mode = 'mono';
  } else {
    mode = 'cardboard';
  }

  if (mode === 'oculus') {
    effect = new THREE.OculusRiftEffect(renderer);
  } else if (mode === 'mono') {
    effect = renderer;
  } else {
    effect = new THREE.StereoEffect(renderer);
  }

  player = getParameterByName('player') || "0";

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(90, 1, 0.001, 700);
  camera.position.set(0, 10, -5);
  camera.up = new THREE.Vector3(0, 1, 0);
  camera.lookAt(new THREE.Vector3(0, 10, 100));
  scene.add(camera);

  window.addEventListener('keypress', keypress, false);
  window.addEventListener('keydown', keydown, false);


  var light = new THREE.HemisphereLight(0x777777, 0x000000, 0.6);
  scene.add(light);

  var texture = THREE.ImageUtils.loadTexture(
    'textures/patterns/checker.png'
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat = new THREE.Vector2(50, 50);
  texture.anisotropy = renderer.getMaxAnisotropy();

  var material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0xffffff,
    shininess: 20,
    shading: THREE.FlatShading,
    map: texture,
    side: THREE.DoubleSide
  });

  var geometry = new THREE.PlaneGeometry(1000, 1000);

  var mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  var arenaGeom = new THREE.BoxGeometry(
      arena.right - arena.left,
      arena.top - arena.bottom,
      0.1);
  var arenaMesh = new THREE.Mesh(arenaGeom, new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5
  }));
  arenaMesh.position.x = (arena.right + arena.left) / 2.0;
  arenaMesh.position.y = (arena.top + arena.bottom) / 2.0;
  arenaMesh.position.z = arena.back;
  scene.add(arenaMesh);

  var boxGeom = new THREE.BoxGeometry(3, 3, 0.2);
  var boxMesh = new THREE.Mesh(boxGeom, new THREE.MeshBasicMaterial( {
    color: 0x777777,
    transparent: true,
    opacity: 0.5,
  }));
  boxMesh.position.y = 10;
  boxMesh.position.z = 5;
  
  paddle = boxMesh;
  scene.add( boxMesh );

  // player 0 -> red
  // player 1 -> blue
  // but this is for other player
  // so if we are player 0, the other player is red
  if (player == '0') {
    paddle2 = new THREE.Mesh(boxGeom, new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.5,
    })); } else {
    paddle2 = new THREE.Mesh(boxGeom, new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
    }));
  }

  paddle2.position.y = 10;
  paddle2.position.z = 15;
  scene.add(paddle2);

  ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      }));
  ball.position.y = 10;
  ball.position.z = 14;
  scene.add(ball);
  ballv = {
    x: 1,
    y: 1,
    z: -5,
  };

  updateScore();

  window.addEventListener('resize', resize, false);
  setTimeout(resize, 1);

  initControl();
  if (mode === 'oculus') {
    initOculus();
  }
}

function keypress(e) {
  if (e.keyCode == 32) {
    console.log('toggle rendering');
    disableRendering = !disableRendering;
  }
}

function keydown(e){
  switch(e.keyCode) {
    case 37:
      paddle.position.x += 1;
      break;
    case 38:
      paddle.position.y += 1;
      break;
    case 39:
      paddle.position.x -= 1;
      break;
    case 40:
      paddle.position.y -= 1;
      break;
  }
  remoteLeapSocket.emit(player , JSON.stringify({
    type: 'paddle',
    x: paddle.position.x * -30.0,
    y: (paddle.position.y - 3) * 30
  }));
}

function resize() {
  var width = container.offsetWidth;
  var height = container.offsetHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  effect.setSize(width, height);
}

function update(dt) {
  resize();

  camera.updateProjectionMatrix();

  ball.position.x += ballv.x * dt;
  ball.position.y += ballv.y * dt;
  ball.position.z += ballv.z * dt;
  if (ball.position.x < -5 && ballv.x < 0 ||
      ball.position.x > 5 && ballv.x > 0) {
    ballv.x *= -1;
  }
  if (ball.position.y < 5 && ballv.y < 0 ||
      ball.position.y > 13 && ballv.y > 0) {
    ballv.y *= -1;
  }
  if(ball.position.z > 15 && ballv.z > 0) {
    ballv.z *= -1;
  }
  if (ball.position.z < 6 && ballv.z < 0) {
    if (ball.position.x > (paddle.position.x - 2.5) &&
      ball.position.x < (paddle.position.x + 2.5) &&
      ball.position.y > (paddle.position.y - 2.5) &&
      ball.position.y < (paddle.position.y + 2.5)) {
      ballv.x *= 1.05;
      ballv.y *= 1.05;
      ballv.z *= -1.05;
      score += 1;
      updateScore();
      sendBall();
    } else {
      ball.position.x = 0;
      ball.position.y = 10;
      ball.position.z = 15;
      ballv = {
        x: 1,
        y: 1,
        z: -5,
      };
      score = 0;
      updateScore();
      sendBall();
    }
  }

}

function sendBall() {
  remoteLeapSocket.emit(player , JSON.stringify({
    type: 'ball',
    position: {
      x: ball.position.x,
      y: ball.position.y,
      z: ball.position.z
    },
    velocity: {
      x: ballv.x,
      y: ballv.y,
      z: ballv.z
    }
  }));
}

function render(dt) {
  effect.render(scene, camera);
}

function animate(t) {
  if (disableRendering) {
    return;
  }
  requestAnimationFrame(animate);

  update(clock.getDelta());
  render(clock.getDelta());
}

function fullscreen() {
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.msRequestFullscreen) {
    container.msRequestFullscreen();
  } else if (container.mozRequestFullScreen) {
    container.mozRequestFullScreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  }
}

function initControl() {
  remoteLeapSocket = io(remoteLeapServer);
  initLeap();
  initRemoteLeap();

  initOtherPlayer();
}

// player 0 -> red
// player 1 -> blue
function activatePaddle(controlType) {
  if (player == '0') {
    paddle.material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.2,
    });
  } else {
    paddle.material = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.2,
    });
  }
  activeController = controlType;
}

function updateScore() {
  var scoreMesh = new THREE.Mesh(
      new THREE.TextGeometry('' + score, {
        size: 1,
        height: 0.1,
      }),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      }));
  scoreMesh.position.y = 15;
  scoreMesh.position.x = -5;
  scoreMesh.position.z = 15;
  scoreMesh.rotation.y = Math.PI;
  scoreMesh.name = "scoreMesh";
  var oldScore = scene.getObjectByName("scoreMesh");
  if (oldScore) {
    scene.remove(oldScore);
  }
  scene.add(scoreMesh);
}

function initLeap() {
  var ws = new WebSocket(leapServer);

  ws.onopen = function(event) {
    var enableMessage = JSON.stringify({enableGestures: true});
    ws.send(enableMessage); // Enable gestures
    ws.send(JSON.stringify({focused: true})); // claim focus

    console.log('connected to leap');
  }

  remoteLeapSocket.onconnection = function(event) {
    console.log('connected to server');
  }

  ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (!data.hands || data.hands.length == 0) {
      return;
    }
    if (!activeController) {
      activatePaddle("localLeap");
    }
    hand = data.hands[0];
    var x = hand.palmPosition[0];
    var y = hand.palmPosition[1];
    if (activeController == "localLeap") {
      updatePaddle(x, y);
    }
    remoteLeapSocket.emit(player , JSON.stringify({type: 'paddle', x: x, y: y}));
  }
}

function initRemoteLeap() {
  remoteLeapSocket.on(player, function(msg) {
    if(!activeController) {
      activatePaddle('remoteLeap');
    }
    if(activeController != 'remoteLeap') {
      remoteLeapSocket.removeAllListeners('paddlePosition');
    }
    console.log("updating paddle from remote");
    var data = JSON.parse(msg);
    if (data.type == 'paddle') {
      updatePaddle(data.x, data.y);
    }
  });
}

function initOtherPlayer() {
  console.log('other player: ' + (player == '1' ? '0' : '1'));
  remoteLeapSocket.on(player == '1' ? '0' : '1', function(msg) {
    var data = JSON.parse(msg);
    if (data.type == 'paddle') {
      console.log("updating other paddle");
      updatePaddle(-1 * data.x, data.y, true);
    } else if(data.type == 'ball') {
      console.log('update ball');
      x = -1 * data.position.x;
      y = data.position.y;
      z = -1 * data.position.z + 21;
      vx = -1 * data.velocity.x;
      vy = data.velocity.y;
      vz = -1 * data.velocity.z;
      console.log('Old position: ' + ball.position.x + ', ' + ball.position.y + ', ' + ball.position.z);
      console.log('New position: ' + x + ', ' + y + ', ' + z);
      console.log('Old velocity: ' + ballv.x + ', ' + ballv.y + ', ' + ballv.z);
      console.log('New velocity: ' + vx + ', ' + vy + ', ' + vz);
      ball.position.x = x;
      ball.position.y = y;
      ball.position.z = z;
      ballv.x = vx;
      ballv.y = vy;
      ballv.z = vz;
    }
  });
}

function updatePaddle(x, y, otherPlayer) {
  var paddleToUpdate = paddle;
  if (otherPlayer) {
    paddleToUpdate = paddle2;
  }
  paddleToUpdate.position.x = 0 - (x / 30.0);
  paddleToUpdate.position.y = 3 + (y / 30.0);
  //paddleToUpdate.position.z = 5 - (z / 30.0);
}

function initOculus() {
  var ws = new WebSocket(oculusServer);

  ws.onopen = function(event) {
    console.log('connected to oculus');
  }

  ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    //console.log(data);
    var normalized = {
      rotx: data.rotx / data.rotw,
      roty: data.roty / data.rotw,
      rotz: data.rotz / data.rotw,
    }
    if (initialOculusDirection === null) {
      initialOculusDirection = normalized;
    }
    var redirected = {
      rotx: (normalized.rotx - initialOculusDirection.rotx),
      roty: (normalized.roty - initialOculusDirection.roty),
      rotz: (normalized.rotz - initialOculusDirection.rotz),
    }
    updateCameraFromOculus(redirected);
  }
}

function updateCameraFromOculus(data) {
  var rotationQ = new THREE.Vector4(data.rotx, data.roty, data.rotz, 1);
  var up = new THREE.Vector4(0, 1, 0, 1);
  var rotationMatrix = new THREE.Matrix4().identity();
  rotationMatrix.makeRotationFromQuaternion(rotationQ);
  up.applyMatrix4(rotationMatrix);

  var initialLookAt = new THREE.Vector4(0, 10, 100, 1);
  rotationMatrix = new THREE.Matrix4().identity();
  rotationMatrix.makeRotationFromQuaternion(rotationQ);
  initialLookAt.applyMatrix4(rotationMatrix);

  //camera.up = new THREE.Vector3(0, 1, 0);
  camera.up = up;
  //camera.lookAt(new THREE.Vector3(data.rotx, data.roty, data.rotz));
  camera.lookAt(initialLookAt);
  camera.updateProjectionMatrix();
}
