import { fetchApi } from "./api";
import { Room, RoomMessage } from "../types/index";

export const roomService = {
  /** The current group's chat room: members and latest messages. */
  async open(): Promise<Room> {
    return fetchApi("/room", { method: "GET" });
  },

  /** Messages posted after a timestamp (polled to see everyone's questions and answers live). */
  async messagesAfter(after: string): Promise<RoomMessage[]> {
    return fetchApi(`/room/messages?after=${encodeURIComponent(after)}`, { method: "GET" });
  },

  /** Post to the group; with askAi the AI answers (returns question + answer), else team-only. */
  async post(text: string, askAi: boolean, featureId?: string | null): Promise<RoomMessage[]> {
    return fetchApi("/room/messages", {
      method: "POST",
      body: JSON.stringify({ text, ask_ai: askAi, feature_id: featureId || undefined }),
    });
  },
};
