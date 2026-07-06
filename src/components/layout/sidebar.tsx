import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Check,
  GripVertical,
  Home,
  ListTodo,
  Settings,
  StickyNote,
  Timer,
  Wallet,
  Compass,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNavStore, type NavKey } from "@/store/nav";

interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_MAP: Record<NavKey, NavItemDef> = {
  home: { to: "/", label: "首页", icon: Home, end: true },
  pomodoro: { to: "/pomodoro", label: "番茄钟", icon: Timer },
  todolist: { to: "/todolist", label: "待办", icon: ListTodo },
  memo: { to: "/memo", label: "便签", icon: StickyNote },
  account: { to: "/account", label: "记账本", icon: Wallet },
  plan: { to: "/plan", label: "计划", icon: CalendarDays },
  settings: { to: "/settings", label: "设置", icon: Settings },
};

export function Sidebar() {
  const order = useNavStore((s) => s.order);
  const reorder = useNavStore((s) => s.reorder);
  const [editing, setEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as NavKey);
    const newIndex = order.indexOf(over.id as NavKey);
    reorder(oldIndex, newIndex);
  }

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r bg-card md:w-56">
      <div className="flex h-14 items-center gap-2 border-b px-3 md:px-4">
        <Compass className="h-6 w-6 text-primary" />
        <span className="hidden text-lg font-semibold md:inline">远至</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {editing ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={order as (string | NavKey)[]}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {order.map((key) => (
                  <SortableNav key={key} navKey={key} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-1">
            {order.map((key) => {
              const item = NAV_MAP[key];
              if (!item) return null;
              const Icon = item.icon;
              return (
                <NavLink
                  key={key}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "justify-center md:justify-start",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      <div className="flex items-center justify-center border-t p-2 md:justify-end md:px-3">
        <button
          onClick={() => setEditing(!editing)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
            editing
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          title={editing ? "完成排序" : "拖动排序"}
        >
          {editing ? <Check className="h-5 w-5" /> : <GripVertical className="h-5 w-5" />}
        </button>
        {!editing && <ThemeToggle />}
      </div>
    </aside>
  );
}

function SortableNav({ navKey }: { navKey: NavKey }) {
  const item = NAV_MAP[navKey];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: navKey });

  if (!item) return null;
  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
      }}
      className={cn(
        "flex items-center gap-3 rounded-md border border-dashed border-primary/30 bg-card px-3 py-2 text-sm font-medium",
        "cursor-grab touch-none",
        isDragging && "border-primary shadow-lg opacity-80",
        "justify-center md:justify-start"
      )}
      {...attributes}
      {...listeners}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <span className="hidden flex-1 md:inline">{item.label}</span>
      <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 md:block" />
    </div>
  );
}
