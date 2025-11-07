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

let questions = { 
  black: [
"É uma pena que os jovens hoje estão se envolvendo com ___",
"O médico me disse que foi um milagre, mas de agora em diante, nada de ___",
"Um jantar romântico não estaria completo sem ___",
"Tenho muitos problemas, mas ___ não é um deles",
"O que a vovó acharia perturbador, mas charmoso?",
"Cada vez tem mais pessoas com fobia a ___",
"Qual é o seu pecado meu filho?",
"___ é minha melhor lembrança da colônia de férias",
"Se a medicação não funcionar, substitua por ___",
"Para quebrar o gelo, fale sobre ___",
"Qual é o meu super poder?",
"Metade dos casamentos acabam em ___",
"Que coisa é legal hoje, mas vai deixar de ser daqui a 10 anos?",
"Neste ano, na Sapucaí, a escola de samba vencedora teve como tema ___",
"Hoje vai passar na televisão o campeonato mundial de ___",
"O verdadeiro segredo da felicidade é: ___",
"No meu currículo eu coloquei como 'habilidade': ___",
"No novo filme do Titanic, a atração foi ___",
"Minha camiseta preferida diz: eu amo ____",
"Você não me ama, você só pensa em ___",
"O novo perfume da Natura se chama ___",
"Sabe que hora é essa? É hora de ___",
"O que faria você se apaixonar por alguém?",
"___ me dá náuseas",
"Meu nome de DJ seria ‘MC ___’",
"Não precisa fazer drama, afinal, ___ não é tão ruim assim",
"A partir de hoje, ___ vai ser proibido em todo o Brasil",
"Cuidado meu filho, ___ é a porta de entrada para o lado negro da força",
"Ninguém admite, mas todo mundo gosta de ___",
"___ nunca será explicado pela ciência",
"Se ___ fosse esporte, eu ganharia medalha de ouro",
"___ seria meu pior pesadelo",
"- Papai por que a mamãe está chorando? - Porque ela não gosta de ___",
"Durante as refeições, eu gosto de pensar em ___",
"Em minha nova casa, vou querer uma sala só para ___",
"A FIFA baniu ___ por dar uma vantagem injusta nos jogos.",
"___ estragou meu primeiro encontro",
"Após morar 6 anos na China, descobri que eu prefiro ___",
"O que fica mais legal com o passar do tempo?",
"___ me faz peidar impulsivamente"
  ], 
  white: [
"Uma playlist cheia de boleros",
"O computador que Stephen Hawking usava para falar",
"Catarro, muito catarro",
"Um futuro onde o Paraguai é uma potência nuclear",
"Muitos morcegos",
"Asinhas de frango",
"COVID-19",
"Empréstimos bancários",
"Um peido tão alto que acorda os monges no Tibet",
"Uma atitude positiva",
"Batman",
"Uma nuvem que faz chover Diarréia",
"Amostras grátis",
"Patins",
"Spoiler",
"Crocs com meia",
"Um surto de dengue",
"2 caras em uma moto",
"Sertanejo Universitário",
"Abdução alienígena",
"Descontos na Black Friday",
"Fake news no grupo de zap",
"Universos paralelos",
"Peido quente embaixo da coberta",
"Cerveja no café da manhã",
"Áudio no zap de 5 minutos",
"Maquiagem que não borra",
"Café Gourmet",
"Leite Estragado",
"Meu chefe",
"Crosfit",
"Um crush que só responde com stickers",
"Uma selfie com o Saci",
"Whey Protein",
"O estado do Piauí",
"Um beijo molhado da vovó",
"Cocozinhos",
"O cheiro do vovô",
"Fofoca",
"Um milho mágico que te faz peidar arco-íris",
"Vômito",
"Cera de ouvido",
"Uma privada entupida",
"Big Brother Brasil",
"Uma tatuagem no rosto",
"Um show de heavy metal",
"Bond, James Bond!",
"Alguém que visita de surpresa",
"Chulé",
"Caganeira competitiva",
"Picles",
"TPM",
"Nada, absolutamente nada",
"Brutalidade",
"Arroto no meio do beijo",
"Uma emergência intestinal",
"Cuscuz com leite",
"Aquele colega X9",
"Cafuné",
"Redes sociais",
"Obsessão por limpeza",
"Correr uma maratona",
"Bloquear rampas para portadores de deficiência física",
"Perder tudo em site de apostas",
"Hackear aplicativos de mensagens",
"Bisbilhotar o celular da família",
"Colocar uva passa no arroz",
"Ficar careca",
"Ser pipoqueiro",
"Fazer live",
"Reclamar",
"Botar ovos",
"Emergir do mar, e invadir a cidade de Tokyo",
"Ir para a aula de pilates",
"Fazer papel de trouxa",
"Ligar o ar condicionado",
"Fingir demência",
"Viajar para a Turquia para fazer implante capilar",
"Ser youtuber",
"Jogar esse jogo chato",
"Se mudar para a Tailândia",
"Peidar e colocar a culpa em outra pessoa",
"Fazer xixi na piscina",
"Fazer xixi na cama",
"Comer caquinha de nariz",
"Usar a escova de dente do amigo",
"Ficar mais de 1 semana sem tomar banho",
"Dizer ‘Eu te amo’",
"Se esconder debaixo da cama",
"Reutilizar fraldas geriátricas",
"Falhar no exame antidoping",
"Cantar ‘Evidências’ no karaokê",
"Ir no show do Reginaldo Rossi",
"Ser expulso da sala de aula",
"Pegar carona com estranhos",
"Quebrar um braço andando de skate",
"Cortar o próprio cabelo",
"Chorar assistindo ‘Titanic’",
"Dormir no ônibus e perder o ponto",
"Deixar o celular cair na privada",
"Ir de penetra em uma festa",
"Se apaixonar à primeira vista",
"Comer ração de cachorro",
"Fingir doença para faltar a um compromisso",
"Ter um abdômen de tanquinho",
"Assistir a cena do Mufasa morrendo",
"Ser um adulto, com coisas importantes para fazer",
"Roubar doce de criança",
"Mastigar de boca aberta",
"Mijar em qualquer canto",
"Cheirar a própria meia",
"Ficar o dia todo com a cara enfiada no celular",
"Usar cueca do avesso para evitar lavar roupa",
"Peidar molhado",
"Conversar com as plantas",
"Fingir um telefonema para evitar uma conversa",
"Comer algo que caiu no chão por menos de 5 segundos",
"Estourar espinhas alheias",
"Sair do banheiro e fazer um relatório detalhado do cocô",
"Encontrar feijão no pote de sorvete",
"Fugir de casa",
"Contar calorias o dia todo",
"Assistir o show do Restart"
  ] 
};

try {
  const data = fs.readFileSync(path.join(__dirname, 'public', 'questions.json'), 'utf8');
  const loaded = JSON.parse(data);
  if (loaded.black && loaded.black.length > 0) {
    questions.black = loaded.black;
  }
  if (loaded.white && loaded.white.length > 0) {
    questions.white = loaded.white;
  }
} catch (err) {
  console.log('Using default questions');
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