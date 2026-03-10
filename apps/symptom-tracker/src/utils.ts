export const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const calculateSeverityColor = (severity: number): string => {
  if (severity <= 3) return 'green';
  if (severity <= 7) return 'orange';
  return 'red';
};