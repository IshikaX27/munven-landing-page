"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  adminService, AdminConversation, AdminDocument, AdminGroup, AdminGroupMessage,
} from "../../../services/admin";
import { companyService } from "../../../services/company";
import { useWorkspace } from "../../components/WorkspaceContext";
import { useFeedback } from "../../components/Feedback";
import { StatusBadge } from "../../components/ui";
import { Employee } from "../../../types/index";

type Tab = "documents" | "chats" | "messages" | "groups" | "employees";

const TABS: { id: Tab; label: string }[] = [
  { id: "documents", label: "Documents" },
  { id: "chats", label: "Chats" },
  { id: "messages", label: "Group chat messages" },
  { id: "groups", label: "Groups" },
  { id: "employees", label: "Employees" },
];

// The API returns UTC timestamps without a zone on SQLite
const parseTime = (iso: string) => new Date(iso.endsWith("Z") || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");
const formatDate = (iso: string) => parseTime(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

interface Column<T> {
  label: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  search: (row: T) => string;
  /** Bulk delete of the selected rows; omit for per-row deletes only */
  onDeleteSelected?: (ids: string[]) => Promise<void>;
  /** Per-row action (e.g. delete a group); may be hidden for some rows */
  rowAction?: (row: T) => ReactNode;
  empty: string;
}

function DataTable<T extends { id: string }>({ rows, columns, search, onDeleteSelected, rowAction, empty }: TableProps<T>) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { confirm } = useFeedback();

  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => !q || search(r).toLowerCase().includes(q));
  const visibleSelected = selected.filter((id) => shown.some((r) => r.id === id));
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.includes(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelected(allShownSelected ? selected.filter((id) => !shown.some((r) => r.id === id)) : [...new Set([...selected, ...shown.map((r) => r.id)])]);

  const deleteSelected = async () => {
    if (!onDeleteSelected || visibleSelected.length === 0) return;
    if (!(await confirm({
      title: `Delete ${visibleSelected.length} item(s)?`,
      message: "This is permanent and cannot be undone.",
      danger: true,
    }))) return;
    setBusy(true);
    try {
      await onDeleteSelected(visibleSelected);
      setSelected([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center gap-3 mb-3 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 w-full sm:w-64"
        />
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {onDeleteSelected && shown.length > 0 && (
            <label className="md:hidden inline-flex items-center gap-2">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAll} />
              All
            </label>
          )}
          <span>{shown.length} of {rows.length}</span>
          {onDeleteSelected && (
            <button
              onClick={deleteSelected}
              disabled={busy || visibleSelected.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-40"
            >
              {busy ? "Deleting..." : `Delete selected (${visibleSelected.length})`}
            </button>
          )}
        </div>
      </div>
      {/* On phones each row is a stacked card with a small label per field */}
      <div className="border border-gray-100 rounded-lg overflow-x-auto">
        <table className="w-full text-sm block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              {onDeleteSelected && (
                <th className="py-2 px-3 w-8">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.label} className="py-2 px-3 font-medium">{c.label}</th>
              ))}
              {rowAction && <th className="py-2 px-3" />}
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {shown.length === 0 && (
              <tr className="block md:table-row">
                <td colSpan={columns.length + 2} className="block md:table-cell py-6 px-3 text-center text-gray-500">{rows.length ? "No matches." : empty}</td>
              </tr>
            )}
            {shown.map((row) => (
              <tr
                key={row.id}
                className={`relative block md:table-row py-2 md:py-0 border-b border-gray-100 md:border-gray-50 ${
                  onDeleteSelected ? "pl-8 md:pl-0" : ""
                } ${selected.includes(row.id) ? "bg-red-50/50" : ""}`}
              >
                {onDeleteSelected && (
                  <td className="absolute left-3 top-3 md:static md:table-cell md:py-2 md:px-3">
                    <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
                  </td>
                )}
                {columns.map((c, i) => (
                  <td key={c.label} className="block md:table-cell py-0.5 md:py-2 px-3 text-gray-700 align-top break-words">
                    {i > 0 && <span className="md:hidden text-xs text-gray-400">{c.label}: </span>}
                    {c.render(row)}
                  </td>
                ))}
                {rowAction && <td className="block md:table-cell py-1 md:py-2 px-3 md:text-right whitespace-nowrap">{rowAction(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function DataPage() {
  const { user, refreshWorkspaces } = useWorkspace();
  const { confirm, toast } = useFeedback();
  const [tab, setTab] = useState<Tab>("documents");
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [chats, setChats] = useState<AdminConversation[]>([]);
  const [messages, setMessages] = useState<AdminGroupMessage[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [d, c, m, g, e] = await Promise.all([
      adminService.documents(), adminService.conversations(), adminService.groupMessages(),
      adminService.groups(), companyService.employees(),
    ]);
    setDocuments(d); setChats(c); setMessages(m); setGroups(g); setEmployees(e);
  }, []);

  useEffect(() => {
    if (!user.is_admin) return;
    let cancelled = false;
    Promise.all([
      adminService.documents(), adminService.conversations(), adminService.groupMessages(),
      adminService.groups(), companyService.employees(),
    ])
      .then(([d, c, m, g, e]) => {
        if (cancelled) return;
        setDocuments(d); setChats(c); setMessages(m); setGroups(g); setEmployees(e);
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user.is_admin]);

  if (!user.is_admin) {
    return (
      <section className="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm max-w-2xl">
        <h3 className="text-xl font-bold text-gray-800 mb-1">Data</h3>
        <p className="text-gray-600">Only company admins can manage data.</p>
      </section>
    );
  }

  // Runs a delete, reloads everything (deletes cascade across tabs) and reports the result
  const run = async (action: () => Promise<string>) => {
    setError(null);
    try {
      toast(await action());
      await loadAll();
      await refreshWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const counts: Record<Tab, number> = {
    documents: documents.length, chats: chats.length, messages: messages.length,
    groups: groups.length, employees: employees.length,
  };

  return (
    <section className="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">Data</h3>
        <p className="text-sm text-gray-500">
          Everything stored in Munven across all groups and Personal workspaces. Deletes are permanent and also remove
          what depends on the item (files, AI search data, timeline entries).
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
              tab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label} <span className="text-gray-400">({counts[t.id]})</span>
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {tab === "documents" && (
        <DataTable
          rows={documents}
          empty="No documents."
          search={(d) => `${d.filename} ${d.workspace} ${d.uploaded_by || ""}`}
          columns={[
            { label: "File", render: (d) => <span className="font-medium text-gray-800">{d.filename}</span> },
            { label: "Where", render: (d) => d.workspace },
            { label: "Uploaded by", render: (d) => d.uploaded_by || "—" },
            { label: "Size", render: (d) => `${formatSize(d.file_size)} · ${d.chunk_count} ${d.chunk_count === 1 ? "chunk" : "chunks"}` },
            { label: "Status", render: (d) => <StatusBadge status={d.status} /> },
            { label: "Uploaded", render: (d) => formatDate(d.created_at) },
          ]}
          onDeleteSelected={(ids) =>
            run(async () => `Deleted ${await adminService.deleteDocuments(ids)} document(s) with their files and search data.`)
          }
        />
      )}

      {tab === "chats" && (
        <DataTable
          rows={chats}
          empty="No chats."
          search={(c) => `${c.title} ${c.workspace} ${c.created_by || ""}`}
          columns={[
            { label: "Chat", render: (c) => <span className="font-medium text-gray-800">{c.title}</span> },
            { label: "Where", render: (c) => c.workspace },
            { label: "Started by", render: (c) => c.created_by || "—" },
            { label: "Messages", render: (c) => c.message_count },
            { label: "Last active", render: (c) => formatDate(c.updated_at) },
          ]}
          onDeleteSelected={(ids) => run(async () => `Deleted ${await adminService.deleteConversations(ids)} chat(s).`)}
        />
      )}

      {tab === "messages" && (
        <DataTable
          rows={messages}
          empty="No group chat messages."
          search={(m) => `${m.content} ${m.group} ${m.author || ""}`}
          columns={[
            { label: "Group", render: (m) => m.group },
            { label: "From", render: (m) => m.author || "—" },
            { label: "Message", render: (m) => <span className="line-clamp-2 max-w-xl block">{m.content}</span> },
            { label: "Sent", render: (m) => formatDate(m.created_at) },
          ]}
          onDeleteSelected={(ids) =>
            run(async () => `Deleted ${await adminService.deleteGroupMessages(ids)} message(s) (questions include their AI answers).`)
          }
        />
      )}

      {tab === "groups" && (
        <DataTable
          rows={groups}
          empty="No groups."
          search={(g) => `${g.name} ${g.owner || ""}`}
          columns={[
            { label: "Group", render: (g) => <span className="font-medium text-gray-800">{g.name}</span> },
            { label: "Owner", render: (g) => g.owner || "—" },
            { label: "Members", render: (g) => g.member_count },
            { label: "Documents", render: (g) => g.document_count },
            { label: "Created", render: (g) => formatDate(g.created_at) },
          ]}
          rowAction={(g) => (
            <button
              onClick={async () =>
                (await confirm({
                  title: `Delete the group "${g.name}"?`,
                  message: `All its ${g.document_count} document(s), chats, projects and timeline will be deleted. This cannot be undone.`,
                  danger: true,
                  confirmLabel: "Delete group",
                })) &&
                run(async () => {
                  await adminService.deleteGroup(g.id);
                  return `Deleted the group "${g.name}".`;
                })
              }
              className="text-xs text-red-600 hover:underline"
            >
              Delete group
            </button>
          )}
        />
      )}

      {tab === "employees" && (
        <DataTable
          rows={employees}
          empty="No employees."
          search={(e) => `${e.name} ${e.email} ${e.status}`}
          columns={[
            { label: "Name", render: (e) => <span className="font-medium text-gray-800">{e.name}{e.id === user.id ? " (you)" : ""}</span> },
            { label: "Email", render: (e) => e.email },
            { label: "Status", render: (e) => <StatusBadge status={e.status} /> },
            { label: "Admin", render: (e) => (e.is_admin ? "yes" : "") },
          ]}
          rowAction={(e) =>
            e.id === user.id ? null : (
              <button
                onClick={async () =>
                  (await confirm({
                    title: `Permanently delete ${e.name}?`,
                    message: `${e.email}\n\nTheir Personal workspace, the documents they uploaded and the chats they started are deleted too. Groups they own are transferred to you. This cannot be undone.\n\nTo only block access, use Deactivate on the Company page instead.`,
                    danger: true,
                    confirmLabel: "Delete permanently",
                  })) &&
                  run(async () => {
                    await adminService.deleteEmployee(e.id);
                    return `Deleted ${e.name} and their data.`;
                  })
                }
                className="text-xs text-red-600 hover:underline"
              >
                Delete permanently
              </button>
            )
          }
        />
      )}
    </section>
  );
}
