import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  isMobile: boolean;
  state: "expanded" | "collapsed";
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  toggleSidebar: () => void;
  initialize: () => void;
}

const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// Helper to get cookie value
const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
};

// Helper to set cookie
const setCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
};

export const useSidebarStore = create<SidebarState>((set, get) => ({
  isOpen: true,
  isMobile: false,
  state: "expanded",
  setOpen: (open: boolean) => {
    set({ isOpen: open, state: open ? "expanded" : "collapsed" });
    setCookie(SIDEBAR_COOKIE_NAME, String(open));
  },
  setOpenMobile: (open: boolean) => set({ isOpen: open }),
  setIsMobile: (isMobile: boolean) => set({ isMobile }),
  toggleSidebar: () => {
    const { isOpen, isMobile } = get();
    const nextOpen = !isOpen;
    if (isMobile) {
      set({ isOpen: nextOpen });
    } else {
      set({ isOpen: nextOpen, state: nextOpen ? "expanded" : "collapsed" });
      setCookie(SIDEBAR_COOKIE_NAME, String(nextOpen));
    }
  },
  initialize: () => {
    const { isMobile } = get();
    // On mobile, always start closed (sidebar is a sheet overlay)
    if (isMobile) {
      set({ isOpen: false });
      return;
    }
    const cookieValue = getCookie(SIDEBAR_COOKIE_NAME);
    if (cookieValue !== null) {
      const open = cookieValue !== "false";
      set({ isOpen: open, state: open ? "expanded" : "collapsed" });
    }
  },
}));
