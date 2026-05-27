import { cn } from "@vibetech/ui";

export { cn };

// Walmart brand colors
export const colors = {
  walmartBlue: "#0071DC",
  walmartBlueLight: "#0085EF",
  walmartBlueDark: "#004C93",
  walmartYellow: "#FFC220",
  walmartGray: "#4A4A4A",
  walmartLightGray: "#F2F2F2",
  success: "#2ECC71",
  warning: "#F39C12",
  error: "#E74C3C",
  info: "#3498DB",
};

// Time formatting utilities
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "00:00:00";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [hrs, mins, secs]
    .map((val) => val.toString().padStart(2, "0"))
    .join(":");
};

export const formatHHMMSS = (seconds: number): string => {
  if (isNaN(seconds)) return "00:00:00";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const formatMMSS = (seconds: number): string => {
  if (isNaN(seconds)) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Date formatting utilities
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDatetime = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getTimeDifference = (start: Date, end: Date): number => {
  return Math.floor((end.getTime() - start.getTime()) / 1000);
};

export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "just now";

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 30) return `${daysAgo}d ago`;

  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) return `${monthsAgo}mo ago`;

  const yearsAgo = Math.floor(monthsAgo / 12);
  return `${yearsAgo}y ago`;
};

// Theme settings
export const themeColors = {
  light: {
    background: "#FFFFFF",
    foreground: "#1A1A1A",
    primary: colors.walmartBlue,
    secondary: colors.walmartYellow,
    muted: colors.walmartLightGray,
    border: "#E5E5E5",
  },
  dark: {
    background: "#1A1A1A",
    foreground: "#F5F5F5",
    primary: colors.walmartBlueLight,
    secondary: colors.walmartYellow,
    muted: "#2D2D2D",
    border: "#3E3E3E",
  },
};
