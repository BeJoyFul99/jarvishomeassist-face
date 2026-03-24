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
  ChevronLeft,
  ArrowDown,
  Menu,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebar } from "@/components/ui/sidebar";
import {
  useChatStore,
  type ChatMessage,
  type ChatRoom,
} from "@/store/useChatStore";
import { useChatSocket } from "@/hooks/useChatSocket";

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
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showRoomsMobile, setShowRoomsMobile] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<"direct_ai" | "group">(
    "direct_ai",
  );
  const [isMobile, setIsMobile] = useState(false);
  const [membersList, setMembersList] = useState<
    Array<{ id: number; email: string; display_name: string; is_online?: boolean }>
  >([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === activeRoomId);
  }, [rooms, activeRoomId]);

  // ── Mention candidates ─────────────────────────────────

  const mentionCandidates = useMemo(() => {
    // Always include Jarvis as a mentionable, exclude self
    const allMentionable = [
      { id: 0, display_name: "jarvis", email: "ai@jarvis" },
      ...membersList.filter((m) => m.email !== user?.email),
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
          if (data.length > 0 && !activeRoomId) {
            setActiveRoom(data[0].id);
          }
        }
      } catch {
        // silent
      }
    };
    loadRooms();
  }, [authHeaders, setRooms, setActiveRoom, activeRoomId]);

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
        setLoading(false);
      }
    };
    loadMessages();
    decrementUnread(activeRoomId);
  }, [activeRoomId, authHeaders, setMessages, decrementUnread, setLoading]);

  // ── Auto-scroll ──────────────────────────────────────────

  const activeMessages = useMemo(() => activeRoomId ? messages[activeRoomId] || [] : [], [activeRoomId, messages]);
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

  // Auto-scroll on new messages (only if already near bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Auto-scroll if user is within 150px of bottom
    if (distFromBottom < 150) {
      scrollToBottom();
    }
  }, [activeMessages.length, activeStreaming, scrollToBottom]);

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

  // ── Mark as seen ─────────────────────────────────────────

  const lastRealMsgId = useMemo(() => {
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].id > 0) return activeMessages[i].id;
    }
    return 0;
  }, [activeMessages]);

  useEffect(() => {
    if (!activeRoomId || !lastRealMsgId) return;
    fetch(`/api/chat/rooms/${activeRoomId}/seen`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ last_read: lastRealMsgId }),
    }).catch(() => {});
  }, [activeRoomId, lastRealMsgId, authHeaders]);

  // ── Send message ─────────────────────────────────────────

  // Counter for optimistic temp IDs (negative to avoid colliding with real IDs)
  const tempIdRef = useRef(-1);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || !activeRoomId || sending) return;

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
      sender_id: null,
      sender_name: user?.displayName || "",
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
        if (currentReplyTo?.id) formData.append("reply_to_id", currentReplyTo.id.toString());
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
        updateMessage(activeRoomId, tempId, { ...optimistic, status: "failed" });
      }
    } catch {
      updateMessage(activeRoomId, tempId, { ...optimistic, status: "failed" });
    } finally {
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
      }
    } catch {
      // silent
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
    const result: Array<{ type: "date"; label: string } | { type: "msg"; msg: ChatMessage }> = [];
    let lastDate = "";
    for (const msg of activeMessages) {
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
        else label = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
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
                <p className="text-xs text-muted-foreground/60 mt-1">Create one to get started</p>
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="bg-card/60 backdrop-blur-xl border-b border-border/40 px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5">
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
                  <ChevronLeft className="w-5 h-5 text-foreground" />
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
                  {(activeAiStatus === "thinking" || activeAiStatus === "responding") && (
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
                ) : activeRoom?.type === "group" ? (
                  <p className="text-xs text-muted-foreground">
                    {membersList.length > 0 ? `${membersList.length} members` : "Group chat"}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Members panel toggle (group only, desktop) */}
            {activeRoom?.type === "group" && !isMobile && (
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
          </div>
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
                <span className="text-xs text-muted-foreground">Loading messages...</span>
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
                <div key={`date-${idx}`} className="flex items-center justify-center py-3">
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
                    entry.msg.sender_name === user?.displayName
                  }
                  isGroup={activeRoom?.type === "group"}
                  onReply={() => setReplyTo(entry.msg)}
                  onScrollToReply={scrollToMessage}
                />
              ),
            )}

          {/* Streaming AI response */}
          {activeStreaming && (
            <motion.div {...fadeSlideUp} className="flex justify-start">
              <div className="max-w-lg rounded-2xl rounded-bl-md px-4 py-3 text-sm bg-linear-to-br from-emerald-500/8 to-cyan-500/5 border border-emerald-500/15">
                <div className="flex items-center gap-2 mb-2">
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
                  <span className="text-xs font-semibold text-emerald-400">Jarvis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TypingDots size="md" />
                  <span className="text-xs text-muted-foreground ml-1">Thinking...</span>
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
              className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-card border border-border/40 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-cyan-500/30 transition-all z-10"
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
              <div className="px-4 py-2.5 bg-card/80 backdrop-blur-md border-t border-border/30 flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
                <Reply className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-cyan-400 block">
                    {replyTo.sender_name}
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    {replyTo.content}
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

        {/* Mention Dropdown */}
        <AnimatePresence>
          {mentionQuery !== null && mentionCandidates.length > 0 && (
            <motion.div
              ref={mentionRef}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="mx-3 md:mx-4 mb-1 bg-card border border-border/40 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
            >
              <div className="px-3 py-1.5 border-b border-border/20">
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
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                    idx === mentionIndex
                      ? "bg-cyan-500/10"
                      : "hover:bg-secondary/30"
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

        {/* Input Area */}
        <div className="shrink-0">
          <form
            onSubmit={handleSend}
            className="px-2 py-1.5 md:px-3 md:py-2 bg-background/80 backdrop-blur-xl border-t border-border/40"
          >
            {/* Image preview */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="mb-2.5"
                >
                  <div className="relative w-fit group/img">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-20 w-20 object-cover rounded-xl border border-border/40 shadow-lg"
                    />
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/30"
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                    {activeRoom?.type === "direct_ai" && (
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-emerald-500/90 backdrop-blur-sm">
                        <span className="text-[9px] font-bold text-white flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Vision
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-1">
              {/* Image picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-cyan-400 transition-colors shrink-0"
                title="Upload image"
              >
                <ImageIcon className="w-4.5 h-4.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Textarea pill */}
              <div className="flex-1 relative rounded-xl bg-secondary/40 border border-border/30 focus-within:border-cyan-500/40 transition-all overflow-hidden">
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
                      handleSend(e as unknown as React.FormEvent<HTMLFormElement>);
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
                  className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none leading-snug"
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
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-emerald-500 text-white disabled:opacity-20 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Members Panel (Desktop) ──────────────────── */}
      <AnimatePresence>
        {showMembersPanel && !isMobile && activeRoom?.type === "group" && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 bg-card/50 backdrop-blur-xl border-l border-border/30 flex flex-col overflow-hidden"
          >
            <div className="px-4 py-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Members ({membersList.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMembersPanel(false)}
                  className="p-1 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {membersList.map((member) => (
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
                        member.is_online ? "bg-emerald-400" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {member.display_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">
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
                        <span className="text-sm font-medium">Chat with AI</span>
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
                                setSelectedMembers(selectedMembers.filter((x) => x !== id))
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
                      {membersList.filter((m) => m.email !== user?.email).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No family members available
                        </p>
                      ) : (
                        membersList.filter((m) => m.email !== user?.email).map((member) => {
                          const isSelected = selectedMembers.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedMembers(
                                    selectedMembers.filter((id) => id !== member.id),
                                  );
                                } else {
                                  setSelectedMembers([...selectedMembers, member.id]);
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
            <span className={`text-sm font-medium truncate ${active ? "text-foreground" : "text-foreground/80"}`}>
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
                <span className="text-muted-foreground/80">{room.last_msg_by}: </span>
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
  const doubleCheck = (
    <svg width="16" height="12" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 13l4 4L15 7" />
      <path d="M9 13l4 4L23 7" />
    </svg>
  );

  switch (status) {
    case "sending":
      return (
        <svg className="w-3 h-3 text-muted-foreground/40 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      );
    case "failed":
      return (
        <span className="text-red-400 text-[10px] font-medium flex items-center gap-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </span>
      );
    case "seen":
      return <span className="text-cyan-400 flex">{doubleCheck}</span>;
    case "delivered":
    case "processed":
      return <span className="text-muted-foreground/50 flex">{doubleCheck}</span>;
    case "sent":
      return <span className="text-muted-foreground/50 flex">{check}</span>;
    default:
      return null;
  }
}

function MessageBubble({
  msg,
  isOwn,
  isGroup,
  onReply,
  onScrollToReply,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isGroup: boolean;
  onReply: () => void;
  onScrollToReply: (msgId: number) => void;
}) {
  const isAI = msg.role === "assistant";
  const isImage = msg.type === "image";
  const isSending = msg.status === "sending";
  const isFailed = msg.status === "failed";

  return (
    <div
      data-msg-id={msg.id}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group py-0.5 transition-colors duration-700`}
    >
      <div className={`relative max-w-[85%] sm:max-w-md md:max-w-lg ${isSending ? "opacity-60" : ""}`}>
        <div
          className={`rounded-2xl overflow-hidden transition-all ${
            isFailed
              ? "rounded-br-md bg-linear-to-br from-red-600/80 to-red-500/80 text-white shadow-md shadow-red-500/10 border border-red-500/30"
              : isAI
                ? "rounded-bl-md bg-linear-to-br from-emerald-500/8 to-cyan-500/5 border border-emerald-500/15"
                : isOwn
                  ? "rounded-br-md bg-linear-to-br from-cyan-600 to-cyan-500 text-white shadow-md shadow-cyan-500/10"
                  : "rounded-bl-md bg-secondary/40 border border-border/20 text-foreground"
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
                {msg.sender_name}
              </span>
            </div>
          )}

          {/* Image */}
          {isImage && msg.media_url && (
            <div>
              <img
                src={msg.media_url}
                alt="message"
                className="w-full h-auto max-h-80 object-cover"
              />
              {msg.content && msg.content !== "\ud83d\udcf7" && (
                <div className="px-4 py-2 text-sm">{msg.content}</div>
              )}
            </div>
          )}

          {/* Text */}
          {(!isImage || !msg.media_url) && msg.content && (
            <div className={`px-4 py-2 text-sm leading-relaxed ${isImage ? "bg-black/10" : ""}`}>
              {/* Reply reference */}
              {msg.reply_to && (
                <button
                  type="button"
                  onClick={() => onScrollToReply(msg.reply_to!.id)}
                  className="mb-2 pl-3 border-l-2 border-current/30 opacity-70 text-xs text-left w-full hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="font-medium block">{msg.reply_to.sender_name}</span>
                  <p className="truncate opacity-80">{msg.reply_to.content}</p>
                </button>
              )}
              {isAI ? (
                <div className="prose prose-sm prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-code:text-cyan-300 prose-code:bg-cyan-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-black/30 prose-pre:rounded-lg max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <HighlightMentions text={msg.content} isOwn={isOwn} />
              )}
            </div>
          )}
        </div>

        {/* Reply button on hover */}
        <button
          type="button"
          onClick={onReply}
          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border/30 rounded-lg p-1.5 shadow-lg ${
            isOwn ? "-left-8" : "-right-8"
          }`}
        >
          <Reply className="w-3 h-3 text-muted-foreground" />
        </button>

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
              <span className="text-[10px] text-muted-foreground/40">Sending</span>
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
    <>
      {parts.map((part, i) =>
        /^@\w+/.test(part) ? (
          <span
            key={i}
            className={`font-semibold ${
              isOwn
                ? "text-white/90 bg-white/15 px-1 rounded"
                : "text-cyan-400 bg-cyan-500/10 px-1 rounded"
            }`}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
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
