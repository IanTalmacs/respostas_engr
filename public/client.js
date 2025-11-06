const socket = io()
let currentRoom = null
let myId = null
const nameInput = document.getElementById('nameInput')
const createBtn = document.getElementById('createBtn')
const joinBtn = document.getElementById('joinBtn')
const roomInput = document.getElementById('roomInput')
const roomCodeEl = document.getElementById('roomCode')
const playersList = document.getElementById('playersList')
const startBtn = document.getElementById('startBtn')
const lobby = document.getElementById('lobby')
const game = document.getElementById('game')
const promptCard = document.getElementById('promptCard')
const handEl = document.getElementById('hand')
const submissionsEl = document.getElementById('submissions')
const czarBanner = document.getElementById('czarBanner')
createBtn.addEventListener('click', () => {
  const name = nameInput.value.trim() || 'Jogador'
  socket.emit('createRoom', { name })
})
joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim() || 'Jogador'
  const room = (roomInput.value || '').toUpperCase()
  if (!room) return
  socket.emit('joinRoom', { room, name })
})
socket.on('roomCreated', ({ room }) => {
  currentRoom = room
  roomCodeEl.textContent = room
  lobby.classList.remove('hidden')
  game.classList.add('hidden')
})
socket.on('joinedRoom', ({ room }) => {
  currentRoom = room
  roomCodeEl.textContent = room
})
socket.on('roomUpdate', ({ room, players }) => {
  playersList.innerHTML = ''
  players.forEach(p => {
    const li = document.createElement('li')
    li.textContent = p.name
    const sp = document.createElement('span')
    sp.textContent = p.score || 0
    li.appendChild(sp)
    playersList.appendChild(li)
    if (p.id === socket.id) myId = p.id
  })
})
startBtn.addEventListener('click', () => {
  if (!currentRoom) return
  socket.emit('startGame', { room: currentRoom })
})
socket.on('newRound', ({ prompt, czar, players }) => {
  lobby.classList.add('hidden')
  game.classList.remove('hidden')
  promptCard.textContent = prompt || ''
  czarBanner.textContent = czar === socket.id ? 'Você é o czar' : 'Czar: ' + players.find(p => p.id === czar)?.name
  handEl.innerHTML = ''
  const me = players.find(p => p.id === socket.id)
  if (me && me.hand) renderHand(me.hand)
  submissionsEl.innerHTML = ''
})
function renderHand(hand){
  handEl.innerHTML = ''
  hand.forEach(c => {
    const d = document.createElement('div')
    d.className = 'card'
    d.textContent = c
    d.addEventListener('click', () => {
      if (!currentRoom) return
      socket.emit('playCard', { room: currentRoom, card: c })
    })
    handEl.appendChild(d)
  })
}
socket.on('revealSubmissions', subs => {
  submissionsEl.innerHTML = ''
  subs.forEach(s => {
    const d = document.createElement('div')
    d.className = 'card'
    d.textContent = s.card
    if (socket.id === s.id) d.style.outline = '2px solid var(--accent)'
    d.addEventListener('click', () => {
      socket.emit('chooseWinner', { room: currentRoom, winnerId: s.id })
    })
    submissionsEl.appendChild(d)
  })
})
socket.on('submittedUpdate', ({ submitted }) => {
  czarBanner.textContent = `Aguardando ${submitted} / ?`
})
socket.on('roundResult', ({ winnerId, player }) => {
  czarBanner.textContent = `${player.name} venceu`
  socket.emit('getState', { room: currentRoom })
})
socket.on('state', ({ players, prompt, started, czar }) => {
  const me = players.find(p => p.id === socket.id)
  if (me && me.hand) renderHand(me.hand)
  playersList.innerHTML = ''
  players.forEach(p => {
    const li = document.createElement('li')
    li.textContent = p.name
    const sp = document.createElement('span')
    sp.textContent = p.score || 0
    li.appendChild(sp)
    playersList.appendChild(li)
  })
})
socket.on('errorMsg', msg => alert(msg))