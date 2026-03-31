"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/store/useSidebarStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/useMobile";
import { AppSidebar } from "@/components/AppSidebar";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import NotificationCenter from "@/components/NotificationCenter";
import { Wifi, Shield, Cpu, HardDrive, Brain } from "lucide-react";
import { useFleet } from "@/hooks/useFleet";

import { useFleetNotifications } from "@/hooks/useFleetNotifications";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthInterceptor } from "@/hooks/useAuthInterceptor";
import { useRouteGuard } from "@/components/RouteGuard";
import { useUserEvents } from "@/hooks/useUserEvents";
import { formatStorage } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

function getSignalQuality(dbm: number) {
  if (dbm > -40) return { label: "Ultra Stable", color: "text-cyan" };
  if (dbm > -50) return { label: "Excellent", color: "text-emerald" };
  if (dbm > -60) return { label: "Good", color: "text-emerald" };
  if (dbm > -70) return { label: "Fair", color: "text-amber" };
  return { label: "Weak", color: "text-crimson" };
}

const DashboardInner = ({ children }: { children: React.ReactNode }) => {
  const { activeNode, aggregated } = useFleet();
  const { setIsMobile, initialize } = useSidebarStore();
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const isChat = pathname === "/chat";
  useFleetNotifications();
  useNotificationSocket();
  useRouteGuard();
  useUserEvents();
  useAuthInterceptor();

  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Fetch persisted notifications on mount
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const isAdmin = effectiveRole === "administrator";

  const signal = getSignalQuality(activeNode.network.wifiSignal);

  // Wait for Zustand to rehydrate from localStorage before redirecting
  React.useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  React.useEffect(() => {
    setIsMobile(isMobile);
    initialize();
  }, [isMobile, setIsMobile, initialize]);

  // Show nothing until hydration is complete — prevents login flash
  if (!_hasHydrated || !isAuthenticated) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="group/sidebar-wrapper flex h-svh w-full has-[data-variant=inset]:bg-sidebar overflow-hidden">
        <div className="h-full flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Global Fleet Ticker — Admin only */}
            {isAdmin && (
              <div className={`h-7 bg-card/80 border-b border-border overflow-hidden flex items-center shrink-0 ${isChat ? "md:flex hidden" : ""}`}>
                <div className="flex items-center gap-6 px-4 ticker-scroll whitespace-nowrap">
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex items-center gap-6">
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                        <Cpu className="w-3 h-3 text-cyan" />
                        NODES:{" "}
                        <span className="text-cyan">
                          {aggregated.onlineNodes}/{aggregated.totalNodes}
                        </span>
                      </span>
                      <span className="text-border">│</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                        <HardDrive className="w-3 h-3 text-primary" />
                        TOTAL RAM:{" "}
                        <span className="text-foreground">
                          {formatStorage(aggregated.totalRam)}
                        </span>
                      </span>
                      <span className="text-border">│</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                        <HardDrive className="w-3 h-3 text-amber" />
                        TOTAL STORAGE:{" "}
                        <span className="text-foreground">
                          {formatStorage(aggregated.totalStorage)}
                        </span>
                      </span>
                      <span className="text-border">│</span>
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                        <Brain className="w-3 h-3 text-magenta" />
                        AI INSTANCES:{" "}
                        <span
                          className={
                            aggregated.activeAiInstances > 0
                              ? "text-magenta"
                              : "text-muted-foreground"
                          }
                        >
                          {aggregated.activeAiInstances}
                        </span>
                      </span>
                      <span className="text-border">│</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        ACTIVE:{" "}
                        <span className="text-cyan">{activeNode.name}</span> ·{" "}
                        {activeNode.tailscaleIp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Bar — hidden on mobile when in chat */}
            <header className={`h-12 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-md sticky top-0 z-30 ${isChat ? "md:flex hidden" : ""}`}>
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                {/* Technical signal/network info — Admin only */}
                {isAdmin && (
                  <div className="hidden sm:flex items-center gap-3 ml-2">
                    <div className="flex items-center gap-1.5">
                      <Wifi className={`w-3.5 h-3.5 ${signal.color}`} />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {Math.round(activeNode.network.wifiSignal)} dBm
                      </span>
                      <span
                        className={`status-badge text-[10px] bg-secondary ${signal.color}`}
                      >
                        {signal.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald" />
                      <span className="status-badge text-[10px] bg-emerald/10 text-emerald">
                        Tailscale
                      </span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {activeNode.name} ·{" "}
                      <span className="text-primary">
                        {activeNode.cpu.model
                          .split(" ")
                          .slice(0, 3)
                          .join(" ")}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <NotificationCenter />
                <UserProfileDropdown />
              </div>
            </header>

            {/* Page Content */}
            <main className={`flex-1 overflow-hidden bg-background/30 ${isChat ? "p-0" : "overflow-y-auto px-4 pt-4 pb-8"}`}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardInner>{children}</DashboardInner>;
}
