export const shortHex = (v?: string, head = 6, tail = 4) =>
  !v ? "" : v.length <= head + tail + 2 ? v : `${v.slice(0, head)}…${v.slice(-tail)}`;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(totalSeconds?: number) {
  if (!totalSeconds || totalSeconds < 0) return "";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function timeAgo(date: Date, now = new Date()) {
  const s = Math.round((now.getTime() - date.getTime()) / 1000);
  if (s < 45) return "just now";
  const table: [number, string][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
    [604800, "week"],
    [2629800, "month"],
    [31557600, "year"],
  ];
  let unit = "minute";
  let size = 60;
  for (const [sec, name] of table) if (s >= sec) [size, unit] = [sec, name];
  const v = Math.max(1, Math.floor(s / size));
  return `${v} ${unit}${v === 1 ? "" : "s"} ago`;
}

export const formatUtc = (d: Date) => d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
