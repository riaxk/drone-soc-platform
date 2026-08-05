"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Upload, Activity, Brain, Search,
  Bell, FileText, ScrollText, Settings, LogOut, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken, getUser } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/datasets", label: "Datasets", icon: Upload },
  { href: "/analysis", label: "Traffic Analysis", icon: Activity },
  { href: "/ml-detection", label: "ML Detection", icon: Brain },
  { href: "/forensics", label: "Forensics", icon: Search },
  { href: "/alerts", label: "Alert Center", icon: Bell },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/logs", label: "Activity Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-40">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Drone SOC</h1>
            <p className="text-xs text-muted">Attack Detection System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              pathname === href
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        {user && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <Badge variant="primary" className="mt-1 capitalize">Administrator</Badge>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted hover:text-critical hover:bg-critical/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
