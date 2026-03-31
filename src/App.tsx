/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trophy, User, Hash } from 'lucide-react';

const BOARD_SIZE = 15;

type Player = 'black' | 'white';
type CellValue = Player | null;

export default function App() {
  const [board, setBoard] = useState<CellValue[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [history, setHistory] = useState<{ row: number; col: number; player: Player }[]>([]);
  const [gameMode, setGameMode] = useState<'pvp' | 'pvc'>('pvc');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const checkWinner = useCallback((row: number, col: number, player: Player, currentBoard: CellValue[][]) => {
    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1], // Diagonal /
    ];

    for (const [dr, dc] of directions) {
      let count = 1;

      // Check forward
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++;
        } else {
          break;
        }
      }

      // Check backward
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) return true;
    }
    return false;
  }, []);

  const handleCellClick = (row: number, col: number) => {
    if (board[row][col] || winner || isAiThinking) return;

    makeMove(row, col);
  };

  const makeMove = (row: number, col: number) => {
    const newBoard = board.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? currentPlayer : c))
    );

    setBoard(newBoard);
    setHistory(prev => [...prev, { row, col, player: currentPlayer }]);

    if (checkWinner(row, col, currentPlayer, newBoard)) {
      setWinner(currentPlayer);
    } else if (newBoard.every(r => r.every(c => c !== null))) {
      setWinner('draw');
    } else {
      setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    }
  };

  // AI Logic
  const evaluatePosition = useCallback((row: number, col: number, player: Player, currentBoard: CellValue[][]) => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let totalScore = 0;

    for (const [dr, dc] of directions) {
      let count = 1;
      let openEnds = 0;

      // Check forward
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (currentBoard[r][c] === player) count++;
          else if (currentBoard[r][c] === null) { openEnds++; break; }
          else break;
        } else break;
      }

      // Check backward
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (currentBoard[r][c] === player) count++;
          else if (currentBoard[r][c] === null) { openEnds++; break; }
          else break;
        } else break;
      }

      if (count >= 5) totalScore += 100000;
      else if (count === 4) totalScore += openEnds === 2 ? 10000 : 1000;
      else if (count === 3) totalScore += openEnds === 2 ? 1000 : 100;
      else if (count === 2) totalScore += openEnds === 2 ? 100 : 10;
      else if (count === 1) totalScore += 1;
    }
    return totalScore;
  }, []);

  useEffect(() => {
    if (gameMode === 'pvc' && currentPlayer === 'white' && !winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        // Easy mode random factor
        if (difficulty === 'easy' && Math.random() < 0.3) {
          const emptyCells: {r: number, c: number}[] = [];
          for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              if (!board[r][c]) emptyCells.push({r, c});
            }
          }
          if (emptyCells.length > 0) {
            const randomMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            makeMove(randomMove.r, randomMove.c);
            setIsAiThinking(false);
            return;
          }
        }

        let bestScore = -1;
        let bestMoves: { row: number; col: number }[] = [];

        // Difficulty weights
        const defenseWeight = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.9 : 1.1;
        const offenseWeight = difficulty === 'hard' ? 1.2 : 1.0;

        // Simple heuristic: evaluate all empty cells
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (!board[r][c]) {
              // Score for AI (offensive)
              const aiScore = evaluatePosition(r, c, 'white', board);
              // Score for Player (defensive)
              const playerScore = evaluatePosition(r, c, 'black', board);
              
              const totalScore = (aiScore * offenseWeight) + (playerScore * defenseWeight);
              
              if (totalScore > bestScore) {
                bestScore = totalScore;
                bestMoves = [{ row: r, col: c }];
              } else if (totalScore === bestScore) {
                bestMoves.push({ row: r, col: c });
              }
            }
          }
        }

        // Pick a random move from the best ones to avoid predictable patterns
        const finalMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        makeMove(finalMove.row, finalMove.col);
        setIsAiThinking(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, board, evaluatePosition, difficulty]);

  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setCurrentPlayer('black');
    setWinner(null);
    setHistory([]);
    setIsAiThinking(false);
  };

  const undoMove = () => {
    if (history.length === 0 || winner || isAiThinking) return;
    
    // In PvC mode, undo two moves (AI and Player)
    if (gameMode === 'pvc' && history.length >= 2) {
      const newHistory = history.slice(0, -2);
      const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
      newHistory.forEach(move => {
        newBoard[move.row][move.col] = move.player;
      });
      setBoard(newBoard);
      setHistory(newHistory);
      setCurrentPlayer('black');
    } else {
      const lastMove = history[history.length - 1];
      const newBoard = board.map((r, ri) =>
        r.map((c, ci) => (ri === lastMove.row && ci === lastMove.col ? null : c))
      );
      setBoard(newBoard);
      setHistory(history.slice(0, -1));
      setCurrentPlayer(lastMove.player);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4 font-sans text-[#1a1a1a]">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center justify-center gap-2">
          <Hash className="w-8 h-8" /> 五子棋大师
        </h1>
        <p className="text-sm uppercase tracking-widest opacity-60">Gomoku Master Edition</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Game Info */}
        <div className="flex flex-col gap-4 w-full lg:w-48">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex flex-col gap-4">
            {/* Mode Selector */}
            <div className="flex flex-col gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-wider opacity-40 font-bold">游戏模式</p>
              <div className="flex bg-[#F5F2ED] p-1 rounded-full">
                <button 
                  onClick={() => { setGameMode('pvc'); resetGame(); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all ${gameMode === 'pvc' ? 'bg-black text-white shadow-md' : 'text-black/40 hover:text-black'}`}
                >
                  人机对战
                </button>
                <button 
                  onClick={() => { setGameMode('pvp'); resetGame(); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all ${gameMode === 'pvp' ? 'bg-black text-white shadow-md' : 'text-black/40 hover:text-black'}`}
                >
                  双人对战
                </button>
              </div>
            </div>

            {gameMode === 'pvc' && (
              <div className="flex flex-col gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-wider opacity-40 font-bold">难度级别</p>
                <div className="flex flex-col gap-1">
                  <input 
                    type="range" 
                    min="0" 
                    max="2" 
                    step="1" 
                    value={difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDifficulty(val === 0 ? 'easy' : val === 1 ? 'medium' : 'hard');
                      resetGame();
                    }}
                    className="w-full h-1.5 bg-[#F5F2ED] rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[9px] font-bold opacity-60 px-1">
                    <span className={difficulty === 'easy' ? 'text-black opacity-100' : ''}>简单</span>
                    <span className={difficulty === 'medium' ? 'text-black opacity-100' : ''}>中等</span>
                    <span className={difficulty === 'hard' ? 'text-black opacity-100' : ''}>困难</span>
                  </div>
                </div>
              </div>
            )}

            <div className="h-px bg-black/5" />

            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full shadow-inner transition-all duration-300 ${currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-black/10'}`} />
              <span className="font-medium text-sm">
                {isAiThinking ? '电脑思考中...' : (currentPlayer === 'black' ? '黑方回合' : '白方回合')}
              </span>
            </div>
            <div className="h-px bg-black/5" />
            <div className="flex flex-col gap-2">
              <button 
                onClick={resetGame}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-black text-white rounded-full text-sm font-medium hover:bg-black/80 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> 重新开始
              </button>
              <button 
                onClick={undoMove}
                disabled={history.length === 0 || !!winner}
                className="flex items-center justify-center gap-2 py-2 px-4 border border-black/10 rounded-full text-sm font-medium hover:bg-black/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                悔棋
              </button>
            </div>
          </div>

          {winner && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-black text-white p-6 rounded-3xl shadow-xl flex flex-col items-center gap-2 text-center"
            >
              <Trophy className="w-8 h-8 mb-2 text-yellow-400" />
              <h2 className="text-xl font-bold">
                {winner === 'draw' ? '平局！' : `${winner === 'black' ? '黑方' : '白方'} 获胜！`}
              </h2>
              <p className="text-xs opacity-60">精彩的对决</p>
            </motion.div>
          )}
        </div>

        {/* Board Container */}
        <div className="relative p-4 bg-[#DDBB88] rounded-xl shadow-2xl border-4 border-[#8B4513]">
          <div 
            className="grid gap-0" 
            style={{ 
              gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              width: 'min(90vw, 600px)',
              height: 'min(90vw, 600px)'
            }}
          >
            {board.map((row, ri) =>
              row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  onClick={() => handleCellClick(ri, ci)}
                  className="relative cursor-pointer group"
                >
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`h-px bg-black/30 w-full ${ci === 0 ? 'ml-1/2' : ci === BOARD_SIZE - 1 ? 'mr-1/2' : ''}`} />
                    <div className={`w-px bg-black/30 h-full absolute ${ri === 0 ? 'mt-1/2' : ri === BOARD_SIZE - 1 ? 'mb-1/2' : ''}`} />
                  </div>

                  {/* Star Points (Hoshi) */}
                  {((ri === 3 || ri === 11) && (ci === 3 || ci === 11)) || (ri === 7 && ci === 7) ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    </div>
                  ) : null}

                  {/* Piece */}
                  <div className="absolute inset-0 flex items-center justify-center p-1">
                    <AnimatePresence>
                      {cell && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                          className={`w-full h-full rounded-full shadow-lg ${
                            cell === 'black' 
                              ? 'bg-gradient-to-br from-neutral-700 to-black' 
                              : 'bg-gradient-to-br from-white to-neutral-200 border border-black/10'
                          }`}
                        />
                      )}
                    </AnimatePresence>
                    
                    {/* Hover Preview */}
                    {!cell && !winner && (
                      <div className={`w-full h-full rounded-full opacity-0 group-hover:opacity-20 transition-opacity ${
                        currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-black'
                      }`} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-xs opacity-40 flex items-center gap-4">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" /> {gameMode === 'pvc' ? '人机对战' : '双人对战'}
        </div>
        <div className="w-1 h-1 bg-black/20 rounded-full" />
        <div>标准 15x15 棋盘</div>
      </div>
    </div>
  );
}
