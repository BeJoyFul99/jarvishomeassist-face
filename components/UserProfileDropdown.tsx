"use client";

import { motion } from "framer-motion";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield } from "lucide-react";

const UserProfileDropdown = () => {
  const router = useRouter();

  const handleLogout = () => {
    // In a real app, clear auth state here
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-secondary/50 p-1.5 rounded-lg transition-colors outline-none border-none">
          <Avatar className="h-8 w-8 ring-1 ring-border">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-foreground">Jarvis Admin</p>
            <p className="text-[10px] text-muted-foreground">admin@homelab</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 glass-card-hover border-border"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Jarvis Admin</p>
            <p className="text-xs leading-none text-muted-foreground">
              admin@homelab.local
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
        <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-primary/10">
          <Shield className="h-4 w-4" />
          <span>Security</span>
        </DropdownMenuItem>
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
