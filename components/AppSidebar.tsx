"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Cpu,
  Brain,
  Shield,
  Terminal,
  ChevronDown,
  House,
  ChartColumn,
  Dock,
  Server,
  CircuitBoard,
  Cloud,
  Check,
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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePathname } from "next/navigation";
import { useFleet } from "@/hooks/useFleet";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// Admin navigation
const adminMainItems = [
  { title: "Command Console", url: "/dashboard", icon: LayoutDashboard },
  { title: "Historical Data", url: "/analytics", icon: ChartColumn },
];

const adminSystemItems = [
  { title: "Jarvis Chat", url: "/chat", icon: MessageCircle },
  { title: "Inference Engine", url: "/inference", icon: Brain },
  { title: "Network & Ports", url: "/network", icon: Shield },
  { title: "Home Devices", url: "/devices", icon: House },
  { title: "Energy Management", url: "/energy", icon: Zap },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Terminal", url: "/terminal", icon: Terminal },
  { title: "Server Logs", url: "/logs", icon: ScrollText },
];

const adminConfigItems = [
  { title: "User Management", url: "/users", icon: Users },
  { title: "Server Settings", url: "/settings", icon: Settings },
  { title: "Preferences", url: "/preferences", icon: SlidersHorizontal },
];

// Family member navigation (perm = required permission, undefined = always visible)
const memberItems = [
  { title: "Home", url: "/home", icon: Home, perm: undefined },
  { title: "Updates", url: "/home/announcements", icon: Megaphone, perm: undefined },
  { title: "Jarvis Chat", url: "/chat", icon: MessageCircle, perm: undefined },
  {
    title: "Smart Home",
    url: "/home/devices",
    icon: Lightbulb,
    perm: "smart_device:view",
  },
  { title: "Energy", url: "/home/energy", icon: Zap, perm: undefined },
  { title: "Network", url: "/home/network", icon: Wifi, perm: "network:view" },
  {
    title: "Media & Files",
    url: "/home/media",
    icon: Film,
    perm: "media:view",
  },
];

const memberConfigItems = [
  { title: "My Profile", url: "/profile", icon: User },
  { title: "Preferences", url: "/preferences", icon: SlidersHorizontal },
];

const nodeIcons: Record<string, typeof Cpu> = {
  macbook: Cpu,
  "raspberry-pi": CircuitBoard,
  "cloud-vps": Cloud,
  server: Server,
};

const nodeStatusColors: Record<string, string> = {
  online: "bg-cyan",
  degraded: "bg-volcano",
  offline: "bg-crimson",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = state === "collapsed";
  const currentPath = usePathname();
  const { activeNode, nodes, setActiveNodeId } = useFleet();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = effectiveRole === "administrator";
  const isGuest = effectiveRole === "guest";
  const canViewUsers = hasPermission("user:view");
  const isActive = (path: string) => currentPath === path;
  const ActiveNodeIcon = nodeIcons[activeNode?.type || "server"];
  const onlineCount = nodes.filter((n) => n.status === "online").length;

  const renderNavGroup = (
    label: string,
    items: { title: string; url: string; icon: typeof Cpu }[],
  ) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                  href={item.url}
                  className={cn(
                    "peer/menu-button flex h-8 w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm transition-colors outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    isActive(item.url)
                      ? "bg-sidebar-accent text-primary font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="group peer text-sidebar-foreground md:block"
    >
      <SidebarHeader
        className={cn(
          `flex flex-row gap-3 p-0 my-2 justify-center items-center`,
          !collapsed && "p-3! justify-start",
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          {isAdmin ? (
            <Dock className="h-5 w-5 text-primary" />
          ) : (
            <Home className="h-5 w-5 text-primary" />
          )}
        </div>
        {!collapsed && (
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-foreground tracking-tight">
              {isAdmin ? "Sovereign Fleet" : "Home Hub"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              {isAdmin ? "v3.0 Command" : "Welcome Home"}
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="pb-12">
        {isAdmin ? (
          <>
            {/* Fleet Nodes Dropdown — Admin only */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Fleets
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "w-full rounded-lg transition-all duration-200 active:scale-[0.97] flex items-center justify-center",
                          collapsed
                            ? "p-2"
                            : "p-2.5 gap-2.5 glass-card node-card-active",
                        )}
                        type="button"
                      >
                        <div className="relative shrink-0">
                          <ActiveNodeIcon
                            className={cn(
                              "h-4 w-4 text-primary",
                              collapsed && "h-5 w-5",
                            )}
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${nodeStatusColors[activeNode.status]} ${activeNode.status === "online" ? "pulse-dot" : ""}`}
                          />
                        </div>
                        {!collapsed && activeNode && (
                          <>
                            <div className="flex-1 text-left min-w-0">
                              <div className="text-xs font-medium truncate text-foreground">
                                {activeNode.name}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground truncate">
                                {activeNode.tailscaleIp}
                              </div>
                            </div>
                            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                          </>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side={isMobile ? "bottom" : "right"}
                      align={isMobile ? "center" : "start"}
                      className="w-[240px] sm:w-56 bg-background/60 backdrop-blur-xl border-white/5 shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-2 md:slide-in-from-left-2"
                      sideOffset={8}
                      collisionPadding={16}
                    >
                      {nodes.map((node) => {
                        const Icon = nodeIcons[node.type] || Server;
                        const isSelected = node.id === activeNode.id;
                        return (
                          <DropdownMenuItem
                            key={node.id}
                            onClick={() => setActiveNodeId(node.id)}
                            className="cursor-pointer flex items-center gap-2.5 py-2"
                          >
                            <div className="relative shrink-0">
                              <Icon
                                className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${nodeStatusColors[node.status]} ${node.status === "online" ? "pulse-dot" : ""}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-xs font-medium truncate ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                              >
                                {node.name}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground truncate">
                                {node.tailscaleIp}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {renderNavGroup("Overview", adminMainItems)}
            {renderNavGroup("Systems", adminSystemItems)}
            {renderNavGroup("Configuration", adminConfigItems)}
          </>
        ) : (
          <>
            {renderNavGroup(
              "Home",
              memberItems.filter((i) => !i.perm || hasPermission(i.perm)),
            )}
            {renderNavGroup("Account", [
              ...memberConfigItems,
              ...(canViewUsers
                ? [{ title: "User Management", url: "/users", icon: Users }]
                : []),
            ])}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2 p-3">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2 border border-glass-border">
            {isAdmin ? (
              <>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Fleet:{" "}
                  <span className="text-cyan">
                    {onlineCount}/{nodes.length} Online
                  </span>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Uptime: 14d 02h 31m
                </p>
              </>
            ) : (
              <p className="text-[10px] font-mono text-muted-foreground">
                Network:{" "}
                <span className="text-emerald">All systems normal</span>
              </p>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
