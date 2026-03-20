"use client";

import { User, LogOut, Settings, ChevronDown, Home, Shield, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UserProfileDropdown = () => {
  const router = useRouter();
  const { user, logout, viewingAsFamily, setViewingAsFamily } = useAuthStore();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const isAdmin = user?.role === "administrator";
  const displayName = user?.displayName || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const toggleHomeView = () => {
    if (viewingAsFamily) {
      setViewingAsFamily(false);
      router.push("/dashboard");
    } else {
      setViewingAsFamily(true);
      router.push("/home");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-secondary/50 p-1.5 rounded-lg transition-colors outline-none border-none">
          <Avatar className="h-8 w-8 ring-1 ring-border">
            <AvatarImage src="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-foreground">{displayName}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {effectiveRole === "administrator"
                ? "root@homelab"
                : "family member"}
            </p>
          </div>
          <ChevronDown className="hidden md:block h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 glass-card-hover border-border"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || "user@homelab.local"}
            </p>
            <p className="text-[10px] leading-none text-muted-foreground font-mono mt-1">
              Role: {user?.role === "administrator" ? "Administrator" : "Family Member"}
              {viewingAsFamily && " (previewing Home)"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-primary/10">
          <User className="h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 focus:bg-primary/10"
          onClick={() => router.push("/settings")}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-primary/10">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="cursor-pointer gap-2 focus:bg-primary/10"
              onClick={toggleHomeView}
            >
              {viewingAsFamily ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  <span>Exit Home View</span>
                </>
              ) : (
                <>
                  <Home className="h-4 w-4" />
                  <span>Home View</span>
                </>
              )}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-crimson focus:bg-crimson/10 focus:text-crimson"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDropdown;
