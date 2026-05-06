import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoardSurface, type ChessBoardView } from '@vibetech/games/chess';
import { getChessAdvice } from '../lib/gemini';
import { Bot, Send, User, Loader2, PlaySquare, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'tutor';
  content: string;
}

const STARTING_FEN = new Chess().fen();

export function AITutorMode({ boardView = '2d', pieceSet }: { boardView?: ChessBoardView; pieceSet: string }) {
  const [fen, setFen] = useState(STARTING_FEN);
  const [fenInput, setFenInput] = useState(STARTING_FEN);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState<string | boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const game = useMemo(() => new Chess(fen), [fen]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat]);

  function getMoveOptions(square: string) {
    const moves = game.moves({ square: square as any, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.map((move: any) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as any) && game.get(move.to as any)?.color !== game.get(square as any)?.color
            ? 'radial-gradient(transparent 0%, transparent 60%, rgba(0,0,0,0.4) 61%, rgba(0,0,0,0.4) 80%, transparent 81%)'
            : 'radial-gradient(circle, rgba(0,0,0,.4) 22%, transparent 23%)',
        borderRadius: '50%',
      };
      return move;
    });
    newSquares[square] = {
      background: 'rgba(255, 215, 0, 0.4)',
    };
    setOptionSquares(newSquares);
    return true;
  }

  function onSquareClick(square: string) {
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    try {
      const nextGame = new Chess(fen);
      const move = nextGame.move({
        from: moveFrom,
        to: square,
        promotion: 'q',
      });
      
      if (move === null) {
         const hasMoveOptions = getMoveOptions(square);
         setMoveFrom(hasMoveOptions ? square : null);
      } else {
         setFen(nextGame.fen());
         setFenInput(nextGame.fen());
         setMoveFrom(null);
         setOptionSquares({});
      }
    } catch (e) {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : null);
    }
  }

  function onDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (isTyping) return false;
    if (!targetSquare) return false;

    setMoveFrom(null);
    setOptionSquares({});

    try {
      const nextGame = new Chess(fen);
      const move = nextGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;
      setFen(nextGame.fen());
      setFenInput(nextGame.fen());
      
      return true;
    } catch (e) {
      return false;
    }
  }

  function resetBoard() {
    setFen(STARTING_FEN);
    setFenInput(STARTING_FEN);
    setChat([]);
    setMoveFrom(null);
    setOptionSquares({});
  }

  function handleFenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFen = e.target.value;
    setFenInput(newFen);
    try {
      const newGame = new Chess(newFen);
      const normalizedFen = newGame.fen();
      setFen(normalizedFen);
      setFenInput(normalizedFen);
    } catch (err) {
      setMoveFrom(null);
      setOptionSquares({});
    }
  }

  async function handleSend() {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setChat(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping("Thinking...");

    try {
      const advice = await getChessAdvice(fen, userMessage);
      setChat(prev => [...prev, { role: 'tutor', content: advice }]);
    } catch (e) {
      setChat(prev => [...prev, { role: 'tutor', content: 'Oops! I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleQuickAction(action: 'evaluate' | 'suggest') {
    if (isTyping) return;
    
    const question = action === 'evaluate' 
      ? "Can you evaluate the current position? Who is better and why?"
      : "What is the best move in this position and why?";
      
    setInput(question);
    
    // We can simulate an instant send rather than just populating input
    setChat(prev => [...prev, { role: 'user', content: question }]);
    setIsTyping(action === 'evaluate' ? "Evaluating position..." : "Calculating best lines...");
    
    try {
      const advice = await getChessAdvice(fen, question);
      setChat(prev => [...prev, { role: 'tutor', content: advice }]);
    } catch (e) {
      setChat(prev => [...prev, { role: 'tutor', content: 'Oops! I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="relative z-30 mx-auto flex min-h-[calc(100dvh-12rem)] max-w-7xl flex-col gap-5 p-3 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500 md:p-8 xl:h-[calc(100vh-4rem)] xl:flex-row xl:gap-8 xl:pb-8">
      {/* Board Column */}
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4 xl:flex-1 xl:gap-6">
        <div className="flex justify-between items-center px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Piece Set:</span>
           <span className="text-xs font-bold text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-lg uppercase tracking-wider">{pieceSet}</span>
        </div>
        <div className="flex flex-col justify-center rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-md md:rounded-3xl md:p-6 xl:flex-1" style={{ touchAction: 'none' }}>
          <ChessBoardSurface
            boardKey={`${pieceSet}-ai-tutor`}
            boardView={boardView}
            fen={fen}
            optionSquares={optionSquares}
            pieceSet={pieceSet}
            selectedSquare={moveFrom}
            onPieceDrag={({ square }) => {
              if (!square) return;
              getMoveOptions(square);
              setMoveFrom(square);
            }}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md bg-white/5 px-6 py-4 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
            <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border ${
              game.turn() === 'w' 
                ? 'bg-[#f0d9b5] text-slate-900 border-[#b58863]/50' 
                : 'bg-[#1e293b] text-[#f0d9b5] border-[#b58863]/50'
            }`}>
               <span className="text-xs font-bold uppercase tracking-wider">
                 {game.turn() === 'w' ? "♙ White's Move" : "♟ Black's Move"}
               </span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
              <span className="font-mono text-[10px] text-slate-500 font-bold tracking-widest uppercase hidden sm:inline-block">FEN:</span>
              <input 
                type="text" 
                value={fenInput} 
                onChange={handleFenChange}
                className="bg-black/20 border border-white/5 text-slate-300 text-xs font-mono px-2 py-1 rounded w-full max-w-[200px] outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-colors"
                title="Paste FEN to set up a custom position"
              />
            </div>
          </div>
           <button 
             onClick={resetBoard}
             className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-colors shrink-0"
           >
             <RefreshCcw size={16} /> Reset
           </button>
        </div>
      </div>

      {/* Chat Column */}
      <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl md:rounded-3xl xl:h-auto">
        <div className="bg-white/5 border-b border-white/10 p-4 flex items-center justify-between shadow-sm z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Bot size={24} className="text-indigo-400" />
            <h2 className="font-bold text-lg text-white">AI Tutor</h2>
          </div>
          <div className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-500/20">
            Gemini Powered
          </div>
        </div>

        {/* Chat Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-transparent">
          {chat.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <Bot size={48} className="text-slate-500 mb-4 opacity-50" />
              <p className="text-lg font-bold text-slate-300 mb-2">I'm your AI Chess Tutor</p>
              <p className="max-w-xs text-sm text-slate-400 font-medium">
                Make a move on the board, and ask me to evaluate the position or suggest a move!
              </p>
            </div>
          ) : (
            chat.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300' : 'bg-white/10 border border-white/20 text-white'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[85%] px-5 py-4 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600/80 backdrop-blur-md text-white rounded-2xl rounded-tr-none shadow-lg border border-indigo-500/50' 
                    : 'backdrop-blur-md bg-white/5 border border-white/10 text-slate-200 rounded-2xl rounded-tl-none shadow-lg prose prose-sm prose-invert prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10'
                }`}>
                  {msg.role === 'tutor' ? (
                     <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                     <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-none px-5 py-4 shadow-lg flex items-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin text-indigo-400" />
                <span className="text-sm font-medium">{typeof isTyping === 'string' ? isTyping : "Thinking..."}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 backdrop-blur-md border-t border-white/10">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => handleQuickAction('evaluate')}
              disabled={Boolean(isTyping)}
              className="whitespace-nowrap flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
            >
              {isTyping === "Evaluating position..." && <Loader2 size={14} className="animate-spin" />}
              Evaluate Position
            </button>
            <button 
              onClick={() => handleQuickAction('suggest')}
              disabled={Boolean(isTyping)}
              className="whitespace-nowrap flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
            >
              {isTyping === "Calculating best lines..." && <Loader2 size={14} className="animate-spin" />}
              Suggest Best Move
            </button>
          </div>


          <div className="relative flex items-center">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about the position..."
              disabled={Boolean(isTyping)}
              className="w-full pl-4 pr-12 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all disabled:opacity-50 placeholder-slate-500 font-medium text-white"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || Boolean(isTyping)}
              aria-label="Send message"
              className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700/50 text-white rounded-lg transition-colors border border-indigo-500/50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
