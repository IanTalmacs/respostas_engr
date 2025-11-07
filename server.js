const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

let gameState = {
  players: {},
  currentCzar: null,
  blackCard: null,
  whiteCards: {},
  submissions: {},
  scores: {},
  gameStarted: false,
  roundPhase: 'waiting',
  selectedWinner: null
};

let questions = { black: [], white: [] };

try {
  const data = fs.readFileSync(path.join(__dirname, 'public', 'questions.json'), 'utf8');
  questions = JSON.parse(data);
} catch (err) {
  console.log('questions.json not loaded');
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dealCards(playerId, count = 7) {
  if (!gameState.whiteCards[playerId]) {
    gameState.whiteCards[playerId] = [];
  }
  
  const availableCards = questions.white.filter(
    card => !Object.values(gameState.whiteCards).flat().includes(card)
  );
  
  const shuffled = shuffleArray(availableCards);
  const needed = count - gameState.whiteCards[playerId].length;
  
  for (let i = 0; i < needed && i < shuffled.length; i++) {
    gameState.whiteCards[playerId].push(shuffled[i]);
  }
}

function startNewRound() {
  const playerIds = Object.keys(gameState.players);
  
  if (playerIds.length < 3) {
    gameState.roundPhase = 'waiting';
    return;
  }
  
  if (!gameState.currentCzar) {
    gameState.currentCzar = playerIds[0];
  } else {
    const currentIndex = playerIds.indexOf(gameState.currentCzar);
    gameState.currentCzar = playerIds[(currentIndex + 1) % playerIds.length];
  }
  
  const usedBlackCards = gameState.usedBlackCards || [];
  const availableBlackCards = questions.black.filter(card => !usedBlackCards.includes(card));
  
  if (availableBlackCards.length === 0) {
    gameState.usedBlackCards = [];
    gameState.blackCard = shuffleArray(questions.black)[0];
  } else {
    gameState.blackCard = shuffleArray(availableBlackCards)[0];
  }
  
  if (!gameState.usedBlackCards) gameState.usedBlackCards = [];
  gameState.usedBlackCards.push(gameState.blackCard);
  
  gameState.submissions = {};
  gameState.selectedWinner = null;
  gameState.roundPhase = 'playing';
  
  playerIds.forEach(id => {
    if (id !== gameState.currentCzar) {
      dealCards(id, 7);
    }
  });
}

io.on('connection', (socket) => {
  
  socket.on('join', (playerName) => {
    gameState.players[socket.id] = playerName;
    gameState.scores[socket.id] = gameState.scores[socket.id] || 0;
    gameState.whiteCards[socket.id] = [];
    
    if (gameState.gameStarted && gameState.roundPhase === 'playing') {
      dealCards(socket.id, 7);
    }
    
    io.emit('gameState', {
      players: gameState.players,
      scores: gameState.scores,
      currentCzar: gameState.currentCzar,
      blackCard: gameState.blackCard,
      roundPhase: gameState.roundPhase,
      gameStarted: gameState.gameStarted,
      submissionCount: Object.keys(gameState.submissions).length,
      totalPlayers: Object.keys(gameState.players).length - 1
    });
    
    socket.emit('yourCards', gameState.whiteCards[socket.id]);
  });
  
  socket.on('startGame', () => {
    if (Object.keys(gameState.players).length >= 3) {
      gameState.gameStarted = true;
      
      Object.keys(gameState.players).forEach(id => {
        dealCards(id, 7);
      });
      
      startNewRound();
      
      io.emit('gameState', {
        players: gameState.players,
        scores: gameState.scores,
        currentCzar: gameState.currentCzar,
        blackCard: gameState.blackCard,
        roundPhase: gameState.roundPhase,
        gameStarted: gameState.gameStarted,
        submissionCount: 0,
        totalPlayers: Object.keys(gameState.players).length - 1
      });
      
      Object.keys(gameState.players).forEach(id => {
        io.to(id).emit('yourCards', gameState.whiteCards[id]);
      });
    }
  });
  
  socket.on('submitCard', (cardIndex) => {
    if (socket.id === gameState.currentCzar || gameState.roundPhase !== 'playing') {
      return;
    }
    
    const card = gameState.whiteCards[socket.id][cardIndex];
    if (card) {
      gameState.submissions[socket.id] = card;
      gameState.whiteCards[socket.id].splice(cardIndex, 1);
      
      io.emit('gameState', {
        players: gameState.players,
        scores: gameState.scores,
        currentCzar: gameState.currentCzar,
        blackCard: gameState.blackCard,
        roundPhase: gameState.roundPhase,
        gameStarted: gameState.gameStarted,
        submissionCount: Object.keys(gameState.submissions).length,
        totalPlayers: Object.keys(gameState.players).length - 1
      });
      
      socket.emit('yourCards', gameState.whiteCards[socket.id]);
      
      const nonCzarPlayers = Object.keys(gameState.players).filter(id => id !== gameState.currentCzar);
      if (Object.keys(gameState.submissions).length === nonCzarPlayers.length) {
        gameState.roundPhase = 'judging';
        
        const shuffledSubmissions = shuffleArray(Object.entries(gameState.submissions));
        
        io.emit('gameState', {
          players: gameState.players,
          scores: gameState.scores,
          currentCzar: gameState.currentCzar,
          blackCard: gameState.blackCard,
          roundPhase: gameState.roundPhase,
          gameStarted: gameState.gameStarted,
          submissions: shuffledSubmissions
        });
      }
    }
  });
  
  socket.on('selectWinner', (playerId) => {
    if (socket.id !== gameState.currentCzar || gameState.roundPhase !== 'judging') {
      return;
    }
    
    gameState.scores[playerId] = (gameState.scores[playerId] || 0) + 1;
    gameState.selectedWinner = playerId;
    gameState.roundPhase = 'roundEnd';
    
    io.emit('roundWinner', {
      winnerId: playerId,
      winnerName: gameState.players[playerId],
      winningCard: gameState.submissions[playerId],
      scores: gameState.scores
    });
    
    setTimeout(() => {
      startNewRound();
      
      io.emit('gameState', {
        players: gameState.players,
        scores: gameState.scores,
        currentCzar: gameState.currentCzar,
        blackCard: gameState.blackCard,
        roundPhase: gameState.roundPhase,
        gameStarted: gameState.gameStarted,
        submissionCount: 0,
        totalPlayers: Object.keys(gameState.players).length - 1
      });
      
      Object.keys(gameState.players).forEach(id => {
        io.to(id).emit('yourCards', gameState.whiteCards[id]);
      });
    }, 4000);
  });
  
  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    delete gameState.whiteCards[socket.id];
    delete gameState.submissions[socket.id];
    
    if (socket.id === gameState.currentCzar) {
      gameState.currentCzar = null;
      if (gameState.gameStarted && Object.keys(gameState.players).length >= 3) {
        startNewRound();
      }
    }
    
    if (Object.keys(gameState.players).length < 3) {
      gameState.gameStarted = false;
      gameState.roundPhase = 'waiting';
    }
    
    io.emit('gameState', {
      players: gameState.players,
      scores: gameState.scores,
      currentCzar: gameState.currentCzar,
      blackCard: gameState.blackCard,
      roundPhase: gameState.roundPhase,
      gameStarted: gameState.gameStarted,
      submissionCount: Object.keys(gameState.submissions).length,
      totalPlayers: Object.keys(gameState.players).length - 1
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});