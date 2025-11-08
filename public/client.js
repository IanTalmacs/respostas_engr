const socket = io();

let myId = null;
let myCards = [];
let gameState = null;

const nameScreen = document.getElementById('nameScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const playersList = document.getElementById('playersList');
const blackCard = document.getElementById('blackCard');
const czarInfo = document.getElementById('czarInfo');
const statusInfo = document.getElementById('statusInfo');
const whiteCardsContainer = document.getElementById('whiteCardsContainer');
const scoresContainer = document.getElementById('scores');
const submissionsContainer = document.getElementById('submissionsContainer');
const winnerAnnouncement = document.getElementById('winnerAnnouncement');

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (name) {
    socket.emit('join', name);
    nameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
  }
});

nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinBtn.click();
  }
});

startBtn.addEventListener('click', () => {
  socket.emit('startGame');
});

socket.on('connect', () => {
  myId = socket.id;
});

socket.on('gameState', (state) => {
  gameState = state;
  
  updateScores();
  
  if (state.gameStarted) {
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    if (state.isCzar && state.blackCard) {
      blackCard.textContent = state.blackCard;
    } else if (!state.isCzar) {
      blackCard.textContent = 'aguardando o juiz...';
    }
    
    const czarName = state.players[state.currentCzar];
    
    if (state.isCzar) {
      czarInfo.textContent = '👑 você é o juiz desta rodada';
    } else {
      czarInfo.textContent = `👑 ${czarName} é o juiz`;
    }
    
    if (state.roundPhase === 'playing') {
      submissionsContainer.classList.add('hidden');
      
      if (state.isCzar) {
        whiteCardsContainer.classList.add('hidden');
        statusInfo.textContent = 'aguardando respostas...';
      } else {
        whiteCardsContainer.classList.remove('hidden');
        statusInfo.textContent = `${state.submissionCount}/${state.totalPlayers} respostas enviadas`;
      }
    } else if (state.roundPhase === 'judging') {
      whiteCardsContainer.classList.add('hidden');
      
      if (state.isCzar) {
        submissionsContainer.classList.remove('hidden');
        statusInfo.textContent = 'escolha a melhor resposta';
        renderSubmissions(state.submissions, true);
      } else {
        submissionsContainer.classList.add('hidden');
        statusInfo.textContent = 'aguardando o juiz escolher...';
      }
    }
  } else {
    updateLobby(state);
  }
});

socket.on('yourCards', (cards) => {
  myCards = cards;
  renderCards();
});

socket.on('roundWinner', (data) => {
  winnerAnnouncement.classList.remove('hidden');
  winnerAnnouncement.querySelector('h2').textContent = `${data.winnerName} venceu!`;
  winnerAnnouncement.querySelector('.winner-card').textContent = data.winningCard;
  
  setTimeout(() => {
    winnerAnnouncement.classList.add('hidden');
  }, 3500);
});

function updateLobby(state) {
  playersList.innerHTML = '';
  
  Object.entries(state.players).forEach(([id, name]) => {
    const item = document.createElement('div');
    item.className = 'player-item';
    
    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    avatar.textContent = name.charAt(0).toUpperCase();
    
    const nameEl = document.createElement('div');
    nameEl.className = 'player-name';
    nameEl.textContent = name;
    
    const score = document.createElement('div');
    score.className = 'player-score';
    score.textContent = `${state.scores[id] || 0} pts`;
    
    item.appendChild(avatar);
    item.appendChild(nameEl);
    item.appendChild(score);
    playersList.appendChild(item);
  });
  
  const playerCount = Object.keys(state.players).length;
  startBtn.disabled = playerCount < 3;
  
  if (playerCount < 3) {
    document.querySelector('.wait-text').style.display = 'block';
  } else {
    document.querySelector('.wait-text').style.display = 'none';
  }
}

function updateScores() {
  if (!gameState) return;
  
  scoresContainer.innerHTML = '';
  
  Object.entries(gameState.players).forEach(([id, name]) => {
    const item = document.createElement('div');
    item.className = 'score-item';
    
    if (id === gameState.currentCzar) {
      item.classList.add('czar');
    }
    
    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    
    const scoreEl = document.createElement('span');
    scoreEl.className = 'score-value';
    scoreEl.textContent = gameState.scores[id] || 0;
    
    item.appendChild(nameEl);
    item.appendChild(scoreEl);
    scoresContainer.appendChild(item);
  });
}

function renderCards() {
  whiteCardsContainer.innerHTML = '';
  
  const isCzar = gameState?.isCzar;
  const hasSubmitted = gameState?.submissions && gameState.submissions[myId];
  
  myCards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'white-card';
    cardEl.textContent = card;
    
    if (isCzar || hasSubmitted) {
      cardEl.classList.add('disabled');
    } else {
      cardEl.addEventListener('click', () => {
        socket.emit('submitCard', index);
      });
    }
    
    whiteCardsContainer.appendChild(cardEl);
  });
}

function renderSubmissions(submissions, isCzar) {
  submissionsContainer.innerHTML = '';
  
  submissions.forEach(([playerId, card]) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'submission-card';
    cardEl.textContent = card;
    
    if (isCzar) {
      cardEl.addEventListener('click', () => {
        socket.emit('selectWinner', playerId);
      });
    }
    
    submissionsContainer.appendChild(cardEl);
  });
}