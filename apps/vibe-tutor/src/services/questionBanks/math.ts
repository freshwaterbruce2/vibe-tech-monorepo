/**
 * Math Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const MATH_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'math-b-1', subject: 'Math', difficulty: 'Beginner', question: 'What is 2 + 2?', correctAnswer: '4', type: 'fill-blank' },
    { id: 'math-b-2', subject: 'Math', difficulty: 'Beginner', question: 'What is 5 - 3?', correctAnswer: '2', type: 'fill-blank' },
    { id: 'math-b-3', subject: 'Math', difficulty: 'Beginner', question: 'What is 3 × 2?', correctAnswer: '6', type: 'fill-blank' },
    { id: 'math-b-4', subject: 'Math', difficulty: 'Beginner', question: 'What is 10 + 5?', correctAnswer: '15', type: 'fill-blank' },
    { id: 'math-b-5', subject: 'Math', difficulty: 'Beginner', question: 'What is half of 10?', correctAnswer: '5', type: 'fill-blank' },
    { id: 'math-b-6', subject: 'Math', difficulty: 'Beginner', question: 'What is 8 - 4?', correctAnswer: '4', type: 'fill-blank' },
    { id: 'math-b-7', subject: 'Math', difficulty: 'Beginner', question: 'Is 15 an even or odd number?', correctAnswer: 1, options: ['Even', 'Odd'], type: 'multiple-choice' },
    { id: 'math-b-8', subject: 'Math', difficulty: 'Beginner', question: 'How many sides does a triangle have?', correctAnswer: '3', type: 'fill-blank' },
    { id: 'math-b-9', subject: 'Math', difficulty: 'Beginner', question: 'What is 4 × 4?', correctAnswer: '16', type: 'fill-blank' },
    { id: 'math-b-10', subject: 'Math', difficulty: 'Beginner', question: 'What is 20 - 10?', correctAnswer: '10', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'math-i-1', subject: 'Math', difficulty: 'Intermediate', question: 'What is 12 × 11?', correctAnswer: '132', type: 'fill-blank' },
    { id: 'math-i-2', subject: 'Math', difficulty: 'Intermediate', question: 'What is 144 ÷ 12?', correctAnswer: '12', type: 'fill-blank' },
    { id: 'math-i-3', subject: 'Math', difficulty: 'Intermediate', question: 'What is the square root of 64?', correctAnswer: '8', type: 'fill-blank' },
    { id: 'math-i-4', subject: 'Math', difficulty: 'Intermediate', question: 'What is 15% of 100?', correctAnswer: '15', type: 'fill-blank' },
    { id: 'math-i-5', subject: 'Math', difficulty: 'Intermediate', question: 'Solve for x: x - 7 = 10', correctAnswer: '17', type: 'fill-blank' },
    { id: 'math-i-6', subject: 'Math', difficulty: 'Intermediate', question: 'What is 5 cubed (5³)?', correctAnswer: '125', type: 'fill-blank' },
    { id: 'math-i-7', subject: 'Math', difficulty: 'Intermediate', question: 'A rectangle has length 4 and width 5. What is its area?', correctAnswer: '20', type: 'fill-blank' },
    { id: 'math-i-8', subject: 'Math', difficulty: 'Intermediate', question: 'What is 0.5 expressed as a fraction?', correctAnswer: 1, options: ['1/4', '1/2', '3/4', '1/3'], type: 'multiple-choice' },
    { id: 'math-i-9', subject: 'Math', difficulty: 'Intermediate', question: 'What is the perimeter of a square with side length 6?', correctAnswer: '24', type: 'fill-blank' },
    { id: 'math-i-10', subject: 'Math', difficulty: 'Intermediate', question: 'If you buy an item for $15 and hand the cashier $20, what is your change?', correctAnswer: '5', type: 'fill-blank' },
  ],
  Advanced: [
    { id: 'math-a-1', subject: 'Math', difficulty: 'Advanced', question: 'Solve: 2x + 5 = 15. What is x?', correctAnswer: '5', type: 'fill-blank' },
    { id: 'math-a-2', subject: 'Math', difficulty: 'Advanced', question: 'What is the absolute value of -42?', correctAnswer: '42', type: 'fill-blank' },
    { id: 'math-a-3', subject: 'Math', difficulty: 'Advanced', question: 'Factor x² - 9 into two binomials.', correctAnswer: 0, options: ['(x-3)(x+3)', '(x-9)(x+1)', '(x-3)(x-3)', '(x+3)(x+3)'], type: 'multiple-choice' },
    { id: 'math-a-4', subject: 'Math', difficulty: 'Advanced', question: 'Calculate the hypotenuse of a right triangle with legs 3 and 4.', correctAnswer: '5', type: 'fill-blank' },
    { id: 'math-a-5', subject: 'Math', difficulty: 'Advanced', question: 'What is the value of Pi to two decimal places?', correctAnswer: '3.14', type: 'fill-blank' },
    { id: 'math-a-6', subject: 'Math', difficulty: 'Advanced', question: 'Simplify: 2(3x - 4) + 5', correctAnswer: 2, options: ['6x - 1', '6x + 1', '6x - 3', '5x + 1'], type: 'multiple-choice' },
    { id: 'math-a-7', subject: 'Math', difficulty: 'Advanced', question: 'What is 2 to the power of 8?', correctAnswer: '256', type: 'fill-blank' },
    { id: 'math-a-8', subject: 'Math', difficulty: 'Advanced', question: 'Solve for y: 3y - 9 = 0', correctAnswer: '3', type: 'fill-blank' },
    { id: 'math-a-9', subject: 'Math', difficulty: 'Advanced', question: 'What is the slope of the line y = 4x - 2?', correctAnswer: '4', type: 'fill-blank' },
    { id: 'math-a-10', subject: 'Math', difficulty: 'Advanced', question: 'What is the y-intercept of the line y = -2x + 7?', correctAnswer: '7', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'math-e-1', subject: 'Math', difficulty: 'Expert', question: 'What is the derivative of x²?', correctAnswer: '2x', type: 'fill-blank' },
    { id: 'math-e-2', subject: 'Math', difficulty: 'Expert', question: 'Solve the system: x + y = 10, x - y = 4. What is x?', correctAnswer: '7', type: 'fill-blank' },
    { id: 'math-e-3', subject: 'Math', difficulty: 'Expert', question: 'What is the log base 10 of 1000?', correctAnswer: '3', type: 'fill-blank' },
    { id: 'math-e-4', subject: 'Math', difficulty: 'Expert', question: 'What is the value of sin(90°)?', correctAnswer: '1', type: 'fill-blank' },
    { id: 'math-e-5', subject: 'Math', difficulty: 'Expert', question: 'Are parallel lines always equidistant?', correctAnswer: 0, options: ['Yes', 'No'], type: 'true-false' },
    { id: 'math-e-6', subject: 'Math', difficulty: 'Expert', question: 'What is the sum of the interior angles of a pentagon?', correctAnswer: '540', type: 'fill-blank' },
    { id: 'math-e-7', subject: 'Math', difficulty: 'Expert', question: 'What is the determinant of a 2x2 matrix with rows [2, 1] and [3, 4]?', correctAnswer: '5', type: 'fill-blank' },
    { id: 'math-e-8', subject: 'Math', difficulty: 'Expert', question: 'What is the next prime number after 31?', correctAnswer: '37', type: 'fill-blank' },
    { id: 'math-e-9', subject: 'Math', difficulty: 'Expert', question: 'Evaluate: 5!', correctAnswer: '120', type: 'fill-blank' },
    { id: 'math-e-10', subject: 'Math', difficulty: 'Expert', question: 'What is the formula for the volume of a sphere?', correctAnswer: 2, options: ['πr²', '2πr', '4/3πr³', '1/3πr²h'], type: 'multiple-choice' },
  ],
  Master: [
    { id: 'math-m-1', subject: 'Math', difficulty: 'Master', question: 'Integrate: ∫x² dx', correctAnswer: 0, options: ['x³/3 + C', '2x + C', 'x²/2 + C', 'x³ + C'], type: 'multiple-choice' },
    { id: 'math-m-2', subject: 'Math', difficulty: 'Master', question: 'What is Euler\'s identity?', correctAnswer: 1, options: ['e^x = 0', 'e^(iπ) + 1 = 0', 'a² + b² = c²', 'F = ma'], type: 'multiple-choice' },
    { id: 'math-m-3', subject: 'Math', difficulty: 'Master', question: 'Which set of numbers is larger: Integers (Z) or Reals (R)?', correctAnswer: 1, options: ['Integers', 'Reals', 'They are the same size'], type: 'multiple-choice' },
    { id: 'math-m-4', subject: 'Math', difficulty: 'Master', question: 'What is the derivative of sin(x)?', correctAnswer: 'cos(x)', type: 'fill-blank' },
    { id: 'math-m-5', subject: 'Math', difficulty: 'Master', question: 'Evaluate the limit as x approaches 0 of sin(x)/x.', correctAnswer: '1', type: 'fill-blank' },
    { id: 'math-m-6', subject: 'Math', difficulty: 'Master', question: 'What is the integral of 1/x dx?', correctAnswer: 3, options: ['-1/x²', 'x', 'e^x + C', 'ln|x| + C'], type: 'multiple-choice' },
    { id: 'math-m-7', subject: 'Math', difficulty: 'Master', question: 'What does the Riemann Hypothesis relate to?', correctAnswer: 0, options: ['Prime numbers', 'Geometry', 'Calculus', 'Probability'], type: 'multiple-choice' },
    { id: 'math-m-8', subject: 'Math', difficulty: 'Master', question: 'In linear algebra, what is the trace of a matrix?', correctAnswer: 2, options: ['Sum of all elements', 'Product of elements', 'Sum of main diagonal elements', 'The determinant'], type: 'multiple-choice' },
    { id: 'math-m-9', subject: 'Math', difficulty: 'Master', question: 'What is the second derivative of position with respect to time?', correctAnswer: 'acceleration', type: 'fill-blank' },
    { id: 'math-m-10', subject: 'Math', difficulty: 'Master', question: 'What is the base of the natural logarithm (e) to two decimal places?', correctAnswer: '2.72', type: 'fill-blank' },
  ],
} as const;
