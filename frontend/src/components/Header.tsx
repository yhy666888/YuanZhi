import { Command, Menu, Settings } from "lucide-react";

export function Header({ title, badge, onMenu, onCommand, onSettings }: { title: string; badge: string; onMenu: () => void; onCommand: () => void; onSettings: () => void }) {
  return <header className="topbar"><div className="topbar-title"><button className="mobile-menu" onClick={onMenu}><Menu /></button><h1>{title}</h1><span>{badge}</span></div><div className="topbar-actions"><button title="快捷录入 (Ctrl+K)" aria-label="快捷录入" onClick={onCommand}><Command /></button><button title="设置" onClick={onSettings}><Settings /></button><div className="profile"><div className="avatar">远</div><strong>我的空间</strong></div></div></header>;
}
