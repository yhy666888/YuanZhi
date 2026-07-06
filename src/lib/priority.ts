export const PRIORITY_LABELS = ["低", "普通", "高", "紧急"] as const;

/** 待办项左侧色条（按重要程度区分） */
export function priorityBorder(p: number): string {
  switch (p) {
    case 3:
      return "border-l-red-500";
    case 2:
      return "border-l-orange-500";
    case 1:
      return "border-l-primary";
    default:
      return "border-l-gray-400";
  }
}

/** 优先级圆点颜色 */
export function priorityDot(p: number): string {
  switch (p) {
    case 3:
      return "bg-red-500";
    case 2:
      return "bg-orange-500";
    case 1:
      return "bg-primary";
    default:
      return "bg-gray-400";
  }
}
