/**
 * シグナルサーバー + Webサーバー
 */
// Express
const express = require('express')
const app = express()

const PASS = "abc"

// publicディレクトリを公開
app.use(express.static(__dirname + '/public'))

const http = require('http')
const server = http.createServer(app)

// WebSocketサーバーにはsocket.ioを採用
const io = require('socket.io')(server)

var store = {}


// 接続要求
io.on('connection', socket => {
  console.log('io', 'connect')
  console.log('io', 'socket: ', socket.id)

  // room join
  socket.on('join', ({roomId}) => {
    console.log(socket.id, " : join :", roomId)
    store[socket.id] = roomId
    socket.join(roomId)
  })


  // receiveからのリクエスト要求をsendへ渡す
  socket.on('r2s_request', () => {
    console.log(socket.id, " : r2s_request")
    socket.to(store[socket.id]).emit('r2s_request', { cid: socket.id })
  })

  // sendからのofferをreceiveへ渡す
  socket.on('s2r_offer', ({ offer }) => {
    console.log(socket.id, " : s2r_offer")
    socket.to(store[socket.id]).emit('s2r_offer', { offer })
    // sendの接続切断時、receiveへ通知
    socket.on('disconnect', () => socket.broadcast.emit('s2r_close'))
  })

  // receiveからのanswerをsendへ渡す
  socket.on('r2s_answer', ({ answer }) => {
    console.log(socket.id, " : r2s_answer")
    socket.to(store[socket.id]).emit('r2s_answer', { cid: socket.id, answer })
  })


  // sendからのcandidateをreceiveへ渡す
  socket.on('s2r_candidate', ({ candidate }) => {
    console.log(socket.id, " : s2r_candidate")
    socket.to(store[socket.id]).emit('s2r_candidate', { cid: socket.id, candidate })
  })

  // receiveからのcandidateをsendへ渡す
  socket.on('r2s_candidate', ({ candidate }) => {
    console.log(socket.id, " : r2s_candidate")
    socket.to(store[socket.id]).emit('r2s_candidate', { cid: socket.id, candidate })
  })
})

server.listen(55555)
