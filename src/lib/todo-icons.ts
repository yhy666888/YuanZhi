import {
  Briefcase,
  BookOpen,
  Dumbbell,
  HeartPulse,
  Home,
  Plane,
  ShoppingCart,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface TodoIcon {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const TODO_ICONS: TodoIcon[] = [
  { value: "work", label: "工作", icon: Briefcase },
  { value: "life", label: "生活", icon: Home },
  { value: "study", label: "学习", icon: BookOpen },
  { value: "health", label: "健康", icon: HeartPulse },
  { value: "shop", label: "购物", icon: ShoppingCart },
  { value: "money", label: "财务", icon: Wallet },
  { value: "social", label: "社交", icon: Users },
  { value: "travel", label: "旅行", icon: Plane },
  { value: "sport", label: "运动", icon: Dumbbell },
  { value: "other", label: "其他", icon: Tag },
];

export function getTodoIcon(value: string | null): LucideIcon {
  return TODO_ICONS.find((i) => i.value === value)?.icon ?? Tag;
}

export function getTodoIconLabel(value: string | null): string {
  return TODO_ICONS.find((i) => i.value === value)?.label ?? "其他";
}
