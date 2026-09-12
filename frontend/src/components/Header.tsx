import { Menu, Settings } from "lucide-react";

export function Header({ title, badge, onMenu, onSettings }: { title: string; badge: string; onMenu: () => void; onSettings: () => void }) {
  return <header className="topbar"><div className="topbar-title"><button className="mobile-menu" onClick={onMenu}><Menu /></button><h1>{title}</h1><span>{badge}</span></div><div className="topbar-actions"><button title="设置" onClick={onSettings}><Settings /></button><div className="profile"><div className="avatar">远</div><strong>我的空间</strong></div></div></header>;
}
