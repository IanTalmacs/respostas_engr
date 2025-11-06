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
for(const p of list){const s=document.createElement('div');s.className='scoreItem';s.textContent=`${p.name}: ${p.sc