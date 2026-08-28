import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import { getSubjectProgress, completeWorksheet } from '../services/progressionService';
import type { AchievementEvent } from '../services/achievementService';
import type {
  SubjectType,
  SubjectProgress,
  WorksheetSession,
  DifficultyLevel
} from '../types';

// ============================================================================
// State Interface
// ============================================================================

export interface WorksheetState {
  /** Currently selected subject for worksheet practice */
  subject: SubjectType | null;
  /** Completed worksheet session (for results view) */
  session: WorksheetSession | null;
  /** Progress data for the current subject */
  progress: SubjectProgress | null;
  /** Whether the user leveled up after completing a worksheet */
  leveledUp: boolean;
  /** New difficulty level after leveling up */
  newDifficulty: DifficultyLevel | undefined;
  /** Stars needed to reach the next level */
  starsToNextLevel: number;
  /** Loading state for progress fetch */
  isLoadingProgress: boolean;
}

// ============================================================================
// Action Types (Discriminated Union)
// ============================================================================

export type WorksheetAction =
  | { type: 'START_WORKSHEET'; payload: { subject: SubjectType } }
  | {
      type: 'COMPLETE_WORKSHEET';
      payload: {
        session: WorksheetSession;
        leveledUp: boolean;
        newDifficulty: DifficultyLevel | undefined;
        starsToNextLevel: number;
      };
    }
  | { type: 'CANCEL_WORKSHEET' }
  | { type: 'SET_PROGRESS'; payload: { progress: SubjectProgress | null } }
  | { type: 'SET_LOADING_PROGRESS'; payload: { isLoading: boolean } }
  | { type: 'TRY_AGAIN' }
  | { type: 'RESET' };

// ============================================================================
// Initial State
// ============================================================================

const initialState: WorksheetState = {
  subject: null,
  session: null,
  progress: null,
  leveledUp: false,
  newDifficulty: undefined,
  starsToNextLevel: 0,
  isLoadingProgress: false,
};

// ============================================================================
// Reducer
// ============================================================================

function worksheetReducer(state: WorksheetState, action: WorksheetAction): WorksheetState {
  switch (action.type) {
    case 'START_WORKSHEET':
      return {
        ...state,
        subject: action.payload.subject,
        session: null,
        leveledUp: false,
        newDifficulty: undefined,
        starsToNextLevel: 0,
        isLoadingProgress: true,
      };

    case 'COMPLETE_WORKSHEET':
      return {
        ...state,
        session: action.payload.session,
        leveledUp: action.payload.leveledUp,
        newDifficulty: action.payload.newDifficulty,
        starsToNextLevel: action.payload.starsToNextLevel,
      };

    case 'CANCEL_WORKSHEET':
      return {
        ...state,
        subject: null,
        session: null,
        progress: null,
        leveledUp: false,
        newDifficulty: undefined,
        starsToNextLevel: 0,
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
        isLoadingProgress: false,
      };

    case 'SET_LOADING_PROGRESS':
      return {
        ...state,
        isLoadingProgress: action.payload.isLoading,
      };

    case 'TRY_AGAIN':
      return {
        ...state,
        session: null,
        leveledUp: false,
        newDifficulty: undefined,
        starsToNextLevel: 0,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// Hook Options
// ============================================================================

export interface UseWorksheetOptions {
  /** Callback when tokens should be awarded (stars earned from worksheet) */
  onAwardTokens?: (tokens: number) => void;
  /** Callback when an achievement event should be triggered */
  onAchievementEvent?: (event: AchievementEvent) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useWorksheet(options: UseWorksheetOptions = {}) {
  const { onAwardTokens, onAchievementEvent } = options;
  const [state, dispatch] = useReducer(worksheetReducer, initialState);

  // Load progress when subject changes
  useEffect(() => {
    let isMounted = true;

    const loadProgress = async () => {
      if (state.subject) {
        dispatch({ type: 'SET_LOADING_PROGRESS', payload: { isLoading: true } });
        try {
          const progress = await getSubjectProgress(state.subject);
          if (isMounted) {
            dispatch({ type: 'SET_PROGRESS', payload: { progress } });
          }
        } catch (error) {
          logger.error('[useWorksheet] Failed to load worksheet progress:', error);
          if (isMounted) {
            dispatch({ type: 'SET_PROGRESS', payload: { progress: null } });
          }
        }
      } else {
        dispatch({ type: 'SET_PROGRESS', payload: { progress: null } });
      }
    };

    void loadProgress();

    return () => {
      isMounted = false;
    };
  }, [state.subject]);

  // ============================================================================
  // Memoized Action Dispatchers
  // ============================================================================

  /**
   * Start a worksheet for the given subject
   */
  const startWorksheet = useCallback((subject: SubjectType) => {
    dispatch({ type: 'START_WORKSHEET', payload: { subject } });
  }, []);

  /**
   * Complete a worksheet session, process progression, and award tokens
   */
  const completeWorksheetSession = useCallback(
    async (session: WorksheetSession) => {
      try {
        const result = await completeWorksheet(session);

        dispatch({
          type: 'COMPLETE_WORKSHEET',
          payload: {
            session,
            leveledUp: result.leveledUp,
            newDifficulty: result.newDifficulty,
            starsToNextLevel: result.starsToNextLevel,
          },
        });

        const earnedTokens = session.starsEarned ?? 0;
        if (onAwardTokens && earnedTokens > 0) {
          onAwardTokens(earnedTokens);
        }

        if (onAchievementEvent) {
          onAchievementEvent({
            type: 'WORKSHEET_COMPLETED',
            payload: {
              subject: session.subject,
              score: session.score ?? 0,
              starsEarned: session.starsEarned ?? 0,
              tokensEarned: earnedTokens,
            },
          });
        }
      } catch (error) {
        logger.error('[useWorksheet] Failed to complete worksheet:', error);
      }
    },
    [onAchievementEvent, onAwardTokens]
  );

  /**
   * Cancel the current worksheet and return to subject selection
   */
  const cancelWorksheet = useCallback(() => {
    dispatch({ type: 'CANCEL_WORKSHEET' });
  }, []);

  /**
   * Try the worksheet again (keep subject, clear session)
   */
  const tryAgain = useCallback(() => {
    dispatch({ type: 'TRY_AGAIN' });
  }, []);

  /**
   * Continue to subject selection after completing a worksheet
   */
  const continueToSubjects = useCallback(() => {
    dispatch({ type: 'CANCEL_WORKSHEET' });
  }, []);

  /**
   * Reset all worksheet state
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // ============================================================================
  // Memoized Return Value
  // ============================================================================

  return useMemo(
    () => ({
      // State
      worksheetSubject: state.subject,
      worksheetSession: state.session,
      worksheetProgress: state.progress,
      worksheetLeveledUp: state.leveledUp,
      worksheetNewDifficulty: state.newDifficulty,
      worksheetStarsToNextLevel: state.starsToNextLevel,
      isLoadingProgress: state.isLoadingProgress,

      // Actions
      startWorksheet,
      completeWorksheetSession,
      cancelWorksheet,
      tryAgain,
      continueToSubjects,
      reset,
    }),
    [
      state.subject,
      state.session,
      state.progress,
      state.leveledUp,
      state.newDifficulty,
      state.starsToNextLevel,
      state.isLoadingProgress,
      startWorksheet,
      completeWorksheetSession,
      cancelWorksheet,
      tryAgain,
      continueToSubjects,
      reset,
    ]
  );
}

export default useWorksheet;
