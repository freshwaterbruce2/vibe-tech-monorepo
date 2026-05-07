declare module 'sudoku-umd' {
  export function generate(difficulty?: string): string;
  export function solve(board: string): string;
}
