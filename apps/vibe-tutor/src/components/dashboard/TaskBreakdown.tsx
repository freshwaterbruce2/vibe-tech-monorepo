import React, { useState, useEffect } from 'react';
import { breakDownTask } from '../../services/breakdownService';
import { LightningIcon } from '../ui/icons/LightningIcon';

interface TaskBreakdownProps {
  taskTitle: string;
  subject: string;
}

const TaskBreakdown = ({ taskTitle, subject }: TaskBreakdownProps) => {
  const [steps, setSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSteps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await breakDownTask(taskTitle, subject);
        if (result.length > 0) {
          setSteps(result);
        } else {
          setError("Could not break down this task. Please try another one.");
        }
      } catch {
        setError("An error occurred while communicating with the AI.");
      } finally {
        setIsLoading(false);
      }
    };
    void getSteps();
  }, [taskTitle, subject]);

  return (
    <div className="mt-6 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="mb-4">
        <p className="text-sm font-bold uppercase text-slate-400">Assignment</p>
        <h3 className="text-lg font-semibold text-text-primary">{taskTitle}</h3>
        <p className="text-sm text-text-secondary">{subject}</p>
      </div>

      <hr className="border-slate-700 my-4" />

      {isLoading && (
        <div className="flex items-center justify-center p-8">
            <LightningIcon className="w-6 h-6 mr-3 text-[var(--secondary-accent)] animate-pulse" />
            <p className="text-text-secondary">AI is generating steps...</p>
        </div>
      )}
      
      {error && <p className="text-[var(--error-accent)]">{error}</p>}
      
      {!isLoading && !error && (
        <ul className="space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--secondary-accent)] text-background-main font-bold text-sm mr-4 mt-0.5 flex-shrink-0">{index + 1}</span>
              <p className="text-text-primary">{step}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskBreakdown;
