"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  Cpu,
  Brain,
  Shield,
  Terminal,
  ChevronDown,
  House,
  ChartColumn,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePathname } from "next/navigation";
import { useFleet } from "@/hooks/useFleet";
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

const mainItems = [
  { title: "Command Console", url: "/dashboard", icon: LayoutDashboard },
  { title: "Historical Data", url: "/analytics", icon: ChartColumn },
];

const systemItems = [
  { title: "Inference Engine", url: "/inference", icon: Brain },
  { title: "Network & Ports", url: "/network", icon: Shield },
  { title: "Home Devices", url: "/devices", icon: House },
  { title: "Terminal", url: "/terminal", icon: Terminal },
];

const configItems = [{ title: "Settings", url: "/settings", icon: Settings }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = usePathname();
  const { activeNode, nodes } = useFleet();
  const isActive = (path: string) => currentPath === path;

  // Calculate stats for footer
  const onlineCount = nodes.filter((n) => n.status === "online").length;
  const totalCount = nodes.length;

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="group peer text-sidebar-foreground md:block"
    >
      <SidebarHeader className="flex flex-col gap-2 p-4 items-center justify-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 glow-blue">
          <Cpu className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-foreground tracking-tight">
              Sovereign Fleet
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              v3.0 Command
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="pb-12">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-1">
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
                  <Cpu
                    className={cn(
                      "h-4 w-4 text-primary",
                      collapsed && "h-5 w-5",
                    )}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan pulse-dot" />
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
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      href={item.url}
                      className={cn(
                        "flex h-8 w-full items-center gap-3 rounded-lg px-2 text-sm transition-all duration-200 outline-none",
                        isActive(item.url)
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive(item.url) && "glow-blue",
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Systems
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2 p-3"></SidebarFooter>
    </Sidebar>
  );
}
