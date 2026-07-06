import { Construction } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  desc: string;
}

export function ModulePlaceholder({ title, desc }: ModulePlaceholderProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-4">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Construction className="h-10 w-10" />
        <p className="text-sm">{desc}</p>
      </div>
    </div>
  );
}
