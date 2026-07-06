export interface NoteColor {
  value: string;
  label: string;
  bg: string;
  bgDark: string;
  border: string;
}

export const NOTE_COLORS: NoteColor[] = [
  { value: "white", label: "白", bg: "bg-white", bgDark: "dark:bg-gray-900/80", border: "border-gray-200" },
  { value: "yellow", label: "黄", bg: "bg-yellow-100", bgDark: "dark:bg-yellow-900/40", border: "border-yellow-200" },
  { value: "green", label: "绿", bg: "bg-green-100", bgDark: "dark:bg-green-900/40", border: "border-green-200" },
  { value: "blue", label: "蓝", bg: "bg-blue-100", bgDark: "dark:bg-blue-900/40", border: "border-blue-200" },
  { value: "pink", label: "粉", bg: "bg-pink-100", bgDark: "dark:bg-pink-900/40", border: "border-pink-200" },
  { value: "purple", label: "紫", bg: "bg-purple-100", bgDark: "dark:bg-purple-900/40", border: "border-purple-200" },
  { value: "orange", label: "橙", bg: "bg-orange-100", bgDark: "dark:bg-orange-900/40", border: "border-orange-200" },
  { value: "gray", label: "灰", bg: "bg-gray-100", bgDark: "dark:bg-gray-800/60", border: "border-gray-200" },
];

export function getColorClasses(color: string): string {
  const c = NOTE_COLORS.find((n) => n.value === color);
  if (!c) return NOTE_COLORS[0].bg + " " + NOTE_COLORS[0].bgDark;
  return `${c.bg} ${c.bgDark}`;
}

export function getBorderColor(color: string): string {
  const c = NOTE_COLORS.find((n) => n.value === color);
  return c?.border ?? NOTE_COLORS[0].border;
}
