import { Chess } from "chess.js";

const apiBaseUrl = (import.meta.env.VITE_CHESS_API_URL || "").replace(/\/$/, "");

export async function getChessAdvice(fen: string, question: string = "What is the best move here and why?"): Promise<string> {
  if (!apiBaseUrl) {
    return "AI tutor server is not configured. Set VITE_CHESS_API_URL before building the app.";
  }

  let legalMoves = "";
  try {
    legalMoves = new Chess(fen).moves().join(", ");
  } catch (error) {
    return "This board position is invalid, so I cannot analyze it yet.";
  }
  
  try {
    const response = await fetch(`${apiBaseUrl}/api/chess/advice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fen, question, legalMoves }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return data?.error || "Sorry, the chess tutor server could not analyze this position.";
    }

    return data?.advice || "I couldn't generate advice for this position.";
  } catch (error) {
    console.error("Chess tutor API error:", error);
    return "Sorry, I could not reach the chess tutor server.";
  }
}
