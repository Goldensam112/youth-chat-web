import { create } from "zustand";
import type { Message, Room, User } from "@/lib/types";

type ChatState = {
  user: User | null;
  room: Room | null;
  messages: Message[];
  timeLeft: number;
  typingUser: string | null;
  queueStatus: "idle" | "queued" | "matched";
  setUser: (user: User | null) => void;
  setRoom: (room: Room | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setTimeLeft: (timeLeft: number) => void;
  setTypingUser: (userId: string | null) => void;
  setQueueStatus: (status: ChatState["queueStatus"]) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  user: null,
  room: null,
  messages: [],
  timeLeft: 60,
  typingUser: null,
  queueStatus: "idle",
  setUser: (user) => set({ user }),
  setRoom: (room) => set({ room }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setTypingUser: (typingUser) => set({ typingUser }),
  setQueueStatus: (queueStatus) => set({ queueStatus })
}));
