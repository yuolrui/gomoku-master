/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trophy, User, Hash, Users, Eye, Play, Plus, LogOut } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const BOARD_SIZE = 15;

type Player = 'black' | 'white';
type CellValue = Player | null;

interface GameState {
  board: CellValue[][];
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  history: any[];
  players: {
    black: string | null;
    white: string | null;
  };
  spectators: string[];
}

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<'black' | 'white' | 'spectator' | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('init_state', ({ gameState, role }) => {
      setGameState(gameState);
      setMyRole(role);
    });

    socketRef.current.on('room_update', (updatedState) => {
      setGameState(updatedState);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const joinRoom = (id: string) => {
    if (!id.trim()) return;
    setRoomId(id);
    socketRef.current?.emit('join_room', id);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!roomId || !gameState || gameState.winner || myRole === 'spectator') return;
    if (gameState.currentPlayer !== myRole) return;
    if (gameState.board[row][col]) return;

    socketRef.current?.emit('make_move', { roomId, row, col });
  };

  const resetGame = () => {
    if (!roomId) return;
    socketRef.current?.emit('reset_game', roomId);
  };

  const leaveRoom = () => {
    setRoomId(null);
    setGameState(null);
    setMyRole(null);
    window.location.reload(); // Simple way to reset state and disconnect
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4 font-sans text-[#1a1a1a]">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3">
            <Hash className="w-10 h-10" /> 五子棋大师
          </h1>
          <p className="text-sm uppercase tracking-[0.3em] opacity-60">Gomoku Master Online</p>
        </motion.div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-black/5 w-full max-w-md flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider opacity-40 px-2">创建或加入房间</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="输入房间号..."
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                className="flex-1 bg-[#F5F2ED] border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-black transition-all outline-none"
              />
              <button 
                onClick={() => joinRoom(inputRoomId)}
                className="bg-black text-white px-6 rounded-2xl font-bold hover:bg-black/80 transition-all flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-black/20 bg-white px-2">或者</div>
          </div>

          <button 
            onClick={() => joinRoom(Math.random().toString(36).substring(7))}
            className="w-full py-4 px-6 border-2 border-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all group"
          >
            <Play className="w-5 h-5 group-hover:scale-110 transition-transform" /> 快速开始
          </button>
        </div>

        <div className="mt-12 flex items-center gap-8 opacity-30 text-xs font-medium">
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /> 多人对战</div>
          <div className="flex items-center gap-2"><Eye className="w-4 h-4" /> 实时观战</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4 font-sans text-[#1a1a1a]">
      {/* Header */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-8 px-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Hash className="w-6 h-6" /> 五子棋大师
          </h1>
          <p className="text-[10px] uppercase tracking-widest opacity-40">房间: {roomId}</p>
        </div>
        <button 
          onClick={leaveRoom}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-full text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" /> 退出房间
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Game Info */}
        <div className="flex flex-col gap-4 w-full lg:w-64">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex flex-col gap-6">
            {/* Role Info */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-wider opacity-40 font-bold">你的身份</p>
              <div className="flex items-center gap-3 bg-[#F5F2ED] p-3 rounded-2xl">
                {myRole === 'spectator' ? (
                  <Eye className="w-5 h-5 opacity-40" />
                ) : (
                  <div className={`w-5 h-5 rounded-full shadow-inner ${myRole === 'black' ? 'bg-black' : 'bg-white border border-black/10'}`} />
                )}
                <span className="font-bold text-sm">
                  {myRole === 'black' ? '黑方 (先手)' : myRole === 'white' ? '白方 (后手)' : '观战者'}
                </span>
              </div>
            </div>

            <div className="h-px bg-black/5" />

            {/* Turn Info */}
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full shadow-inner transition-all duration-300 ${gameState?.currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-black/10'}`} />
              <span className="font-bold text-sm">
                {gameState?.currentPlayer === 'black' ? '黑方回合' : '白方回合'}
                {gameState?.currentPlayer === myRole && <span className="ml-2 text-green-600">(到你了)</span>}
              </span>
            </div>

            <div className="h-px bg-black/5" />

            {/* Controls */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={resetGame}
                disabled={myRole === 'spectator'}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-black text-white rounded-2xl text-sm font-bold hover:bg-black/80 transition-all disabled:opacity-20"
              >
                <RotateCcw className="w-4 h-4" /> 重新开始
              </button>
            </div>
          </div>

          {/* Spectators List */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-black/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider opacity-40 font-bold">观战人数</p>
              <span className="text-xs font-bold">{gameState?.spectators.length || 0}</span>
            </div>
          </div>

          {gameState?.winner && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-black text-white p-6 rounded-3xl shadow-xl flex flex-col items-center gap-2 text-center"
            >
              <Trophy className="w-8 h-8 mb-2 text-yellow-400" />
              <h2 className="text-xl font-bold">
                {gameState.winner === 'draw' ? '平局！' : `${gameState.winner === 'black' ? '黑方' : '白方'} 获胜！`}
              </h2>
              <p className="text-xs opacity-60">精彩的对决</p>
            </motion.div>
          )}
        </div>

        {/* Board Container */}
        <div className="relative p-6 bg-[#DDBB88] rounded-3xl shadow-2xl border-8 border-[#8B4513]">
          <div 
            className="grid gap-0" 
            style={{ 
              gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              width: 'min(90vw, 600px)',
              height: 'min(90vw, 600px)'
            }}
          >
            {gameState?.board.map((row, ri) =>
              row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  onClick={() => handleCellClick(ri, ci)}
                  className={`relative ${myRole !== 'spectator' && gameState.currentPlayer === myRole && !gameState.winner ? 'cursor-pointer group' : 'cursor-default'}`}
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
                    {!cell && !gameState.winner && myRole === gameState.currentPlayer && (
                      <div className={`w-full h-full rounded-full opacity-0 group-hover:opacity-20 transition-opacity ${
                        myRole === 'black' ? 'bg-black' : 'bg-white border border-black'
                      }`} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
