const fs = require('fs')
io.emit('players',mapPlayers())
})
socket.on('startGame',data=>{
if(data.password!=='12345678')return
if(game.started)return
game.started=true
game.startTime=Date.now()
game.expiresAt=game.startTime+2*60*60*1000
for(let id of game.order){dealTo(game.players[id])}
game.currentBlack=game.blackDeck.pop()||null
io.emit('gameStarted',{judgeId:game.order[game.judgeIndex]||null,players:mapPlayers(),currentBlack:game.currentBlack,expiresAt:game.expiresAt})
})
socket.on('startRound',data=>{
const playerId=data.playerId
if(!playerId||game.order[game.judgeIndex]!==playerId)return
if(game.roundActive)return
game.roundActive=true
game.currentBlack=game.blackDeck.pop()||null
game.submissions={}
io.to(game.players[playerId].socketId).emit('showJudgeRound',{currentBlack:game.currentBlack})
for(let id of game.order){if(id!==playerId){io.to(game.players[id].socketId).emit('roundStarted',{currentBlack:game.currentBlack})}}
})
socket.on('submitCard',data=>{
const pid=data.playerId
const card=data.card
if(!pid||!game.players[pid]||!game.roundActive)return
if(game.order[game.judgeIndex]===pid)return
if(game.submissions[pid])return
const idx=game.players[pid].hand.indexOf(card)
if(idx>-1){game.players[pid].hand.splice(idx,1)}
game.submissions[pid]=card
dealTo(game.players[pid])
io.emit('players',mapPlayers())
const ready=checkAllSubmitted()
if(ready){const entries=Object.entries(game.submissions).map(([pid,card])=>({pid,card}));shuffle(entries);io.to(game.players[game.order[game.judgeIndex]].socketId).emit('judgeChoices',entries)}
})
socket.on('selectWinner',data=>{
const judgeId=data.playerId
if(game.order[game.judgeIndex]!==judgeId)return
const winnerPid=data.winnerPid
if(!winnerPid||!game.players[winnerPid])return
game.players[winnerPid].score=(game.players[winnerPid].score||0)+1
game.roundActive=false
game.submissions={}
game.judgeIndex=(game.judgeIndex+1)%game.order.length
io.emit('roundEnded',{winnerPid,players:mapPlayers(),nextJudge:game.order[game.judgeIndex]||null})
})
socket.on('disconnect',()=>{
const pid=findPlayerBySocket(socket.id)
if(pid){game.players[pid].connected=false}
io.emit('players',mapPlayers())
})
})
function findPlayerBySocket(sid){for(let id in game.players){if(game.players[id].socketId===sid)return id}return null}
function mapPlayers(){const out=[];for(let id of game.order){const p=game.players[id];if(p)out.push({id:p.id,name:p.name,score:p.score,connected:p.connected,handSize:p.hand.length})}return out}
function checkAllSubmitted(){const judge=game.order[game.judgeIndex];for(let id of game.order){if(id===judge)continue; if(!game.submissions[id])return false}return true}
setInterval(()=>{
if(game.started&&game.expiresAt&&Date.now()>game.expiresAt){resetGame()}
},1000*30)
const PORT=process.env.PORT||3000
server.listen(PORT)