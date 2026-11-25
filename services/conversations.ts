import { fetchApi } from "./api";
import { AnswerFeedback, Conversation, ConversationDetail, ConversationMessage, Discipline } from "../types/index";

export const conversationService = {
  async list(featureId?: string): Promise<Conversation[]> {
    return fetchApi(`/conversations${featureId ? `?feature_id=${encodeURIComponent(featureId)}` : ""}`, { method: "GET" });
  },

  async get(id: string): Promise<ConversationDetail> {
    return fetchApi(`/conversations/${id}`, { method: "GET" });
  },

  async rename(id: string, title: string): Promise<Conversation> {
    return fetchApi(`/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  /** Thumbs up / down on an AI answer; null clears it. */
  async rateAnswer(id: string, messageId: string, value: AnswerFeedback): Promise<ConversationMessage> {
    return fetchApi(`/conversations/${id}/messages/${messageId}/feedback`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  },

  async remove(id: string): Promise<void> {
    await fetchApi(`/conversations/${id}`, { method: "DELETE" });
  },

  /** Link to a feature and team; pass nulls to unlink. */
  async setLink(id: string, featureId: string | null, discipline: Discipline | null): Promise<Conversation> {
    return fetchApi(`/conversations/${id}/link`, {
      method: "PUT",
      body: JSON.stringify({ feature_id: featureId, discipline }),
    });
  },

  async acceptLink(id: string): Promise<Conversation> {
    return fetchApi(`/conversations/${id}/link/accept`, { method: "POST" });
  },

  async dismissLink(id: string): Promise<Conversation> {
    return fetchApi(`/conversations/${id}/link/dismiss`, { method: "POST" });
  },
};
