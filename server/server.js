const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const crypto = require('crypto');

const port = 3000;
const motd = "Cryptoip, VOIP / Chat in realtime fully encrypted [ OPEN SOURCE ]";

app.get('/', function (req, res) {
  res.sendStatus(400);
});
http.listen(port);
var users = [];
var online = [];
var secureKey = null;
var mainKey = randomString(16);
io.sockets.on('connection', function (socket) {
  socket.on("connection", function (connectionInfos, secureKey) {
    var connectionInfosDecrypt = JSON.parse(decrypt(connectionInfos, secureKey));
    var checkDone = 2;
    users.forEach(function (client) {
      if (client.username == connectionInfosDecrypt.username) {
        if (client.keyHash == connectionInfosDecrypt.keyHash) {
          checkDone = 1;
        } else {
          console.log("Kicked " + socket.id);
          secureKey = randomString(16);
          io.to(socket.id).emit("kick", encrypt("(invalid key hash) - Use your own username, the username is already used", secureKey), secureKey);
          socket.disconnect();
          checkDone = 3;
        }
      } else if (client.keyHash == connectionInfosDecrypt.keyHash) {
        if (client.username == connectionInfosDecrypt.username) {
          checkDone = 1;
        } else {
          console.log("Kicked " + socket.id);
          secureKey = randomString(16);
          io.to(socket.id).emit("kick", encryp("(invalid username) - Use your own username, the username is already used", secureKey), secureKey);
          socket.disconnect();
          checkDone = 3;
        }
      }
    });
    if (checkDone == 1) {
      var alreadyConnected = false;
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          alreadyConnected = true;
        }
      });
      if (!alreadyConnected)
        online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey, clientKey: connectionInfosDecrypt.clientKey });
      secureKey = randomString(16);
      io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), secureKey);
      secureKey = randomString(16);
      io.to(socket.id).emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
    } else if (checkDone == 2) {
      users.push({ username: connectionInfosDecrypt.username, keyHash: connectionInfosDecrypt.keyHash });
      var alreadyConnected = false;
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          alreadyConnected = true;
        }
      });
      if (!alreadyConnected)
        online.push({ username: connectionInfosDecrypt.username, socketId: socket.id, publicKey: connectionInfosDecrypt.publicKey, clientKey: connectionInfosDecrypt.clientKey });
      secureKey = randomString(16);
      io.to(socket.id).emit("infos", encrypt(JSON.stringify({ motd: motd, mainKey: mainKey }), secureKey), secureKey);
      secureKey = randomString(16);
      io.to(socket.id).emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
    }
  });
  socket.on("message", function (messageData, secureKey) {
    var messageDataDecrypt = JSON.parse(decrypt(messageData, secureKey));
    if (messageDataDecrypt.receiver == "none") {
      var author = "";
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          author = user.username;
        }
      });
      socket.emit("message", encrypt(JSON.stringify({ message: messageDataDecrypt.message, author: author, signature: messageDataDecrypt.signature }), secureKey), secureKey);
    } else {
      var author = "";
      online.forEach(function (user) {
        if (user.socketId == socket.id) {
          author = user.username;
        }
      });
      io.to(messageDataDecrypt.receiver).emit("message", encrypt(JSON.stringify({ message: messageDataDecrypt.message, author: author, signature: messageDataDecrypt.signature }), secureKey), secureKey);
    }
  });
  socket.on("disconnect", function () {
    for (let i = 0; i < online.length; i++) {
      if (online[i].socketId == socket.id) {
        online.splice(i, 1);
      }
    }
    secureKey = randomString(16);
    socket.emit("clientList", encrypt(JSON.stringify(online), secureKey), secureKey);
  });
});
function randomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function encrypt(text, password) {
  var cipher = crypto.createCipheriv("aes-128-cbc", password.repeat(16).slice(0, 16), password.repeat(16).slice(0, 16))
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text, password) {
  var decipher = crypto.createDecipheriv("aes-128-cbc", password.repeat(16).slice(0, 16), password.repeat(16).slice(0, 16))
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}