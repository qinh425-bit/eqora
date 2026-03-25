export function formatCategory(category: string) {
  const map: Record<string, string> = {
    workplace: "职场",
    family: "亲戚",
    social: "社交",
    relationship: "关系"
  };

  return map[category] || category;
}

export function formatDifficulty(level: string) {
  const map: Record<string, string> = {
    easy: "入门",
    medium: "进阶",
    hard: "高压"
  };

  return map[level] || level;
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
