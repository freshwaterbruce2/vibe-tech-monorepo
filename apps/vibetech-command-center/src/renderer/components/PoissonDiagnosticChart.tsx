import React, { useMemo } from 'react';
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts';

interface PoissonDiagnosticChartProps {
  lambda: number; // Expected baseline hourly error rate
  k: number;      // Observed errors in the post-deployment window
  historicalData: { hour: string; errors: number }[]; // Time-series data
}

// External knowledge: standard Poisson cumulative probability formula
const calculatePoissonPValue = (lambda: number, k: number): number => {
  let cumulativeProbability = 0;
  for (let i = 0; i < k; i++) {
    cumulativeProbability += (Math.pow(Math.E, -lambda) * Math.pow(lambda, i)) / factorial(i);
  }
  return 1 - cumulativeProbability; // P(X >= k)
};

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

export const PoissonDiagnosticChart: React.FC<PoissonDiagnosticChartProps> = ({ lambda, k, historicalData }) => {
  // Calculate the p-value on the fly
  const pValue = useMemo(() => calculatePoissonPValue(lambda, k), [lambda, k]);
  
  // A p-value < 0.05 indicates a statistically significant regression
  const isRegression = pValue < 0.05;

  return (
    <div className="flex flex-col p-4 bg-bg-panel border border-bg-line rounded-lg shadow-sm font-mono text-xs">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Live Error Rate Diagnostics</h3>
          <p className="text-xs text-slate-400 mt-1">Baseline (λ): {lambda.toFixed(2)}/hr | Observed (k): {k}</p>
        </div>
        <div className="text-right">
          <span className={`text-xl font-bold ${isRegression ? 'text-status-error' : 'text-status-ok'}`}>
            p = {pValue.toFixed(4)}
          </span>
          <p className="text-xs text-slate-400 mt-1">
            {isRegression ? 'Regression Detected' : 'Within Normal Variance'}
          </p>
        </div>
      </div>

      <div className="h-24 w-full bg-black/10 rounded-md border border-bg-line/50 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData}>
            <YAxis domain={[0, 'dataMax + 2']} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e1e24', border: '1px solid #2e2e38', borderRadius: '4px' }}
              itemStyle={{ color: '#F3F4F6' }}
            />
            <Line 
              type="monotone" 
              dataKey="errors" 
              stroke={isRegression ? '#F43F5E' : '#10B981'} 
              strokeWidth={2} 
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
