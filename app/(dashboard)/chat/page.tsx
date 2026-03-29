"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Brain,
  Send,
  Loader2,
  Users,
  Bot,
  Reply,
  X,
  Plus,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  ArrowDown,
  Menu,
  User,
  Box,
  Pencil,
  Trash2,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebar } from "@/components/ui/sidebar";
import {
  useChatStore,
  type ChatMessage,
  type ChatRoom,
} from "@/store/useChatStore";
import { useChatSocket } from "@/hooks/useChatSocket";
import { toast } from "sonner";

const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL || "";

function resolveMediaUrl(url: string | null): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${MEDIA_BASE_URL}${url}`;
}

// ── Animations ───────────────────────────────────────────────

const fadeSlideUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

// ── Main Page ────────────────────────────────────────────────

export default function ChatPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const {
    rooms,
    activeRoomId,
    messages,
    typingUsers,
    aiStatus,
    streamingContent,
    setActiveRoom,
    setRooms,
    setMessages,
    addMessage,
    updateMessage,
    decrementUnread,
    setLoading,
    loading,
  } = useChatStore();
  const { sendTyping } = useChatSocket();
  const { toggleSidebar } = useSidebar();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showRoomsMobile, setShowRoomsMobile] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<"direct_ai" | "group" | "DM">(
    "direct_ai",
  );
  const [isMobile, setIsMobile] = useState(false);
  const [membersList, setMembersList] = useState<
    Array<{
      id: number;
      email: string;
      display_name: string;
      is_online?: boolean;
    }>
  >([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showMembersMobile, setShowMembersMobile] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const forceScrollRef = useRef(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const selectedIsOwn = selectedMsg
    ? selectedMsg.sender_id !== null && selectedMsg.sender?.email === user?.email
    : false;

  const handleCopyMsg = useCallback(() => {
    if (!selectedMsg) return;
    navigator.clipboard.writeText(selectedMsg.content);
    toast.success("Copied to clipboard");
    setSelectedMsg(null);
  }, [selectedMsg]);

  const handleEditMsg = useCallback(() => {
    if (!selectedMsg) return;
    setEditingMsgId(selectedMsg.id);
    setSelectedMsg(null);
  }, [selectedMsg]);

  const handleEditSave = useCallback(async (msgId: number, roomId: number, newContent: string) => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages/${msgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        editMessage(roomId, updated);
      } else {
        toast.error("Failed to edit message");
      }
    } catch {
      toast.error("Failed to edit message");
    }
    setEditingMsgId(null);
  }, [token, editMessage]);

  const handleDeleteMsg = useCallback(async () => {
    if (!selectedMsg) return;
    const { id, room_id } = selectedMsg;
    setSelectedMsg(null);
    try {
      const res = await fetch(`/api/chat/rooms/${room_id}/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        deleteMessage(room_id, id);
      } else {
        toast.error("Failed to delete message");
      }
    } catch {
      toast.error("Failed to delete message");
    }
  }, [selectedMsg, token, deleteMessage]);

  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === activeRoomId);
  }, [rooms, activeRoomId]);

  // ── Mention candidates ─────────────────────────────────

  const mentionCandidates = useMemo(() => {
    // Always include Jarvis as a mentionable at the top, exclude self
    const allMentionable = [
      ...membersList.filter((m) => m.id === 999),
      ...membersList.filter((m) => m.email !== user?.email && m.id !== 999),
    ];
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return allMentionable.filter(
      (m) =>
        m.display_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [mentionQuery, membersList, user?.email]);

  // Reset mention index when candidates change
  useEffect(() => {
    setMentionIndex(0);
  }, [mentionCandidates.length]);

  const insertMention = useCallback(
    (name: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart;
      const textBefore = input.slice(0, cursorPos);
      const textAfter = input.slice(cursorPos);
      // Find the @ that triggered this mention
      const atIdx = textBefore.lastIndexOf("@");
      if (atIdx === -1) return;
      const newText = textBefore.slice(0, atIdx) + `@${name} ` + textAfter;
      setInput(newText);
      setMentionQuery(null);
      // Restore cursor position after React re-render
      const newCursorPos = atIdx + name.length + 2; // @name + space
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [input],
  );

  // Fetch all chat users once (used for mentions, members panel, and create modal)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/chat/users", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setMembersList(data || []);
        }
      } catch {
        // silent
      }
    };
    fetchUsers();
  }, [authHeaders]);

  // ── Load rooms ───────────────────────────────────────────

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await fetch("/api/chat/rooms", { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
          const currentActive = useChatStore.getState().activeRoomId;
          if (data.length > 0 && !currentActive) {
            setActiveRoom(data[0].id);
          }
        }
      } catch {
        // silent
      }
    };
    loadRooms();
  }, [authHeaders, setRooms, setActiveRoom]);
  // ── Auto-scroll ──────────────────────────────────────────

  const activeMessages = useMemo(
    () => (activeRoomId ? messages[activeRoomId] || [] : []),
    [activeRoomId, messages],
  );
  const activeStreaming = activeRoomId
    ? streamingContent[activeRoomId]
    : undefined;
  const activeAiStatus = activeRoomId ? aiStatus[activeRoomId] : undefined;
  const activeTyping = activeRoomId ? typingUsers[activeRoomId] || [] : [];

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior,
    });
  }, []);
  // ── Load messages when room changes ──────────────────────

  useEffect(() => {
    if (!activeRoomId) return;
    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/chat/rooms/${activeRoomId}/messages?limit=100`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(activeRoomId, data);
        }
      } catch {
        // silent
      } finally {
        forceScrollRef.current = true;
        setLoading(false);
      }
    };
    loadMessages();
    decrementUnread(activeRoomId);
  }, [
    activeRoomId,
    authHeaders,
    setMessages,
    decrementUnread,
    setLoading,
    scrollToBottom,
  ]);

  // Auto-scroll on new messages (only if already near bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (forceScrollRef.current && !loading) {
      setTimeout(() => {
        scrollToBottom("auto");
      }, 20); // allow layout flush
      forceScrollRef.current = false;
      return;
    }

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Auto-scroll if user is within 300px of bottom
    if (distFromBottom < 300) {
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 20);
    }
  }, [activeMessages.length, activeStreaming, loading, scrollToBottom]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 300);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeRoomId]);

  // Clear selection when switching rooms
  useEffect(() => {
    setSelectedMsg(null);
    setEditingMsgId(null);
  }, [activeRoomId]);

  // ── Mark as seen ─────────────────────────────────────────

  const lastRealMsgId = useMemo(() => {
    let latestId = 0;
    let latestTime = 0;
    for (const msg of activeMessages) {
      if (msg.id > 0) {
        const time = new Date(msg.created_at).getTime();
        if (time > latestTime) {
          latestTime = time;
          latestId = msg.id;
        }
      }
    }
    return latestId;
  }, [activeMessages]);

  useEffect(() => {
    if (!activeRoomId || !lastRealMsgId) return;
    fetch(`/api/chat/rooms/${activeRoomId}/seen`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ last_read: lastRealMsgId }),
    }).catch(() => {});
  }, [activeRoomId, lastRealMsgId, authHeaders]);

  const roomMembers = useMemo(() => {
    if (!activeRoom) return [];

    // The main Family Chat typically includes everyone on the server
    if (activeRoom.name === "Family Chat" && activeRoom.type === "group") {
      return membersList;
    }

    const memberIds = new Set<number>();

    // Always include the room owner
    if (activeRoom.owner_id) memberIds.add(activeRoom.owner_id);

    // Direct AI rooms naturally include the AI
    if (activeRoom.type === "direct_ai") {
      memberIds.add(999); // AI ID
    }

    // Add specifically tagged participants
    if (activeRoom.participants) {
      activeRoom.participants.forEach((p) => memberIds.add(p.id));
    }

    // Safety fallback: if we have zero participants somehow, just return the global list
    if (memberIds.size === 0) return membersList;

    return membersList.filter((m) => memberIds.has(m.id));
  }, [activeRoom, membersList]);

  // ── Send message ─────────────────────────────────────────

  // Counter for optimistic temp IDs (negative to avoid colliding with real IDs)
  const tempIdRef = useRef(-1);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || !activeRoomId || sendingRef.current)
      return;

    sendingRef.current = true;
    setSending(true);
    sendTyping(false);

    const content = input.trim() || (imageFile ? "\ud83d\udcf7" : "");
    const currentReplyTo = replyTo;

    // Create optimistic message
    const tempId = tempIdRef.current--;
    const optimistic: ChatMessage = {
      id: tempId,
      room_id: activeRoomId,
      thread_id: null,
      sender_id: null, // Deduplication relies on email matching from WS
      sender: user as any,
      role: "user",
      status: "sending",
      content,
      type: imageFile ? "image" : "text",
      media_url: imagePreview,
      reply_to_id: currentReplyTo?.id || null,
      reply_to: currentReplyTo,
      created_at: new Date().toISOString(),
    };

    // Show immediately
    addMessage(optimistic);
    setInput("");
    setReplyTo(null);
    resetTextarea();

    // Auto-scroll so the user immediately sees the message they just sent
    setTimeout(() => scrollToBottom("smooth"), 50);
    const prevImageFile = imageFile;
    if (imageFile) {
      setImageFile(null);
      setImagePreview(null);
    }

    try {
      let res: Response;
      if (prevImageFile) {
        const formData = new FormData();
        formData.append("content", content);
        formData.append("type", "image");
        formData.append("media", prevImageFile);
        if (currentReplyTo?.id)
          formData.append("reply_to_id", currentReplyTo.id.toString());
        res = await fetch(`/api/chat/rooms/${activeRoomId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        res = await fetch(`/api/chat/rooms/${activeRoomId}/messages`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            content,
            type: "text",
            reply_to_id: currentReplyTo?.id || null,
          }),
        });
      }

      if (res.ok) {
        const msg = await res.json();
        if (currentReplyTo && !msg.reply_to) msg.reply_to = currentReplyTo;
        // Replace optimistic with real message
        updateMessage(activeRoomId, tempId, msg);
      } else {
        // Mark as failed
        updateMessage(activeRoomId, tempId, {
          ...optimistic,
          status: "failed",
        });
      }
    } catch {
      updateMessage(activeRoomId, tempId, { ...optimistic, status: "failed" });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    sendTyping(val.length > 0);

    // Detect @mention query
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Scroll to replied message ────────────────────────────

  const scrollToMessage = useCallback((msgId: number) => {
    const el = scrollRef.current?.querySelector(`[data-msg-id="${msgId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Flash highlight
    el.classList.add("msg-highlight");
    setTimeout(() => el.classList.remove("msg-highlight"), 1500);
  }, []);

  // ── Typing status ───────────────────────────────────────

  const typingText = (() => {
    const parts: string[] = [];
    if (activeAiStatus === "thinking") parts.push("Jarvis is thinking");
    else if (activeAiStatus === "responding") parts.push("Jarvis is typing");
    for (const name of activeTyping) {
      if (name !== "Jarvis") parts.push(`${name} is typing`);
    }
    return parts.length > 0 ? parts.join(", ") + "..." : null;
  })();

  // ── Create room ─────────────────────────────────────────

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch(`/api/chat/rooms`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: newRoomName.trim(),
          type: newRoomType,
          participants: selectedMembers,
        }),
      });
      if (res.ok) {
        const room = await res.json();
        setRooms([room, ...rooms]);
        setActiveRoom(room.id);
        setShowCreateModal(false);
        setNewRoomName("");
        setSelectedMembers([]);
        toast.success("Chat created successfully");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // silent
      toast.error(err);
    }
  };

  // ── Responsive ──────────────────────────────────────────

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowRoomsMobile(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Date separators ─────────────────────────────────────

  const messagesWithDates = useMemo(() => {
    const sortedMessages = [...activeMessages].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const result: Array<
      { type: "date"; label: string } | { type: "msg"; msg: ChatMessage }
    > = [];
    let lastDate = "";
    for (const msg of sortedMessages) {
      const d = new Date(msg.created_at);
      const dateKey = d.toDateString();
      if (dateKey !== lastDate) {
        lastDate = dateKey;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        let label: string;
        if (dateKey === today.toDateString()) label = "Today";
        else if (dateKey === yesterday.toDateString()) label = "Yesterday";
        else
          label = d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
        result.push({ type: "date", label });
      }
      result.push({ type: "msg", msg });
    }

    return result;
  }, [activeMessages]);

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ── Room Sidebar (Desktop) ───────────────────── */}
      {!isMobile && (
        <div className="w-80 shrink-0 bg-card/50 backdrop-blur-xl border-r border-border/40 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border/30">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                Messages
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-2.5 rounded-xl bg-linear-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 text-cyan-400 font-medium text-sm transition-all hover:from-cyan-500/20 hover:to-emerald-500/20 hover:border-cyan-500/30 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {rooms.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No chats yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Create one to get started
                </p>
              </div>
            ) : (
              rooms.map((room) => (
                <RoomItem
                  key={room.id}
                  room={room}
                  active={room.id === activeRoomId}
                  onClick={() => setActiveRoom(room.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Room Sheet ────────────────────────── */}
      <AnimatePresence>
        {isMobile && showRoomsMobile && (
          <div className="fixed inset-0 z-40 flex items-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowRoomsMobile(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full z-10 bg-card rounded-t-3xl shadow-2xl border-t border-border/30 p-4 max-h-[75vh] flex flex-col"
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <h3 className="text-lg font-bold text-foreground">Chats</h3>
                <button
                  type="button"
                  className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                  onClick={() => setShowRoomsMobile(false)}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-3 space-y-0.5 flex-1 overflow-auto">
                {rooms.map((r) => (
                  <RoomItem
                    key={r.id}
                    room={r}
                    active={activeRoom?.id === r.id}
                    onClick={() => {
                      setActiveRoom(r.id);
                      setShowRoomsMobile(false);
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border/30">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 rounded-xl bg-linear-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 text-cyan-400 font-medium transition-all hover:from-cyan-500/20 hover:to-emerald-500/20 flex items-center justify-center gap-2"
                  onClick={() => {
                    setShowCreateModal(true);
                    setShowRoomsMobile(false);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Message Area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-linear-to-b from-card/30 via-background/80 to-background">
        {/* Header / Selection Action Bar */}
        <div className="bg-card/60 backdrop-blur-xl border-b border-border/40 px-4 py-3 shrink-0">
          <AnimatePresence mode="wait">
            {selectedMsg ? (
              <motion.div
                key="action-bar"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => setSelectedMsg(null)}
                  className="p-2 -ml-1 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
                <span className="text-sm font-medium text-foreground flex-1">1</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => { setSelectedMsg(null); setReplyTo(selectedMsg); }}
                    className="p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                    title="Reply"
                  >
                    <Reply className="w-5 h-5 text-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMsg}
                    className="p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-5 h-5 text-foreground" />
                  </button>
                  {selectedIsOwn && selectedMsg.type !== "image" && (
                    <button
                      type="button"
                      onClick={handleEditMsg}
                      className="p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-5 h-5 text-foreground" />
                    </button>
                  )}
                  {selectedIsOwn && (
                    <button
                      type="button"
                      onClick={handleDeleteMsg}
                      className="p-2.5 rounded-xl hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="normal-header"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                {/* Mobile: sidebar nav + room switcher */}
                {isMobile && (
                  <>
                    <button
                      type="button"
                      onClick={toggleSidebar}
                      className="p-2 -ml-1 rounded-xl hover:bg-secondary/50 transition-colors"
                      title="Menu"
                    >
                      <Menu className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRoomsMobile(true)}
                      className="p-1.5 rounded-xl hover:bg-secondary/50 transition-colors"
                      title="Switch chat"
                    >
                      <Box className="w-5 h-5 text-foreground" />
                    </button>
                  </>
                )}

                {/* Room icon + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {activeRoom?.type === "group" ? (
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 relative">
                      <Bot className="w-5 h-5 text-emerald-400" />
                      {(activeAiStatus === "thinking" ||
                        activeAiStatus === "responding") && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground truncate">
                      {activeRoom?.name || "Select a chat"}
                    </h2>
                    {typingText ? (
                      <div className="flex items-center gap-1.5">
                        <TypingDots />
                        <p className="text-xs text-emerald-400">{typingText}</p>
                      </div>
                    ) : activeRoom?.type === "direct_ai" ? (
                      <p className="text-xs text-muted-foreground">AI Assistant</p>
                    ) : activeRoom ? (
                      <p className="text-xs text-muted-foreground">
                        {roomMembers.length > 0
                          ? `${roomMembers.length} member${roomMembers.length === 1 ? "" : "s"}`
                          : "Private chat"}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Members panel toggle (desktop) */}
                {activeRoom && !isMobile && (
                  <button
                    type="button"
                    onClick={() => setShowMembersPanel((s) => !s)}
                    className={`p-2 rounded-xl transition-colors ${
                      showMembersPanel
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "hover:bg-secondary/50 text-muted-foreground"
                    }`}
                    title="Room members"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                )}

                {/* Mobile members toggle */}
                {activeRoom && isMobile && (
                  <button
                    type="button"
                    onClick={() => setShowMembersMobile(true)}
                    className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground transition-colors"
                    title="Room members"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-1"
          >
            {loading && (
              <div className="flex justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs text-muted-foreground">
                    Loading messages...
                  </span>
                </div>
              </div>
            )}

            {!loading && activeMessages.length === 0 && (
              <EmptyState
                roomType={activeRoom?.type}
                onAction={() => textareaRef.current?.focus()}
              />
            )}

            {!loading &&
              messagesWithDates.map((entry, idx) =>
                entry.type === "date" ? (
                  <div
                    key={`date-${idx}`}
                    className="flex items-center justify-center py-3"
                  >
                    <div className="px-3 py-1 rounded-full bg-secondary/50 border border-border/30">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {entry.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <MessageBubble
                    key={entry.msg.id}
                    msg={entry.msg}
                    isOwn={
                      entry.msg.sender_id !== null &&
                      entry.msg!.sender?.email === user?.email
                    }
                    isGroup={activeRoom?.type === "group"}
                    onReply={() => setReplyTo(entry.msg)}
                    onScrollToReply={scrollToMessage}
                    isSelected={selectedMsg?.id === entry.msg.id}
                    onSelect={setSelectedMsg}
                    isEditing={editingMsgId === entry.msg.id}
                    onEditStart={() => setEditingMsgId(entry.msg.id)}
                    onEditSave={handleEditSave}
                    onEditCancel={() => setEditingMsgId(null)}
                  />
                ),
              )}

            {/* Streaming AI response */}
            {activeStreaming && (
              <motion.div {...fadeSlideUp} className="flex justify-start">
                <div className="max-w-lg rounded-2xl rounded-bl-md px-4 py-3 text-sm bg-linear-to-br from-emerald-500/8 to-cyan-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-2 px-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Jarvis
                    </span>
                  </div>
                  <div className="text-foreground/90 leading-relaxed prose-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeStreaming}
                    </ReactMarkdown>
                  </div>
                  <span className="inline-block w-2 h-4 bg-emerald-400/60 animate-pulse ml-0.5 rounded-sm" />
                </div>
              </motion.div>
            )}

            {/* AI thinking indicator */}
            {activeAiStatus === "thinking" && !activeStreaming && (
              <motion.div {...fadeSlideUp} className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-linear-to-br from-emerald-500/8 to-cyan-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Jarvis
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TypingDots size="md" />
                    <span className="text-xs text-muted-foreground ml-1">
                      Thinking...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => scrollToBottom()}
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-background/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 flex items-center justify-center text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/40 transition-all z-10 active:scale-95"
              >
                <ArrowDown className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Reply preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-background/40 backdrop-blur-xl border-t border-white/5 flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
                <Reply className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-cyan-400 block">
                    {replyTo?.sender?.display_name}
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    {replyTo?.content}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setReplyTo(null)}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="shrink-0 relative">
          {/* Mention Dropdown */}
          <AnimatePresence>
            {mentionQuery !== null && mentionCandidates.length > 0 && (
              <motion.div
                ref={mentionRef}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="absolute bottom-full left-2 right-2 mb-2 bg-background/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden max-h-56 overflow-y-auto z-50"
              >
                <div className="px-4 py-2 border-b border-white/10 bg-white/5 sticky top-0 z-10">
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                    Mention someone
                  </span>
                </div>
                {mentionCandidates.map((candidate, idx) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => insertMention(candidate.display_name)}
                    onMouseEnter={() => setMentionIndex(idx)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      idx === mentionIndex ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        candidate.id === 0
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      }`}
                    >
                      {candidate.id === 0 ? (
                        <Bot className="w-3.5 h-3.5" />
                      ) : (
                        candidate.display_name[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {candidate.display_name}
                      </span>
                      {candidate.id !== 0 && (
                        <span className="text-[11px] text-muted-foreground/50 truncate block">
                          {candidate.email}
                        </span>
                      )}
                    </div>
                    {candidate.id === 0 && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-500/15 shrink-0">
                        AI
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <form
            onSubmit={handleSend}
            className="px-1.5 py-1 border-t border-white/5"
          >
            {/* Image preview */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="mb-3 w-fit"
                >
                  <div className="relative group/preview p-1 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-2xl shadow-xl shadow-black/60">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-20 w-20 object-cover rounded-xl border border-white/10 shadow-inner"
                    />
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-red-500/20 backdrop-blur-md border border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-500/30 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 transition-all active:scale-90"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                    {activeRoom?.type === "direct_ai" && (
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                        <span className="text-[9px] font-black text-emerald-400 flex items-center gap-1.5 tracking-widest">
                          <Sparkles className="w-3 h-3" /> VISION
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/5 shadow-2xl shadow-black/60 group-focus-within:border-white/10 transition-all">
              {/* Image picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-cyan-400 hover:bg-white/10 transition-all shrink-0 active:scale-95 focus-visible:ring-1 focus-visible:ring-cyan-500/30 outline-hidden"
                title="Upload image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    // Mention navigation
                    if (mentionQuery !== null && mentionCandidates.length > 0) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setMentionIndex((i) =>
                          i < mentionCandidates.length - 1 ? i + 1 : 0,
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setMentionIndex((i) =>
                          i > 0 ? i - 1 : mentionCandidates.length - 1,
                        );
                        return;
                      }
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        insertMention(
                          mentionCandidates[mentionIndex].display_name,
                        );
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setMentionQuery(null);
                        return;
                      }
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(
                        e as unknown as React.FormEvent<HTMLFormElement>,
                      );
                    }
                  }}
                  placeholder={
                    activeRoom?.type === "group"
                      ? "Message family... (@jarvis for AI)"
                      : activeRoom?.type === "direct_ai"
                        ? "Message Jarvis..."
                        : "Type a message..."
                  }
                  rows={1}
                  className="w-full bg-transparent px-1 pt-1 pb-0.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none leading-relaxed"
                  disabled={sending || !activeRoomId}
                  style={{ maxHeight: 120 }}
                />
              </div>

              {/* Send button */}
              <button
                type="submit"
                disabled={
                  sending || (!input.trim() && !imageFile) || !activeRoomId
                }
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed active:scale-90 transition-all shrink-0 shadow-lg shadow-cyan-500/10 focus-visible:ring-1 focus-visible:ring-cyan-500/30 outline-hidden"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 fill-current" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Members Panel (Desktop) ──────────────────── */}
      <AnimatePresence>
        {showMembersPanel && !isMobile && activeRoom && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 bg-card/50 backdrop-blur-xl border-l border-border/30 flex flex-col overflow-hidden"
          >
            <div className="px-4 py-4 border-b border-border/30">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    Members ({roomMembers.length})
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="px-1 py-[0.5px] rounded bg-primary/10 border border-primary/20 text-primary text-[8px] font-bold uppercase tracking-widest leading-none">
                      {activeRoom?.type === "direct_ai"
                        ? "Assistant"
                        : activeRoom?.type === "DM"
                          ? "Direct Message"
                          : "Group Chat"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMembersPanel(false)}
                  className="p-1 rounded-lg hover:bg-secondary/50 transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {roomMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-secondary/30 transition-colors"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500/20 to-primary/20 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {member.display_name[0]?.toUpperCase()}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                        member.is_online
                          ? "bg-emerald-400"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium text-foreground truncate max-w-full">
                        {member.display_name}
                      </p>
                      <div className="flex items-center gap-1">
                        {activeRoom?.owner_id === member.id && (
                          <span className="px-1.5 py-[1px] rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider shrink-0">
                            Owner
                          </span>
                        )}
                        {member.id === 999 && (
                          <span className="px-1.5 py-[1px] rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold uppercase tracking-wider shrink-0">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                      {member.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Chat Modal ────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-card rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl border border-border/30"
            >
              {/* Header */}
              <div className="sticky top-0 bg-card px-6 py-4 border-b border-border/30 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold">Create Chat</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Chat Name
                  </label>
                  <input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/30 bg-secondary/20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all"
                    placeholder="e.g., Family Kitchen"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-3">
                    Chat Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setNewRoomType("direct_ai");
                        setSelectedMembers([]);
                      }}
                      className={`p-4 rounded-xl border transition-all ${
                        newRoomType === "direct_ai"
                          ? "border-cyan-500/40 bg-cyan-500/5 shadow-sm shadow-cyan-500/10"
                          : "border-border/30 hover:border-border/60"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-sm font-medium">
                          Chat with AI
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRoomType("group")}
                      className={`p-4 rounded-xl border transition-all ${
                        newRoomType === "group"
                          ? "border-cyan-500/40 bg-cyan-500/5 shadow-sm shadow-cyan-500/10"
                          : "border-border/30 hover:border-border/60"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium">Group Chat</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewRoomType("DM");
                        setSelectedMembers([]);
                      }}
                      className={`p-4 rounded-xl border transition-all ${
                        newRoomType === "DM"
                          ? "border-cyan-500/40 bg-cyan-500/5 shadow-sm shadow-cyan-500/10"
                          : "border-border/30 hover:border-border/60"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-purple-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-sm font-medium">DM Chat</span>
                      </div>
                    </button>
                  </div>
                </div>

                {newRoomType === "group" && (
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-3">
                      Add Members
                    </label>

                    {/* Selected member chips */}
                    {selectedMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {selectedMembers.map((id) => {
                          const m = membersList.find((u) => u.id === id);
                          if (!m) return null;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() =>
                                setSelectedMembers(
                                  selectedMembers.filter((x) => x !== id),
                                )
                              }
                              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
                            >
                              <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold">
                                {m.display_name[0]?.toUpperCase()}
                              </div>
                              {m.display_name}
                              <X className="w-3 h-3 ml-0.5 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-1 max-h-52 overflow-y-auto rounded-xl">
                      {membersList.filter((m) => m.email !== user?.email)
                        .length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No family members available
                        </p>
                      ) : (
                        membersList
                          .filter((m) => m.email !== user?.email)
                          .map((member) => {
                            const isSelected = selectedMembers.includes(
                              member.id,
                            );
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedMembers(
                                      selectedMembers.filter(
                                        (id) => id !== member.id,
                                      ),
                                    );
                                  } else {
                                    setSelectedMembers([
                                      ...selectedMembers,
                                      member.id,
                                    ]);
                                  }
                                }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                                  isSelected
                                    ? "bg-cyan-500/8 border border-cyan-500/25"
                                    : "hover:bg-secondary/30 border border-transparent"
                                }`}
                              >
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                      : "bg-secondary/50 text-muted-foreground border border-border/20"
                                  }`}
                                >
                                  {member.display_name[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {member.display_name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground/50 truncate">
                                    {member.email}
                                  </p>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? "bg-cyan-500 border-cyan-500"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
                {newRoomType === "DM" && (
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-3">
                      Choose Member(Select One)
                    </label>
                    <div className="space-y-1 max-h-52 overflow-y-auto rounded-xl">
                      {membersList.filter((m) => m.email !== user?.email)
                        .length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No family members available
                        </p>
                      ) : (
                        membersList
                          .filter((m) => m.email !== user?.email)
                          .map((member) => {
                            const isSelected = selectedMembers.includes(
                              member.id,
                            );
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedMembers(
                                      selectedMembers.filter(
                                        (id) => id !== member.id,
                                      ),
                                    );
                                  } else {
                                    setSelectedMembers([
                                      ...selectedMembers,
                                      member.id,
                                    ]);
                                  }
                                  //unselect others
                                  setSelectedMembers((prev) =>
                                    prev.filter((id) => id === member.id),
                                  );
                                }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                                  isSelected
                                    ? "bg-cyan-500/8 border border-cyan-500/25"
                                    : "hover:bg-secondary/30 border border-transparent"
                                }`}
                              >
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                      : "bg-secondary/50 text-muted-foreground border border-border/20"
                                  }`}
                                >
                                  {member.display_name[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {member.display_name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground/50 truncate">
                                    {member.email}
                                  </p>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? "bg-cyan-500 border-cyan-500"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-card px-6 py-4 border-t border-border/30 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedMembers([]);
                  }}
                  className="px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 text-foreground transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createRoom}
                  disabled={!newRoomName.trim()}
                  className="px-4 py-2 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-40 transition-all font-medium text-sm"
                >
                  Create Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Mobile Members Sheet ──────────────────────── */}
      <AnimatePresence>
        {isMobile && showMembersMobile && (
          <div className="fixed inset-0 z-50 flex items-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMembersMobile(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full z-10 bg-background/60 backdrop-blur-xl rounded-t-[2.5rem] shadow-2xl border-t border-white/5 p-6 max-h-[85vh] flex flex-col"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate">
                    Members ({roomMembers.length})
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-widest mt-1 inline-block leading-none">
                    {activeRoom?.type === "direct_ai"
                      ? "Assistant"
                      : activeRoom?.type === "DM"
                        ? "Direct Message"
                        : "Group Chat"}
                  </span>
                </div>
                <button
                  type="button"
                  className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                  onClick={() => setShowMembersMobile(false)}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-3 space-y-1 flex-1 overflow-auto">
                {roomMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3.5 p-3.5 rounded-[1.25rem] bg-white/5 border border-white/5 transition-all active:scale-[0.98]"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500/20 to-primary/20 flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                        {member.display_name[0]?.toUpperCase()}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                          member.is_online
                            ? "bg-emerald-400"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate max-w-full">
                          {member.display_name}
                        </span>
                        <div className="flex items-center gap-1">
                          {activeRoom?.owner_id === member.id && (
                            <span className="px-1.5 py-px rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider shrink-0">
                              Owner
                            </span>
                          )}
                          {member.id === 999 && (
                            <span className="px-1.5 py-px rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold uppercase tracking-wider shrink-0">
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground/60 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Typing Dots Indicator ───────────────────────────────────

function TypingDots({ size = "sm" }: { size?: "sm" | "md" }) {
  const dotSize = size === "md" ? "w-1.5 h-1.5" : "w-1 h-1";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`${dotSize} rounded-full bg-emerald-400`}
          style={{
            animation: "typingBounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}

// ── Empty State ─────────────────────────────────────────────

function EmptyState({
  roomType,
  onAction,
}: {
  roomType?: string;
  onAction: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-sm text-center px-4">
        <div className="mb-5 flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/15 flex items-center justify-center">
            {roomType === "group" ? (
              <Users className="w-9 h-9 text-cyan-400/60" />
            ) : (
              <Brain className="w-9 h-9 text-emerald-400/60" />
            )}
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          {roomType === "group" ? "Start the conversation" : "Hey, I'm Jarvis"}
        </h3>
        <p className="text-sm text-muted-foreground/80 mb-6 leading-relaxed">
          {roomType === "group"
            ? "Send a message to the group. Mention @jarvis to get AI help."
            : "Your smart home AI assistant. Ask me anything about your home, devices, or just chat!"}
        </p>

        {roomType === "direct_ai" && (
          <div className="space-y-2 mb-6 text-left">
            {[
              "What's the energy usage today?",
              "Turn on the living room lights",
              "What's the weather like?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={onAction}
                className="w-full text-left px-4 py-2.5 rounded-xl bg-secondary/30 border border-border/20 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:border-cyan-500/20 transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Room Item ───────────────────────────────────────────────

function RoomItem({
  room,
  active,
  onClick,
}: {
  room: ChatRoom;
  active: boolean;
  onClick: () => void;
}) {
  const timeAgo = room.last_msg_at ? formatRelative(room.last_msg_at) : "";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl px-3 py-3 transition-all ${
        active
          ? "bg-cyan-500/8 border border-cyan-500/20"
          : "hover:bg-secondary/30 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
            room.type === "group"
              ? "bg-blue-500/10 border border-blue-500/20"
              : "bg-emerald-500/10 border border-emerald-500/20"
          }`}
        >
          {room.type === "group" ? (
            <Users className="w-4.5 h-4.5 text-blue-400" />
          ) : (
            <Bot className="w-4.5 h-4.5 text-emerald-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-sm font-medium truncate ${active ? "text-foreground" : "text-foreground/80"}`}
            >
              {room.name}
            </span>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {timeAgo && (
                <span className="text-[10px] text-muted-foreground/50">
                  {timeAgo}
                </span>
              )}
              {room.unread_count > 0 && (
                <span className="bg-cyan-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {room.unread_count > 9 ? "9+" : room.unread_count}
                </span>
              )}
            </div>
          </div>
          {room.last_msg_text && (
            <p className="text-xs text-muted-foreground/60 truncate">
              {room.last_msg_by && (
                <span className="text-muted-foreground/80">
                  {room.last_msg_by}:{" "}
                </span>
              )}
              {room.last_msg_text}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Message Bubble ──────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  const check = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
  const doubleCheck = (
    <svg
      width="16"
      height="12"
      viewBox="0 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 13l4 4L15 7" />
      <path d="M9 13l4 4L23 7" />
    </svg>
  );

  switch (status) {
    case "sending":
      return (
        <svg
          className="w-3 h-3 text-muted-foreground/40 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      );
    case "failed":
      return (
        <span className="text-red-400 text-[10px] font-medium flex items-center gap-0.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </span>
      );
    case "seen":
      return <span className="text-cyan-400 flex">{doubleCheck}</span>;
    case "delivered":
    case "processed":
      return (
        <span className="text-muted-foreground/50 flex">{doubleCheck}</span>
      );
    case "sent":
      return <span className="text-muted-foreground/50 flex">{check}</span>;
    default:
      return null;
  }
}

function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 gap-3 bg-secondary/15 rounded-xl border border-white/5 ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <span className="text-xs font-medium text-muted-foreground/40">
          Image not available
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={className}
    />
  );
}

function MessageDropdown({
  isOwn,
  isAI,
  isImage,
  onReply,
  onCopy,
  onEdit,
  onDelete,
}: {
  isOwn: boolean;
  isAI: boolean;
  isImage: boolean;
  onReply: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`absolute top-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity ${
      isOwn ? "left-2" : "right-2"
    }`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`rounded-full p-0.5 transition-colors ${
          isOwn
            ? "bg-cyan-500/20 hover:bg-cyan-500/30"
            : isAI
              ? "bg-emerald-500/20 hover:bg-emerald-500/30"
              : "bg-white/10 hover:bg-white/20"
        }`}
      >
        <ChevronDown className="w-4 h-4 text-white/70" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute top-8 min-w-[140px] py-1 rounded-xl bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 ${
              isOwn ? "left-0" : "right-0"
            }`}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onReply(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-foreground hover:bg-white/8 transition-colors"
            >
              <Reply className="w-4 h-4 text-muted-foreground" />
              Reply
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onCopy(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-foreground hover:bg-white/8 transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
              Copy
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-foreground hover:bg-white/8 transition-colors"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
                Edit
              </button>
            )}
            {onDelete && (
              <>
                <div className="mx-2.5 my-0.5 border-t border-white/5" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  isGroup,
  onReply,
  onScrollToReply,
  isSelected,
  onSelect,
  isEditing,
  onEditStart,
  onEditSave,
  onEditCancel,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isGroup: boolean;
  onReply: () => void;
  onScrollToReply: (msgId: number) => void;
  isSelected: boolean;
  onSelect: (msg: ChatMessage | null) => void;
  isEditing: boolean;
  onEditStart: () => void;
  onEditSave: (msgId: number, roomId: number, content: string) => void;
  onEditCancel: () => void;
}) {
  const isAI = msg.role === "assistant";
  const isImage = msg.type === "image";
  const isSending = msg.status === "sending";
  const isFailed = msg.status === "failed";

  const [editText, setEditText] = useState(msg.content);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  // Reset edit text when entering edit mode
  useEffect(() => {
    if (isEditing) setEditText(msg.content);
  }, [isEditing, msg.content]);

  // Long-press to select (mobile — like WhatsApp)
  const handleTouchStart = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      if (!isSending && !isFailed) onSelect(msg);
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Prevent tap from firing after long-press
    if (longPressTriggered.current) {
      e.preventDefault();
    }
  };

  return (
    <div
      data-msg-id={msg.id}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group py-0.5 transition-colors duration-200 ${
        isSelected ? "bg-cyan-500/10 rounded-xl py-2 px-2" : ""
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-md md:max-w-lg ${isSending ? "opacity-60" : ""}`}
      >
        <div
          className={`rounded-[1.25rem] overflow-hidden transition-all ${
            isFailed
              ? "rounded-br-md bg-linear-to-br from-red-600/80 to-red-500/80 text-white shadow-md shadow-red-500/10 border border-red-500/30"
              : isAI
                ? "rounded-bl-md bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                : isOwn
                  ? "rounded-br-md bg-cyan-500/15 backdrop-blur-xl border border-cyan-500/20 text-foreground shadow-lg shadow-cyan-500/5"
                  : "rounded-bl-md bg-background/40 backdrop-blur-xl border border-white/5 text-foreground shadow-xl shadow-black/20"
          }`}
        >
          {/* Sender name */}
          {(isGroup || isAI) && !isOwn && (
            <div className="px-4 pt-2.5 pb-0.5">
              <span
                className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                  isAI ? "text-emerald-400" : "text-cyan-400"
                }`}
              >
                {isAI && <Sparkles className="w-3 h-3" />}
                {msg.sender?.display_name}
              </span>
            </div>
          )}

          {/* Image */}
          {isImage && msg.media_url && (
            <div className="p-1.5 pb-0">
              <ImageWithFallback
                src={resolveMediaUrl(msg.media_url)}
                alt={msg.content || "image message"}
                className="w-full h-auto max-h-80 object-cover rounded-xl border border-white/5 shadow-sm"
              />
              {msg.content && msg.content !== "📷" && (
                <div
                  className={`px-2.5 py-3 text-sm font-medium ${isOwn ? "text-white" : "text-foreground"}`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          )}

          {/* Edit mode */}
          {isEditing ? (
            <div className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSave(msg.id, msg.room_id, editText); }
                  if (e.key === "Escape") onEditCancel();
                }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                rows={Math.min(editText.split("\n").length, 4)}
              />
              <div className="flex justify-end gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEditCancel(); }}
                  className="text-[11px] px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEditSave(msg.id, msg.room_id, editText); }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* Text */
            (!isImage || !msg.media_url) && msg.content && (
              <div
                className={`px-4.5 py-2.5 text-sm leading-relaxed ${isImage ? "bg-white/5" : ""}`}
              >
                {/* Reply reference */}
                {msg.reply_to && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onScrollToReply(msg.reply_to!.id); }}
                    className={`mb-3.5 flex items-stretch gap-3 w-full text-left group/reply transition-all active:scale-[0.98] cursor-pointer`}
                  >
                    <div
                      className={`w-1 rounded-full shrink-0 ${isOwn ? "bg-white/30" : "bg-cyan-500/40"}`}
                    />
                    <div
                      className={`flex-1 min-w-0 py-1.5 px-3 rounded-xl border border-white/5 transition-colors ${
                        isOwn
                          ? "bg-white/10 group-hover/reply:bg-white/15"
                          : "bg-cyan-500/8 group-hover/reply:bg-cyan-500/12"
                      }`}
                    >
                      <span
                        className={`text-[11px] font-bold block mb-0.5 ${isOwn ? "text-white" : "text-cyan-400"}`}
                      >
                        {msg?.reply_to.sender?.display_name}
                      </span>
                      <p
                        className={`text-[11px] truncate ${isOwn ? "text-white/60" : "text-muted-foreground/80"}`}
                      >
                        {msg?.reply_to.content}
                      </p>
                    </div>
                  </button>
                )}
                {isAI ? (
                  <div className="prose prose-sm prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-code:text-emerald-300 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-[11px] prose-pre:bg-black/40 prose-pre:rounded-xl max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <HighlightMentions text={msg.content} isOwn={isOwn} />
                )}
              </div>
            )
          )}
        </div>

        {/* Hover dropdown — like WhatsApp */}
        {!isSending && !isFailed && !isEditing && (
          <MessageDropdown
            isOwn={isOwn}
            isAI={isAI}
            isImage={isImage}
            onReply={() => onReply()}
            onCopy={() => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }}
            onEdit={isOwn && !isImage ? () => onEditStart() : undefined}
            onDelete={isOwn ? () => onSelect(msg) : undefined}
          />
        )}

        {/* Timestamp + status */}
        <div
          className={`flex items-center gap-1.5 mt-1 px-1 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          {isFailed ? (
            <span className="text-[10px] text-red-400">Failed to send</span>
          ) : isSending ? (
            <>
              <span className="text-[10px] text-muted-foreground/40">
                Sending
              </span>
              <StatusIcon status="sending" />
            </>
          ) : (
            <>
              <span className="text-[10px] text-muted-foreground/40">
                {formatTime(msg.created_at)}
              </span>
              {isOwn && <StatusIcon status={msg.status} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function HighlightMentions({ text, isOwn }: { text: string; isOwn: boolean }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {parts.map((part, i) =>
        /^@\w+/.test(part) ? (
          <span
            key={i}
            className="font-bold inline-flex items-center px-2 py-0.5 rounded-full text-[13px] text-cyan-400 bg-cyan-500/15 border border-cyan-500/10 shadow-sm leading-none"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelative(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
