const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const fs = require('fs')
const path = require('path')
const app = express()
const server = http.createServer(app)
const io = new Server(server)
app.use(express.static(path.join(__dirname, 'public')))
const raw = fs.readFileSync(path.join(__dirname, 'public', 'questions.json'))
const sourceDeck = JSON.parse(raw)
const rooms = {}
function makeCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
function createRoom() {
  let code = makeCode()
  while (rooms[code]) code = makeCode()
  rooms[code] = {
    players: {},
    order: [],
    czarIndex: 0,
    promptDeck: Array.isArray(sourceDeck.prompts) ? [...sourceDeck.prompts] : [],
    answerDeck: Array.isArray(sourceDeck.answers) ? [...sourceDeck.answers] : [],
    currentPrompt: null,
    submissions: {},
    started: false
  }
  return code
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
}
function drawAnswers(room, count) {
  const deck = rooms[room].answerDeck
  const drawn = []
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) break
    drawn.push(deck.pop())
  }
  return drawn
}
io.on('connection', socket => {
  socket.on('createRoom', ({ name }) => {
    const code = createRoom()
    const r = rooms[code]
    r.players[socket.id] = { id: socket.id, name: name || 'Jogador', hand: drawAnswers(code, 7), score: 0 }
    r.order.push(socket.id)
    socket.join(code)
    io.to(code).emit('roomUpdate', { room: code, players: Object.values(r.players) })
    socket.emit('roomCreated', { room: code })
  })
  socket.on('joinRoom', ({ room, name }) => {
    const r = rooms[room]
    if (!r) {
      socket.emit('errorMsg', 'Sala não encontrada')
      return
    }
    r.players[socket.id] = { id: socket.id, name: name || 'Jogador', hand: drawAnswers(room, 7), score: 0 }
    r.order.push(socket.id)
    socket.join(room)
    io.to(room).emit('roomUpdate', { room: room, players: Object.values(r.players) })
    socket.emit('joinedRoom', { room: room })
  })
  socket.on('startGame', ({ room }) => {
    const r = rooms[room]
    if (!r) return
    r.started = true
    shuffle(r.promptDeck)
    shuffle(r.answerDeck)
    r.czarIndex = 0
    startRound(room)
  })
  function startRound(room) {
    const r = rooms[room]
    if (!r) return
    r.submissions = {}
    if (r.promptDeck.length === 0) r.promptDeck = [...sourceDeck.prompts]
    const p = r.promptDeck.pop()
    r.currentPrompt = p
    const czarId = r.order[r.czarIndex % r.order.length]
    io.to(room).emit('newRound', { prompt: p, czar: czarId, players: Object.values(r.players) })
  }
  socket.on('playCard', ({ room, card }) => {
    const r = rooms[room]
    if (!r) return
    r.submissions[socket.id] = { id: socket.id, card }
    const player = r.players[socket.id]
    if (player) {
      const idx = player.hand.indexOf(card)
      if (idx !== -1) player.hand.splice(idx, 1)
      const drawn = drawAnswers(room, 1)
      if (drawn.length) player.hand.push(drawn[0])
    }
    const needed = Object.keys(r.players).filter(id => id !== r.order[r.czarIndex % r.order.length]).length
    if (Object.keys(r.submissions).length >= needed) {
      const subs = Object.values(r.submissions).map(s => ({ id: s.id, card: s.card }))
      shuffle(subs)
      io.to(room).emit('revealSubmissions', subs)
    } else {
      io.to(room).emit('submittedUpdate', { submitted: Object.keys(r.submissions).length })
    }
  })
  socket.on('chooseWinner', ({ room, winnerId }) => {
    const r = rooms[room]
    if (!r) return
    if (!r.players[winnerId]) return
    r.players[winnerId].score += 1
    io.to(room).emit('roundResult', { winnerId, player: r.players[winnerId] })
    r.czarIndex = (r.czarIndex + 1) % r.order.length
    setTimeout(() => startRound(room), 2000)
  })
  socket.on('getState', ({ room }) => {
    const r = rooms[room]
    if (!r) {
      socket.emit('errorMsg', 'Sala não encontrada')
      return
    }
    socket.emit('state', { players: Object.values(r.players), prompt: r.currentPrompt, started: r.started, czar: r.order[r.czarIndex % r.order.length] })
  })
  socket.on('leaveRoom', ({ room }) => {
    leave(socket, room)
  })
  socket.on('disconnect', () => {
    for (const room of Object.keys(rooms)) {
      if (rooms[room].players[socket.id]) leave(socket, room)
    }
  })
  function leave(socket, room) {
    const r = rooms[room]
    if (!r) return
    delete r.players[socket.id]
    r.order = r.order.filter(id => id !== socket.id)
    io.to(room).emit('roomUpdate', { room: room, players: Object.values(r.players) })
    if (r.order.length === 0) delete rooms[room]
  }
})
const PORT = process.env.PORT || 3000
server.listen(PORT)