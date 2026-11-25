import { fetchApi } from "./api";

export interface AdminDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  chunk_count: number;
  workspace: string;
  uploaded_by?: string | null;
  created_at: string;
}

export interface AdminConversation {
  id: string;
  title: string;
  workspace: string;
  created_by?: string | null;
  message_count: number;
  updated_at: string;
}

export interface AdminGroupMessage {
  id: string;
  group: string;
  author?: string | null;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  owner?: string | null;
  member_count: number;
  document_count: number;
  created_at: string;
}

// The API accepts at most 1000 ids per request; "select all" on a big list is sent in batches
const DELETE_BATCH = 500;

const bulkDelete = async (path: string, ids: string[]): Promise<number> => {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const result: { deleted: number } = await fetchApi(path, {
      method: "POST",
      body: JSON.stringify({ ids: ids.slice(i, i + DELETE_BATCH) }),
    });
    deleted += result.deleted;
  }
  return deleted;
};

/** Company admin data management: everything in the database, with permanent deletes. */
export const adminService = {
  documents: (): Promise<AdminDocument[]> => fetchApi("/admin/documents", { method: "GET" }),
  deleteDocuments: (ids: string[]) => bulkDelete("/admin/documents/delete", ids),

  conversations: (): Promise<AdminConversation[]> => fetchApi("/admin/conversations", { method: "GET" }),
  deleteConversations: (ids: string[]) => bulkDelete("/admin/conversations/delete", ids),

  groupMessages: (): Promise<AdminGroupMessage[]> => fetchApi("/admin/group-messages", { method: "GET" }),
  deleteGroupMessages: (ids: string[]) => bulkDelete("/admin/group-messages/delete", ids),

  groups: (): Promise<AdminGroup[]> => fetchApi("/admin/groups", { method: "GET" }),
  deleteGroup: (id: string): Promise<void> => fetchApi(`/admin/groups/${id}`, { method: "DELETE" }),

  deleteEmployee: (id: string): Promise<void> => fetchApi(`/admin/employees/${id}`, { method: "DELETE" }),
};
