const socket=io()
let playerId=null
let player=null
let state={}
const nameInput=document.getElementById('nameInput')
const confirmName=document.getElementById('confirmName')
const playersList=document.querySelector('.playersList')
const pwInput=document.getElementById('pwInput')
const startGame=document.getElementById('startGame')
const screen1=document.getElementById('screen1')
const screen2=document.getElementById('screen2')
const screen3=document.getElementById('screen3')
const handDiv=document.querySelector('.hand')
const scoresDiv=document.querySelector('.scores')
const judgeInfo=document.querySelector('.judgeInfo')
const startRoundBtn=document.getElementById('startRoundBtn')
const confirmChoice=document.getElementById('confirmChoice')
const blackCardDiv=document.querySelector('.blackCard')
const choicesDiv=document.querySelector('.choices')
function saveId(id){localStorage.setItem('playerId',id)}
function loadId(){return localStorage.getItem('playerId')}
function renderPlayers(list){playersList.innerHTML=''
  for(const p of list){const el=document.createElement('div');el.className='playerItem';el.innerHTML=`<div>${p.name}</div><div>${p.score||0}</div>`;playersList.appendChild(el)} }
function renderHand(h){handDiv.innerHTML=''
  for(const c of h){const b=document.createElement('div');b.className='cardWhite';b.textContent=c;b.onclick=()=>{if(state.started&&state.judgeId!==playerId&&!state.roundActive){socket.emit('submitCard',{playerId,card:c})}};handDiv.appendChild(b)} }
function renderScores(list){scoresDiv.innerHTML=''
  for(const p of list){const s=document.createElement('div');s.className='scoreItem';s.textContent=`${p.name}: ${p.score||0}`;scoresDiv.appendChild(s)} }
confirmName.onclick=()=>{
  const name=nameInput.value.trim()||''
  const stored=loadId()
  socket.emit('register',{playerId:stored,name})
}
startGame.onclick=()=>{
  const pw=pwInput.value
  socket.emit('startGame',{password:pw})
}
startRoundBtn.onclick=()=>{
  socket.emit('startRound',{playerId})}
confirmChoice.onclick=()=>{
  const sel=document.querySelector('input[name="choiceRadio"]:checked')
  if(!sel)return
  const winnerPid=sel.value
  socket.emit('selectWinner',{playerId,winnerPid})}
socket.on('registered',data=>{
  playerId=data.playerId
  player=data.player
  saveId(playerId)
  state.started=data.gameState.started
  if(state.started){screen1.classList.add('hidden');screen2.classList.remove('hidden')}
  renderPlayers(data.gameState.players)
})
socket.on('players',list=>{renderPlayers(list);renderScores(list)})
socket.on('gameStarted',data=>{
  state.started=true
  state.judgeId=data.judgeId
  state.currentBlack=data.currentBlack
  screen1.classList.add('hidden')
  screen2.classList.remove('hidden')
  if(playerId){socket.emit('setName',{playerId})}
})
socket.on('showJudgeRound',data=>{
  screen3.classList.remove('hidden')
  screen2.classList.add('hidden')
  blackCardDiv.textContent=data.currentBlack||''
  choicesDiv.innerHTML=''
})
socket.on('roundStarted',data=>{
  screen2.classList.remove('hidden')
  blackCardDiv.textContent=data.currentBlack||''
})
socket.on('judgeChoices',entries=>{
  screen3.classList.remove('hidden')
  screen2.classList.add('hidden')
  choicesDiv.innerHTML=''
  for(const e of entries){const d=document.createElement('label');d.className='choice';d.innerHTML=`<input type="radio" name="choiceRadio" value="${e.pid}"> ${e.card}`;choicesDiv.appendChild(d)} })
socket.on('roundEnded',data=>{
  screen3.classList.add('hidden')
  screen2.classList.remove('hidden')
})
socket.on('gameReset',()=>{
  screen3.classList.add('hidden')
  screen2.classList.add('hidden')
  screen1.classList.remove('hidden')
  localStorage.removeItem('playerId')
})
socket.on('players',list=>{const me=list.find(p=>p.id===playerId);if(me)renderHand(Array.from({length:me.handSize}).map((_,i)=>''))})