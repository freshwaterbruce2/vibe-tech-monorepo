export interface Puzzle {
  id: string;
  title: string;
  theme: string;
  prompt: string;
  initialFen: string;
  targetMove: string;
  successMessage: string;
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'mate-back-rank',
    title: 'Back Rank Mate',
    theme: 'Checkmate',
    prompt: 'Black has no escape squares. Find mate in one.',
    initialFen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
    targetMove: 'Re8#',
    successMessage: 'Back rank mate. The rook controls the whole back rank.',
  },
  {
    id: 'queen-king-mate',
    title: 'Queen Support',
    theme: 'Checkmate',
    prompt: 'Use the queen with king support to finish the game.',
    initialFen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1',
    targetMove: 'Qg7#',
    successMessage: 'The queen gives check and the king protects her.',
  },
  {
    id: 'knight-fork-king-rook',
    title: 'Knight Fork',
    theme: 'Tactic',
    prompt: 'Find the knight move that checks the king and attacks the rook.',
    initialFen: 'r2qkbnr/pp1p1ppp/2n5/1N2p3/4P3/8/PPPP1PPP/R1BQKBNR w KQkq - 0 4',
    targetMove: 'Nc7+',
    successMessage: 'The check forces Black to answer before saving the rook.',
  },
  {
    id: 'capture-queen',
    title: 'Loose Queen',
    theme: 'Material',
    prompt: 'The queen is undefended. Win it.',
    initialFen: '4k3/8/8/8/4q3/8/4R3/4K3 w - - 0 1',
    targetMove: 'Rxe4+',
    successMessage: 'Winning a queen is a decisive material gain.',
  },
  {
    id: 'promote-queen',
    title: 'Promotion',
    theme: 'Endgame',
    prompt: 'Promote the pawn to a queen.',
    initialFen: 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1',
    targetMove: 'e8=Q+',
    successMessage: 'Promotion turns a pawn into a winning force.',
  },
  {
    id: 'escape-check',
    title: 'Escape Check',
    theme: 'Defense',
    prompt: 'Your king is in check. Move to safety.',
    initialFen: '7k/8/8/8/8/8/6K1/7R b - - 0 1',
    targetMove: 'Kg7',
    successMessage: 'Good defense. Always answer check first.',
  },
];
