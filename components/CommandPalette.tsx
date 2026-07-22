"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuthStore } from "@/store/useAuthStore";
import {
  adminMainItems,
  adminSystemItems,
  adminConfigItems,
  memberItems,
  memberConfigItems,
  toolsItems,
  userManagementItem,
  type NavItem,
} from "@/lib/navigation";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const effectiveRole = useAuthStore((s) => s.effectiveRole());
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = effectiveRole === "administrator";
  const canViewUsers = hasPermission("user:view");

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  const groups: { label: string; items: NavItem[] }[] = isAdmin
    ? [
        { label: "Overview", items: adminMainItems },
        { label: "Systems", items: adminSystemItems },
        { label: "Tools", items: toolsItems },
        { label: "Configuration", items: adminConfigItems },
      ]
    : [
        {
          label: "Home",
          items: memberItems.filter((i) => !i.perm || hasPermission(i.perm)),
        },
        ...(effectiveRole !== "guest"
          ? [{ label: "Tools", items: toolsItems }]
          : []),
        {
          label: "Account",
          items: [
            ...memberConfigItems,
            ...(canViewUsers ? [userManagementItem] : []),
          ],
        },
      ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden md:inline text-xs">Search…</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Go to page…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map((group, gi) => (
            <React.Fragment key={group.label}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.url}
                    value={`${group.label} ${item.title}`}
                    onSelect={() => navigate(item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
