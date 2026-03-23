import { create } from "zustand";

// ── Types ─────────────────────────────────────────────────────

export interface ChatRoom {
  id: number;
  name: string;
  type: "group" | "direct_ai";
  owner_id: number | null;
  last_msg_text: string | null;
  last_msg_at: string | null;
  last_msg_by: string | null;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  room_id: number;
  thread_id: number | null;
  sender_id: number | null;
  sender_name: string;
  role: "user" | "assistant" | "system";
  status: string;
  content: string;
  type: "text" | "image" | "voice";
  media_url: string | null;
  reply_to_id: number | null;
  reply_to?: ChatMessage | null;
  created_at: string;
}

export type AIStatus = "thinking" | "responding" | "idle";

// ── State ─────────────────────────────────────────────────────

interface ChatState {
  rooms: ChatRoom[];
  activeRoomId: number | null;
  messages: Record<number, ChatMessage[]>;
  typingUsers: Record<number, string[]>;
  aiStatus: Record<number, AIStatus>;
  streamingContent: Record<number, string>;
  loading: boolean;

  // Actions
  setActiveRoom: (id: number | null) => void;
  setRooms: (rooms: ChatRoom[]) => void;
  setMessages: (roomId: number, messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setTyping: (roomId: number, userName: string, isTyping: boolean) => void;
  setAiStatus: (roomId: number, status: AIStatus) => void;
  setStreamingContent: (roomId: number, content: string) => void;
  clearStreamingContent: (roomId: number) => void;
  updateMessage: (roomId: number, tempId: number, msg: ChatMessage) => void;
  updateRoomPreview: (roomId: number, text: string, by: string) => void;
  decrementUnread: (roomId: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  typingUsers: {},
  aiStatus: {},
  streamingContent: {},
  loading: false,

  setActiveRoom: (id) => set({ activeRoomId: id }),

  setRooms: (rooms) => set({ rooms }),

  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  addMessage: (msg) =>
    set((state) => {
      const existing = state.messages[msg.room_id] || [];
      // Prevent duplicates (by real ID)
      if (existing.some((m) => m.id === msg.id)) return state;

      // If this is a real message from WS/API, replace any matching optimistic
      // message (negative temp ID, same content + sender) instead of appending
      const optimisticIdx = msg.id > 0
        ? existing.findIndex(
            (m) => m.id < 0 && m.content === msg.content && m.sender_name === msg.sender_name,
          )
        : -1;

      let updatedList: ChatMessage[];
      if (optimisticIdx !== -1) {
        updatedList = [...existing];
        updatedList[optimisticIdx] = msg;
      } else {
        updatedList = [...existing, msg];
      }

      const updatedMessages = {
        ...state.messages,
        [msg.room_id]: updatedList,
      };

      // Update room preview
      const updatedRooms = state.rooms.map((r) =>
        r.id === msg.room_id
          ? {
              ...r,
              last_msg_text:
                msg.content.length > 100
                  ? msg.content.slice(0, 100) + "..."
                  : msg.content,
              last_msg_at: msg.created_at,
              last_msg_by: msg.sender_name,
              // Increment unread if not the active room
              unread_count:
                state.activeRoomId === msg.room_id
                  ? r.unread_count
                  : r.unread_count + 1,
            }
          : r,
      );

      return { messages: updatedMessages, rooms: updatedRooms };
    }),

  setTyping: (roomId, userName, isTyping) =>
    set((state) => {
      const current = state.typingUsers[roomId] || [];
      let updated: string[];
      if (isTyping) {
        updated = current.includes(userName) ? current : [...current, userName];
      } else {
        updated = current.filter((n) => n !== userName);
      }
      return {
        typingUsers: { ...state.typingUsers, [roomId]: updated },
      };
    }),

  setAiStatus: (roomId, status) =>
    set((state) => ({
      aiStatus: { ...state.aiStatus, [roomId]: status },
    })),

  setStreamingContent: (roomId, content) =>
    set((state) => ({
      streamingContent: { ...state.streamingContent, [roomId]: content },
    })),

  clearStreamingContent: (roomId) =>
    set((state) => {
      const { [roomId]: _, ...rest } = state.streamingContent;
      return { streamingContent: rest };
    }),

  updateMessage: (roomId, tempId, msg) =>
    set((state) => {
      const existing = state.messages[roomId] || [];
      return {
        messages: {
          ...state.messages,
          [roomId]: existing.map((m) => (m.id === tempId ? msg : m)),
        },
      };
    }),

  updateRoomPreview: (roomId, text, by) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? { ...r, last_msg_text: text, last_msg_by: by, last_msg_at: new Date().toISOString() }
          : r,
      ),
    })),

  decrementUnread: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r,
      ),
    })),

  setLoading: (loading) => set({ loading }),
}));
