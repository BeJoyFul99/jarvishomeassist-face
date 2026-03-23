"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, type ChatMessage } from "@/store/useChatStore";
import { chatSocket, type ChatWSMessage } from "@/lib/chatSocket";

/**
 * Connects the shared chat WebSocket and routes incoming events
 * to the Zustand chat store. Also provides helpers for sending
 * typing indicators and marking messages as seen.
 */
export function useChatSocket() {
  const token = useAuthStore((s) => s.token);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const addMessage = useChatStore((s) => s.addMessage);
  const messages = useChatStore((s) => s.messages);
  const setTyping = useChatStore((s) => s.setTyping);
  const setAiStatus = useChatStore((s) => s.setAiStatus);
  const setStreamingContent = useChatStore((s) => s.setStreamingContent);
  const clearStreamingContent = useChatStore((s) => s.clearStreamingContent);

  // Keep refs for values used inside the WS handler to avoid stale closures
  const activeRoomRef = useRef(activeRoomId);
  activeRoomRef.current = activeRoomId;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Connect/disconnect WS based on token
  useEffect(() => {
    chatSocket.setToken(token);
  }, [token]);

  // Subscribe to WS events
  useEffect(() => {
    const handler = (event: ChatWSMessage) => {
      switch (event.type) {
        case "chat:message": {
          const msg = event.data as ChatMessage;
          // Hydrate reply_to from local messages if missing
          if (msg.reply_to_id && !msg.reply_to) {
            const roomMsgs = messagesRef.current[msg.room_id] || [];
            const replyTarget = roomMsgs.find((m) => m.id === msg.reply_to_id);
            if (replyTarget) msg.reply_to = replyTarget;
          }
          addMessage(msg);

          // If this room was streaming, clear it (the final message has arrived)
          clearStreamingContent(msg.room_id);
          break;
        }

        case "chat:typing": {
          const { room_id, user_name, is_typing } = event.data as {
            room_id: number;
            user_name: string;
            is_typing: boolean;
          };
          setTyping(room_id, user_name, is_typing);
          break;
        }

        case "chat:ai_status": {
          const { room_id, status } = event.data as {
            room_id: number;
            status: "thinking" | "responding" | "idle";
          };
          setAiStatus(room_id, status);
          if (status === "idle") {
            clearStreamingContent(room_id);
          }
          break;
        }

        case "chat:ai_stream": {
          const { room_id, partial } = event.data as {
            room_id: number;
            token: string;
            partial: string;
          };
          setStreamingContent(room_id, partial);
          break;
        }

        case "chat:seen":
          // Could update a seen-by list in the future
          break;
      }
    };

    const unsubscribe = chatSocket.subscribe(handler);
    return unsubscribe;
  }, [addMessage, setTyping, setAiStatus, setStreamingContent, clearStreamingContent]);

  // ── Typing indicator (debounced) ─────────────────────────

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const roomId = activeRoomRef.current;
      if (!roomId) return;

      if (isTyping && !isTypingRef.current) {
        isTypingRef.current = true;
        chatSocket.send("typing", { room_id: roomId, is_typing: true });
      }

      // Reset the stop-typing timer
      if (typingTimeout.current) clearTimeout(typingTimeout.current);

      if (isTyping) {
        typingTimeout.current = setTimeout(() => {
          isTypingRef.current = false;
          chatSocket.send("typing", { room_id: roomId, is_typing: false });
        }, 2000);
      } else {
        isTypingRef.current = false;
        chatSocket.send("typing", { room_id: roomId, is_typing: false });
      }
    },
    [],
  );

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  return { sendTyping };
}
