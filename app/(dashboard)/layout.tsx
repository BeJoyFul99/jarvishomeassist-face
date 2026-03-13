"use client";

import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { Bell, Wifi, Shield, Cpu, HardDrive, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { useFleet, FleetProvider } from "@/hooks/useFleet";

function getSignalQuality(dbm: number) {
  if (dbm > -40) return { label: "Ultra Stable", color: "text-cyan" };
  if (dbm > -50) return { label: "Excellent", color: "text-emerald" };
  if (dbm > -60) return { label: "Good", color: "text-emerald" };
  if (dbm > -70) return { label: "Fair", color: "text-amber" };
  return { label: "Weak", color: "text-crimson" };
}

const DashboardInner = ({ children }: { children: React.ReactNode }) => {
  const { activeNode, aggregated } = useFleet();
  const signal = getSignalQuality(activeNode.network.wifiSignal);
  const alertActive = activeNode.cpu.temp > 90;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Global Fleet Ticker */}
      <div className="h-7 bg-card/80 border-b border-border overflow-hidden flex items-center shrink-0 z-50">
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
                  {aggregated.totalRam} GB
                </span>
              </span>
              <span className="text-border">│</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                <HardDrive className="w-3 h-3 text-amber" />
                TOTAL STORAGE:{" "}
                <span className="text-foreground">
                  {aggregated.totalStorage} GB
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
                ACTIVE: <span className="text-cyan">{activeNode.name}</span> ·{" "}
                {activeNode.tailscaleIp}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <AppSidebar />

        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-12 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
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
                    {activeNode.cpu.model.split(" ").slice(0, 3).join(" ")}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-lg transition-colors relative ${
                  alertActive
                    ? "text-volcano"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                title="Alerts"
              >
                <Bell className="w-4 h-4" />
                {alertActive && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-volcano pulse-dot" />
                )}
              </motion.button>
              <UserProfileDropdown />
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-background/30 px-4 pt-6 pb-8">
            {children}
          </div>
        </SidebarInset>
      </div>
    </div>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FleetProvider>
      <SidebarProvider>
        <DashboardInner>{children}</DashboardInner>
      </SidebarProvider>
    </FleetProvider>
  );
}
