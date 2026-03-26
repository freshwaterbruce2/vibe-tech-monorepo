import { ArrowLeft, ArrowRight, CheckCircle, Trophy, XCircle } from 'lucide-react';
import { useState } from 'react';
import { generateWorksheet } from '../../services/worksheetGenerator';
import type {
  DifficultyLevel,
  SubjectType,
  WorksheetQuestion,
  WorksheetSession,
} from '../../types';

interface WorksheetViewProps {
  subject: SubjectType;
  difficulty: DifficultyLevel;
  onComplete: (session: WorksheetSession) => void;
  onCancel: () => void;
}

const WorksheetView = ({ subject, difficulty, onComplete, onCancel }: WorksheetViewProps) => {
  const [questions] = useState<WorksheetQuestion[]>(() => generateWorksheet(subject, difficulty));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | number | null)[]>(() =>
    new Array(questions.length).fill(null),
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState<number>(() => Date.now());

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Handle answer selection
  const handleAnswerSelect = (answer: string | number) => {
    if (showFeedback) return; // Don't allow changing answer after submitting
    setSelectedAnswer(answer);
  };

  // Submit current answer
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    // Case-insensitive comparison for fill-blank text answers
    const correct =
      currentQuestion!.type === 'fill-blank'
        ? String(selectedAnswer).trim().toLowerCase() ===
          String(currentQuestion!.correctAnswer).trim().toLowerCase()
        : selectedAnswer === currentQuestion!.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Save answer
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);
  };

  // Go to next question
  const handleNextQuestion = () => {
    if (isLastQuestion) {
      // Complete worksheet
      completeWorksheet();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(answers[currentQuestionIndex + 1] ?? null);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  };

  // Go to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setSelectedAnswer(answers[currentQuestionIndex - 1] ?? null);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  };

  // Complete the worksheet
  const completeWorksheet = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000); // seconds

    // Calculate score
    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (answer === questions[index]!.correctAnswer) {
        correctCount = correctCount + 1;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Calculate stars
    let starsEarned = 0;
    if (score >= 90) starsEarned = 5;
    else if (score >= 80) starsEarned = 4;
    else if (score >= 70) starsEarned = 3;
    else if (score >= 60) starsEarned = 2;
    else if (score >= 50) starsEarned = 1;

    const session: WorksheetSession = {
      id: `worksheet_${Date.now()}`,
      subject,
      difficulty,
      questions,
      answers,
      score,
      starsEarned,
      completedAt: Date.now(),
      timeSpent,
    };

    onComplete(session);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading quest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-32 md:pb-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
              {subject} Quest
            </h1>
            <p className="text-text-secondary text-sm md:text-base">{difficulty} Level</p>
          </div>
          <button
            onClick={onCancel}
            className="glass-card px-4 py-2 rounded-xl hover:scale-105 transition-all text-sm"
          >
            Cancel
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-3 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6 md:p-8 rounded-2xl border-2 border-[var(--glass-border)] mb-6">
          {/* Question Number */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {currentQuestionIndex + 1}
            </div>
            <div className="text-xs text-text-secondary">
              {currentQuestion!.type.replace('-', ' ')}
            </div>
          </div>

          {/* Question Text */}
          <h2 className="text-xl md:text-2xl font-semibold mb-6 text-text-primary">
            {currentQuestion!.question}
          </h2>

          {/* Multiple Choice Options */}
          {currentQuestion!.type === 'multiple-choice' && currentQuestion!.options && (
            <div className="space-y-3">
              {currentQuestion!.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === currentQuestion!.correctAnswer;
                const showAsCorrect = showFeedback && isCorrectAnswer;
                const showAsWrong = showFeedback && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                      showAsCorrect
                        ? 'border-fuchsia-500 bg-fuchsia-500/20'
                        : showAsWrong
                          ? 'border-red-500 bg-red-500/20'
                          : isSelected
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-[var(--glass-border)] hover:border-purple-500/50 hover:bg-white/5'
                    } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-102'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-base md:text-lg">{option}</span>
                      </span>
                      {showAsCorrect && <CheckCircle className="text-fuchsia-500" size={24} />}
                      {showAsWrong && <XCircle className="text-red-500" size={24} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* True/False Options */}
          {currentQuestion!.type === 'true-false' && currentQuestion!.options && (
            <div className="flex gap-4 justify-center">
              {currentQuestion!.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === currentQuestion!.correctAnswer;
                const showAsCorrect = showFeedback && isCorrectAnswer;
                const showAsWrong = showFeedback && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`flex-1 max-w-[200px] p-6 rounded-xl border-2 text-center text-xl font-bold transition-all duration-300 ${
                      showAsCorrect
                        ? 'border-fuchsia-500 bg-fuchsia-500/20'
                        : showAsWrong
                          ? 'border-red-500 bg-red-500/20'
                          : isSelected
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-[var(--glass-border)] hover:border-purple-500/50 hover:bg-white/5'
                    } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{option}</span>
                      {showAsCorrect && <CheckCircle className="text-fuchsia-500" size={24} />}
                      {showAsWrong && <XCircle className="text-red-500" size={24} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Fill-in-the-Blank Input */}
          {currentQuestion!.type === 'fill-blank' && (
            <div>
              <input
                type="text"
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={(e) => handleAnswerSelect(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    selectedAnswer !== null &&
                    String(selectedAnswer).trim() &&
                    !showFeedback
                  ) {
                    handleSubmitAnswer();
                  }
                }}
                disabled={showFeedback}
                placeholder="Type your answer..."
                autoComplete="off"
                className={`w-full px-6 py-4 bg-white/5 border-2 rounded-xl text-white text-center text-2xl placeholder-gray-500 focus:outline-none transition-all ${
                  showFeedback && isCorrect
                    ? 'border-fuchsia-500 bg-fuchsia-500/10'
                    : showFeedback && !isCorrect
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-[var(--glass-border)] focus:border-purple-500'
                }`}
              />
              {showFeedback && !isCorrect && (
                <p className="text-center text-sm text-gray-400 mt-2">
                  Correct answer:{' '}
                  <span className="text-fuchsia-400 font-bold">
                    {String(currentQuestion!.correctAnswer)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Feedback Section */}
          {showFeedback && (
            <div
              className={`mt-6 p-4 rounded-xl ${isCorrect ? 'bg-fuchsia-500/10 border-2 border-fuchsia-500' : 'bg-red-500/10 border-2 border-red-500'}`}
            >
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle className="text-fuchsia-500 flex-shrink-0" size={24} />
                ) : (
                  <XCircle className="text-red-500 flex-shrink-0" size={24} />
                )}
                <div>
                  <p className={`font-bold mb-1 ${isCorrect ? 'text-fuchsia-400' : 'text-red-400'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  {currentQuestion!.explanation && (
                    <p className="text-sm text-text-secondary">{currentQuestion!.explanation}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="glass-card px-6 py-3 rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span>Previous</span>
          </button>

          {!showFeedback ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              className="glass-button px-8 py-3 rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="glass-button px-8 py-3 rounded-xl hover:scale-105 transition-all font-semibold flex items-center gap-2"
            >
              <span>{isLastQuestion ? 'Finish Quest' : 'Next Question'}</span>
              {isLastQuestion ? <Trophy size={20} /> : <ArrowRight size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorksheetView;
