import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Message {
  id: string;
  senderId: string;
  nickname: string;
  role: string;
  text: string;
  timestamp: number;
}

interface GameState {
  board: (string | null)[][];
  currentPlayer: 'black' | 'white';
  winner: string | null;
  history: any[];
  players: {
    black: { id: string | null; nickname: string | null };
    white: { id: string | null; nickname: string | null };
  };
  spectators: string[];
  messages: Message[];
}

const rooms: Map<string, GameState> = new Map();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          board: Array(15).fill(null).map(() => Array(15).fill(null)),
          currentPlayer: 'black',
          winner: null,
          history: [],
          players: { 
            black: { id: null, nickname: null }, 
            white: { id: null, nickname: null } 
          },
          spectators: [],
          messages: []
        });
      }

      const gameState = rooms.get(roomId)!;
      
      // Assign role
      let role: 'black' | 'white' | 'spectator' = 'spectator';
      if (!gameState.players.black.id) {
        gameState.players.black.id = socket.id;
        role = 'black';
      } else if (!gameState.players.white.id) {
        gameState.players.white.id = socket.id;
        role = 'white';
      } else {
        gameState.spectators.push(socket.id);
      }

      socket.emit("init_state", { gameState, role });
      io.to(roomId).emit("room_update", gameState);
    });

    socket.on("send_message", ({ roomId, text, nickname }) => {
      const gameState = rooms.get(roomId);
      if (!gameState || !text.trim()) return;

      let role = 'spectator';
      if (gameState.players.black.id === socket.id) role = 'black';
      else if (gameState.players.white.id === socket.id) role = 'white';

      const newMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        senderId: socket.id,
        nickname: nickname || '匿名',
        role,
        text: text.trim(),
        timestamp: Date.now()
      };

      gameState.messages.push(newMessage);
      if (gameState.messages.length > 50) {
        gameState.messages.shift();
      }

      io.to(roomId).emit("new_message", newMessage);
    });

    socket.on("make_move", ({ roomId, row, col }) => {
      const gameState = rooms.get(roomId);
      if (!gameState || gameState.winner) return;

      // Verify it's the correct player's turn
      const expectedPlayerId = gameState.currentPlayer === 'black' ? gameState.players.black.id : gameState.players.white.id;
      if (socket.id !== expectedPlayerId) return;

      if (gameState.board[row][col]) return;

      gameState.board[row][col] = gameState.currentPlayer;
      gameState.history.push({ row, col, player: gameState.currentPlayer });

      // Check winner logic on server for authority
      if (checkWinner(row, col, gameState.currentPlayer, gameState.board)) {
        gameState.winner = gameState.currentPlayer;
      } else if (gameState.board.every(r => r.every(c => c !== null))) {
        gameState.winner = 'draw';
      } else {
        gameState.currentPlayer = gameState.currentPlayer === 'black' ? 'white' : 'black';
      }

      io.to(roomId).emit("room_update", gameState);
    });

    socket.on("reset_game", (roomId) => {
      const gameState = rooms.get(roomId);
      if (!gameState) return;
      
      // Only players can reset
      if (socket.id !== gameState.players.black.id && socket.id !== gameState.players.white.id) return;

      gameState.board = Array(15).fill(null).map(() => Array(15).fill(null));
      gameState.currentPlayer = 'black';
      gameState.winner = null;
      gameState.history = [];

      io.to(roomId).emit("room_update", gameState);
    });

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        const gameState = rooms.get(roomId);
        if (gameState) {
          if (gameState.players.black.id === socket.id) {
            gameState.players.black.id = null;
            gameState.players.black.nickname = null;
          }
          else if (gameState.players.white.id === socket.id) {
            gameState.players.white.id = null;
            gameState.players.white.nickname = null;
          }
          else {
            gameState.spectators = gameState.spectators.filter(id => id !== socket.id);
          }
          
          // If room empty, delete it
          if (!gameState.players.black.id && !gameState.players.white.id && gameState.spectators.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit("room_update", gameState);
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function checkWinner(row: number, col: number, player: string, board: (string | null)[][]) {
  const BOARD_SIZE = 15;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i, c = col - dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

startServer();
