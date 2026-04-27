export interface Lesson {
  id: string;
  title: string;
  description: string;
  initialFen: string;
  targetMove?: string;
  targetMoves?: string[];
  aiResponseMove?: string;
  successMessage?: string;
}

export const LESSONS: Lesson[] = [
  {
    id: "center-control-e4",
    title: "1. Control the Center",
    description: "White moves first. Start by moving the king pawn two squares from e2 to e4. This controls the center and opens lines for the queen and bishop.",
    initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    targetMove: "e4",
    aiResponseMove: "e5",
    successMessage: "Great job. The AI answered with e5, so both sides now fight for the center.",
  },
  {
    id: "develop-knight",
    title: "2. Develop a Knight",
    description: "Knights are strongest when they move toward the center early. Move the knight from g1 to f3 to attack the center and prepare to castle.",
    initialFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
    targetMove: "Nf3",
    aiResponseMove: "Nc6",
    successMessage: "Excellent. The AI developed a knight too, which is a normal opening response.",
  },
  {
    id: "bishop-f7-pressure",
    title: "3. Aim at f7",
    description: "The f7 pawn is a common beginner target because only the black king protects it at the start. Move the bishop from f1 to c4 so it points at f7.",
    initialFen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3",
    targetMove: "Bc4",
    aiResponseMove: "Nf6",
    successMessage: "Nice. The bishop now works with the queen to pressure f7, and the AI kicked the queen with Nf6.",
  },
  {
    id: "queen-joins-attack",
    title: "4. Bring the Queen Out",
    description: "Scholar's Mate uses queen and bishop pressure together. Move the queen from d1 to h5 so she attacks f7 and watches e5.",
    initialFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    targetMove: "Qh5",
    aiResponseMove: "Nc6",
    successMessage: "Good. The AI developed Nc6, which protects the e5 pawn and keeps the game going.",
  },
  {
    id: "scholars-mate-finish",
    title: "5. Scholar's Mate",
    description: "White's queen and bishop now team up on f7. Move the queen to f7 to deliver checkmate.",
    initialFen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    targetMove: "Qxf7#",
    successMessage: "Checkmate! You win! Notice how the Black King cannot take the Queen because the White Bishop is protecting it.",
  },
  {
    id: "defend-scholars-mate",
    title: "6. Stop the Trap",
    description: "Now play Black. White is threatening Qxf7 mate. Stop the attack by playing g6 to chase the queen, or Qe7 to defend f7.",
    initialFen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
    targetMoves: ["g6", "Qe7"],
    successMessage: "Well defended. Black does not have to fall for Scholar's Mate.",
  },
  {
    id: "knight-fork",
    title: "7. Knight Fork",
    description: "A fork attacks two pieces at once. Move the knight from b5 to c7 with check, forking the king and rook.",
    initialFen: "r2qkbnr/pp1p1ppp/2n5/1N2p3/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 4",
    targetMove: "Nc7+",
    successMessage: "Strong tactic. Because it is check, Black must answer the king threat before saving the rook.",
  },
  {
    id: "castle-king-safety",
    title: "8. Castle for Safety",
    description: "After developing pieces, castle to bring the king toward safety and connect the rook. Castle kingside now.",
    initialFen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3",
    targetMove: "O-O",
    aiResponseMove: "Nf6",
    successMessage: "Good habit. The AI developed, and your king is safer after castling.",
  },
  {
    id: "win-loose-queen",
    title: "9. Capture Loose Pieces",
    description: "Loose pieces are undefended pieces you can win. The black queen is sitting on e4. Capture it with the rook.",
    initialFen: "4k3/8/8/8/4q3/8/4R3/4K3 w - - 0 1",
    targetMove: "Rxe4+",
    successMessage: "Clean capture. Winning a queen usually decides the game.",
  },
  {
    id: "back-rank-mate",
    title: "10. Back Rank Mate",
    description: "The king can get trapped behind its own pawns. Move the rook to e8 for checkmate.",
    initialFen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
    targetMove: "Re8#",
    successMessage: "Back rank mate. The rook attacks along the back rank and the king has no escape squares.",
  },
  {
    id: "queen-mate-in-one",
    title: "11. Simple Mate in One",
    description: "The queen and king can work together to trap the enemy king. Move the queen to g7 to give checkmate.",
    initialFen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    targetMove: "Qg7#",
    successMessage: "Checkmate. The queen gives check, and the white king protects the queen so the black king cannot capture it.",
  },
  {
    id: "promotion-practice",
    title: "12. Promote the Pawn",
    description: "A pawn that reaches the last rank promotes. Move the pawn from e7 to e8 and make a queen.",
    initialFen: "k7/4P3/8/8/8/8/8/4K3 w - - 0 1",
    targetMove: "e8=Q+",
    successMessage: "Promotion turns a pawn into a major threat. Choosing a queen is usually strongest.",
  },
  {
    id: "defend-check",
    title: "13. Answer Check",
    description: "Your king is in check from the rook. Move the king to g7 to escape.",
    initialFen: "7k/8/8/8/8/8/6K1/7R b - - 0 1",
    targetMove: "Kg7",
    successMessage: "Correct. When in check, the first job is to make the king safe.",
  },
  {
    id: "finish-with-rook",
    title: "14. Rook Mate",
    description: "Use the rook with king support to finish the game. Move the rook to h8 for checkmate.",
    initialFen: "7k/5K2/8/8/8/8/8/R7 w - - 0 1",
    targetMove: "Rh1#",
    successMessage: "Checkmate. The rook gives check, and your king controls the escape squares.",
  },
];
