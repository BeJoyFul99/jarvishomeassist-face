import {
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Brain,
  Shield,
  Terminal,
  House,
  ChartColumn,
  Home,
  Lightbulb,
  Wifi,
  Film,
  Zap,
  User,
  Users,
  ScrollText,
  MessageCircle,
  Megaphone,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Required permission; undefined = always visible */
  perm?: string;
}

// Admin navigation
export const adminMainItems: NavItem[] = [
  { title: "Command Console", url: "/dashboard", icon: LayoutDashboard },
  { title: "Historical Data", url: "/analytics", icon: ChartColumn },
];

export const adminSystemItems: NavItem[] = [
  { title: "Jarvis Chat", url: "/chat", icon: MessageCircle },
  { title: "Inference Engine", url: "/inference", icon: Brain },
  { title: "Network & Ports", url: "/network", icon: Shield },
  { title: "Home Devices", url: "/devices", icon: House },
  { title: "Energy Management", url: "/energy", icon: Zap },
  { title: "Utilities", url: "/utilities", icon: Receipt },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Terminal", url: "/terminal", icon: Terminal },
  { title: "Server Logs", url: "/logs", icon: ScrollText },
];

export const adminConfigItems: NavItem[] = [
  { title: "User Management", url: "/users", icon: Users },
  { title: "Server Settings", url: "/settings", icon: Settings },
  { title: "Preferences", url: "/preferences", icon: SlidersHorizontal },
];

// Family member navigation
export const memberItems: NavItem[] = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Updates", url: "/home/announcements", icon: Megaphone },
  { title: "Jarvis Chat", url: "/chat", icon: MessageCircle },
  { title: "Smart Home", url: "/home/devices", icon: Lightbulb, perm: "smart_device:view" },
  { title: "Energy", url: "/home/energy", icon: Zap },
  { title: "Utilities", url: "/home/utilities", icon: Receipt },
  { title: "Network", url: "/home/network", icon: Wifi, perm: "network:view" },
  { title: "Media & Files", url: "/home/media", icon: Film, perm: "media:view" },
];

export const memberConfigItems: NavItem[] = [
  { title: "My Profile", url: "/profile", icon: User },
  { title: "Preferences", url: "/preferences", icon: SlidersHorizontal },
];

export const userManagementItem: NavItem = {
  title: "User Management",
  url: "/users",
  icon: Users,
};
