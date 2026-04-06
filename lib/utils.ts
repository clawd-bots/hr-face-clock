export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function calculateHours(clockIn: string, clockOut: string | null): number | null {
  if (!clockOut) return null;
  const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return diff / (1000 * 60 * 60);
}

export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
