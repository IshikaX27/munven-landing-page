import { Discipline, DocumentItem, DocumentQueryResponse, FileLink } from "../types";
import { API_URL, fetchApi, getAuthHeaders, throwApiError } from "./api";

export const documentService = {
  /**
   * Uploads a file to the active workspace. Uses XMLHttpRequest because fetch cannot report
   * upload progress, which matters for large videos. `onProgress` receives 0-100.
   */
  uploadDocument(file: File, onProgress?: (percent: number) => void): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("file", file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/api/v1/documents/upload`);
      // Sends the session cookie
      xhr.withCredentials = true;
      Object.entries(getAuthHeaders()).forEach(([name, value]) => xhr.setRequestHeader(name, value));

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
          return;
        }
        // Reuse the shared error handling (readable message, redirect on expired login)
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          headers: { "Content-Type": "application/json" },
        });
        throwApiError(response, "Failed to upload document").catch(reject);
      };
      xhr.onerror = () => reject(new Error("Network error while uploading. Is the backend running?"));
      xhr.send(formData);
    });
  },

  async getDocuments(featureId?: string): Promise<DocumentItem[]> {
    return fetchApi(`/documents${featureId ? `?feature_id=${encodeURIComponent(featureId)}` : ""}`, { method: "GET" });
  },

  async deleteDocument(documentId: string): Promise<void> {
    await fetchApi(`/documents/${documentId}`, { method: "DELETE" });
  },

  /** Link to a feature and team; pass nulls to unlink. */
  async setLink(documentId: string, featureId: string | null, discipline: Discipline | null): Promise<DocumentItem> {
    return fetchApi(`/documents/${documentId}/link`, {
      method: "PUT",
      body: JSON.stringify({ feature_id: featureId, discipline }),
    });
  },

  async acceptLink(documentId: string): Promise<DocumentItem> {
    return fetchApi(`/documents/${documentId}/link/accept`, { method: "POST" });
  },

  async dismissLink(documentId: string): Promise<DocumentItem> {
    return fetchApi(`/documents/${documentId}/link/dismiss`, { method: "POST" });
  },

  /** Absolute, short-lived URL for viewing a document's original file. */
  async getFileUrl(documentId: string): Promise<string> {
    const link: FileLink = await fetchApi(`/documents/${documentId}/file-link`, { method: "POST" });
    return `${API_URL}${link.url}`;
  },

  /**
   * Asks a question and streams the answer: onText receives the answer so far each time Gemini
   * writes more. Resolves with the saved exchange (same shape as queryDocuments).
   */
  async queryDocumentsStream(
    query: string,
    onText: (answerSoFar: string) => void,
    documentIds?: string[],
    conversationId?: string | null,
    featureId?: string | null
  ): Promise<DocumentQueryResponse> {
    const response = await fetch(`${API_URL}/api/v1/documents/query/stream`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        query,
        document_ids: documentIds && documentIds.length > 0 ? documentIds : undefined,
        conversation_id: conversationId || undefined,
        feature_id: featureId || undefined,
        top_k: 5,
      }),
    });
    if (!response.ok || !response.body) await throwApiError(response, "Failed to get an answer");

    // Newline-delimited JSON: {"type":"delta","text"}..., then {"type":"done",...} or {"type":"error"}
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let answer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buffer += value;
      const lines = buffer.split("\n");
      buffer = done ? "" : lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "delta") {
          answer += event.text;
          onText(answer);
        } else if (event.type === "error") {
          throw new Error(event.message || "The answer could not be completed.");
        } else if (event.type === "done") {
          const { type: _type, ...result } = event;
          void _type;
          return result as DocumentQueryResponse;
        }
      }
      if (done) break;
    }
    throw new Error("The connection closed before the answer finished.");
  },

  async queryDocuments(
    query: string,
    documentIds?: string[],
    conversationId?: string | null,
    featureId?: string | null
  ): Promise<DocumentQueryResponse> {
    return fetchApi("/documents/query", {
      method: "POST",
      body: JSON.stringify({
        query,
        document_ids: documentIds && documentIds.length > 0 ? documentIds : undefined,
        conversation_id: conversationId || undefined,
        feature_id: featureId || undefined,
        top_k: 5,
      }),
    });
  },
};
