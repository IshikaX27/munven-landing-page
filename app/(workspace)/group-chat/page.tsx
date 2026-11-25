"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { roomService } from "../../../services/room";
import { documentService } from "../../../services/documents";
import Markdown from "../../components/Markdown";
import FileViewer, { formatLocation } from "../../components/FileViewer";
import { disciplineLabel } from "../../components/Disciplines";
import { useWorkspace } from "../../components/WorkspaceContext";
import { errorMessage, useFeedback } from "../../components/Feedback";
import { AiAvatar, Avatar, Badge, Button, Card, EmptyState, Icon, Skeleton, TypingDots, selectClass } from "../../components/ui";
import { RoomMember, RoomMessage, SourceCitation } from "../../../types/index";

// How often the room checks for new questions and answers from the group
const ROOM_POLL_MS = 3000;
const POLL_OVERLAP_MS = 2000;
// After this long an unanswered AI question is treated as failed (e.g. the server restarted)
const ANSWER_WAIT_MS = 3 * 60 * 1000;

// The API returns UTC timestamps without a zone on SQLite
const parseTime = (iso: string) => new Date(iso.endsWith("Z") || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");
const formatTime = (iso: string) => parseTime(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface ViewerState {
  documentId: string;
  filename: string;
  fileType: string;
  location?: string | null;
  snippet?: string;
  title?: string;
}

export default function GroupChatPage() {
  const { user, workspace, workspaces, switchWorkspace, projects, featureLabel } = useWorkspace();
  const { toast } = useFeedback();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [readyDocs, setReadyDocs] = useState(0);
  const [loading, setLoading] = useState(!workspace.is_personal);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [askAi, setAskAi] = useState(true);
  const [scopeFeatureId, setScopeFeatureId] = useState("");
  const [sending, setSending] = useState(false);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  // Current time, refreshed on every poll (used to stop showing "answering…" for stale questions)
  const [now, setNow] = useState(() => Date.now());
  const chatPaneRef = useRef<HTMLDivElement>(null);
  // Local copies of my messages until the server's copy arrives (shown instantly)
  const pendingLocalRef = useRef(0);
  // Newest timestamp seen by polling. Only polls move it: my own post's answer is newer than
  // messages others sent while the AI was answering, and those must still be fetched.
  const pollCursorRef = useRef<string | null>(null);

  // Merge new server messages, replacing my optimistic local copy of the same question
  const mergeMessages = useCallback((incoming: RoomMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      let next = prev;
      let added = false;
      for (const msg of incoming) {
        if (byId.has(msg.id)) continue;
        const localIndex = next.findIndex(
          (m) => m.id.startsWith("local-") && m.user_id === msg.user_id && m.content === msg.content
        );
        next = localIndex >= 0 ? next.map((m, i) => (i === localIndex ? msg : m)) : [...next, msg];
        byId.set(msg.id, msg);
        added = true;
      }
      if (!added) return prev;
      // Keep the room in posting order; my unsent local copies stay at the bottom
      const server = next.filter((m) => !m.id.startsWith("local-"));
      server.sort((a, b) => parseTime(a.created_at).getTime() - parseTime(b.created_at).getTime());
      return [...server, ...next.filter((m) => m.id.startsWith("local-"))];
    });
  }, []);

  const advanceCursor = (msgs: RoomMessage[]) => {
    for (const m of msgs) {
      if (!pollCursorRef.current || parseTime(m.created_at) > parseTime(pollCursorRef.current)) {
        pollCursorRef.current = m.created_at;
      }
    }
  };

  useEffect(() => {
    if (workspace.is_personal) return;
    let cancelled = false;
    Promise.all([roomService.open(), documentService.getDocuments()])
      .then(([room, docs]) => {
        if (cancelled) return;
        setMembers(room.members);
        setMessages(room.messages);
        advanceCursor(room.messages);
        setReadyDocs(docs.filter((d) => d.status === "ready").length);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace.is_personal]);

  // Live updates: fetch everything posted after the newest message polling has seen. A small
  // overlap catches messages saved a moment out of order by concurrent requests (merge skips repeats).
  useEffect(() => {
    if (workspace.is_personal || loading) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      const cursor = pollCursorRef.current;
      const after = cursor
        ? new Date(parseTime(cursor).getTime() - POLL_OVERLAP_MS).toISOString()
        : "2000-01-01T00:00:00Z";
      roomService
        .messagesAfter(after)
        .then((msgs) => {
          advanceCursor(msgs);
          mergeMessages(msgs);
        })
        .catch((err) => console.error("Group chat refresh failed:", err));
    }, ROOM_POLL_MS);
    return () => clearInterval(timer);
  }, [workspace.is_personal, loading, mergeMessages]);

  useEffect(() => {
    const pane = chatPaneRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    const local: RoomMessage = {
      id: `local-${pendingLocalRef.current++}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      user_id: user.id,
      author_name: user.name,
      ask_ai: askAi,
    };
    setMessages((prev) => [...prev, local]);
    try {
      mergeMessages(await roomService.post(content, askAi, scopeFeatureId || null));
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== local.id));
      setText(content);
      toast(errorMessage(err, "Could not send the message."), "error");
    } finally {
      setSending(false);
    }
  };

  const openCitation = (cite: SourceCitation) =>
    setViewer({
      documentId: cite.document_id,
      filename: cite.document_name,
      fileType: cite.file_type || cite.document_name.split(".").pop() || "",
      location: cite.location,
      snippet: cite.snippet,
      title: `Source ${cite.source_index}`,
    });

  // Personal workspace: group chat needs a group
  if (workspace.is_personal) {
    const groups = workspaces.filter((w) => !w.is_personal);
    return (
      <Card className="max-w-2xl mx-auto p-2">
        <EmptyState
          icon="groupChat"
          title="Group chat"
          action={
            <div className="flex flex-col items-center gap-4">
              {groups.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {groups.map((g) => (
                    <Button key={g.id} icon="users" onClick={() => switchWorkspace(g.id)}>
                      {g.name}
                    </Button>
                  ))}
                </div>
              )}
              <Link href="/team" className="tap inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
                <Icon name="plus" className="w-4 h-4" />
                Create a group and add people
              </Link>
            </div>
          }
        >
          A shared place where your whole group asks questions about its documents and everyone sees the answers.
          {groups.length > 0 ? " Open the chat of one of your groups:" : " You are not in any group yet."}
        </EmptyState>
      </Card>
    );
  }

  const answered = new Set(messages.filter((m) => m.role === "assistant" && m.reply_to).map((m) => m.reply_to));
  const byId = new Map(messages.map((m) => [m.id, m]));
  const hasFeatures = projects.some((p) => p.features.length > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Chat */}
      <Card className="xl:col-span-3 flex flex-col h-[calc(100dvh-8.5rem)] min-h-[32rem] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Icon name="groupChat" className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{workspace.name} · Group chat</h3>
            <p className="text-sm text-gray-500 truncate">
              Everyone in the group sees every question and answer. The AI answers from the group&apos;s documents.
            </p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
          </span>
        </div>

        <div ref={chatPaneRef} className="relative flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-gray-50/40">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-12 w-1/2" />
              <Skeleton className="h-20 w-3/4" />
              <Skeleton className="h-12 w-1/3 ml-auto" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && messages.length === 0 && (
            <EmptyState icon="groupChat" title="No messages yet">
              Ask the first question, everyone in {workspace.name} will see it.
            </EmptyState>
          )}

          {messages.map((msg, index) => {
            if (msg.role === "assistant") {
              const question = msg.reply_to ? byId.get(msg.reply_to) : undefined;
              // Show which question this answers when other messages came in between
              const showContext = question && messages[index - 1]?.id !== question.id;
              return (
                <div key={msg.id} className="flex gap-3 animate-fade-in">
                  <AiAvatar />
                  <div className="max-w-[85%] min-w-0">
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      Munven AI
                      {showContext && (
                        <span className="font-normal text-gray-500">
                          {" "}↳ answering {question.author_name}: &ldquo;{question.content.slice(0, 60)}
                          {question.content.length > 60 ? "…" : ""}&rdquo;
                        </span>
                      )}
                    </p>
                    <div className="rounded-2xl rounded-tl-md bg-white border border-gray-200/80 px-4 py-3 shadow-sm text-gray-800">
                      <div className="text-sm">
                        <Markdown text={msg.content} />
                      </div>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                          {msg.citations.map((cite) => {
                            const where = formatLocation(cite.location);
                            const team = disciplineLabel(cite.discipline);
                            return (
                              <button
                                key={cite.source_index}
                                onClick={() => openCitation(cite)}
                                className="inline-flex items-center gap-1.5 text-xs pl-1 pr-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              >
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
                                  {cite.source_index}
                                </span>
                                <span className="truncate max-w-[14rem]">[Source {cite.source_index}] {cite.document_name}</span>
                                {team && <span className="text-gray-400">· {team}</span>}
                                {where && <span className="text-gray-400">· {where}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              );
            }

            const mine = msg.user_id === user.id;
            const waiting =
              msg.ask_ai && !answered.has(msg.id) && now - parseTime(msg.created_at).getTime() < ANSWER_WAIT_MS;
            return (
              <div key={msg.id} className="animate-fade-in">
                <div className={`flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && <Avatar name={msg.author_name} />}
                  <div className="max-w-[75%]">
                    {!mine && <p className="text-xs font-semibold text-gray-700 mb-1">{msg.author_name}</p>}
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        mine ? "bg-blue-600 text-white rounded-tr-md" : "bg-white border border-gray-200/80 text-gray-800 rounded-tl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <p className={`mt-1 text-[11px] text-gray-400 flex items-center gap-1 ${mine ? "justify-end" : ""}`}>
                      <Icon name={msg.ask_ai ? "sparkles" : "users"} className="w-3 h-3" />
                      {msg.ask_ai ? "Asked AI" : "To the group"} · {formatTime(msg.created_at)}
                    </p>
                  </div>
                  {mine && <Avatar name={user.name} />}
                </div>
                {waiting && (
                  <div className={`mt-2 flex items-center gap-2 text-xs text-blue-600 ${mine ? "justify-end mr-12" : "ml-12"}`}>
                    <TypingDots />
                    Munven AI is answering {mine ? "you" : msg.author_name}…
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-4 border-t border-gray-100 bg-white space-y-2.5"
        >
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5" role="group" aria-label="Who the message is for">
              <button
                type="button"
                onClick={() => setAskAi(true)}
                aria-pressed={askAi}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition ${
                  askAi ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon name="sparkles" className="w-3.5 h-3.5" /> Ask AI
              </button>
              <button
                type="button"
                onClick={() => setAskAi(false)}
                aria-pressed={!askAi}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition ${
                  !askAi ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon name="users" className="w-3.5 h-3.5" /> Message group
              </button>
            </div>
            {askAi && hasFeatures && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                About
                <select value={scopeFeatureId} onChange={(e) => setScopeFeatureId(e.target.value)} className={`${selectClass} h-8 text-xs`}>
                  <option value="">All group documents</option>
                  {projects.map((p) => (
                    <optgroup key={p.id} label={p.name}>
                      {p.features.map((f) => (
                        <option key={f.id} value={f.id}>
                          Feature: {f.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}
            {!askAi && <span className="text-xs text-gray-400">The AI will not answer this message.</span>}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                askAi
                  ? scopeFeatureId
                    ? `Ask the AI about ${featureLabel(scopeFeatureId)}...`
                    : "Ask the AI a question, the whole group will see it..."
                  : `Message ${workspace.name}...`
              }
              disabled={loading || !!error}
              className="flex-1 min-w-0 h-9 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <Button type="submit" size="sm" icon="send" className="h-9" disabled={!text.trim() || loading || !!error} loading={sending}>
              {sending && askAi ? "Asking..." : "Send"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Group info */}
      <aside className="space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Members</h4>
            <Badge tone="gray">{members.length}</Badge>
          </div>
          <ul className="space-y-2.5">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2.5 text-sm">
                <Avatar name={m.name} size="sm" />
                <span className="text-gray-800 truncate">
                  {m.name}
                  {m.user_id === user.id && <span className="text-gray-400"> (you)</span>}
                </span>
                <span className="ml-auto text-[11px] text-gray-400 capitalize">{m.role}</span>
              </li>
            ))}
          </ul>
          {workspace.role !== "member" && (
            <Link href="/team" className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
              <Icon name="plus" className="w-4 h-4" />
              Add people
            </Link>
          )}
        </Card>

        <Card className="p-5">
          <h4 className="font-semibold text-gray-900 mb-1">Group documents</h4>
          <p className="text-sm text-gray-500 mb-3">
            The AI answers from the {readyDocs} document{readyDocs === 1 ? "" : "s"} shared in this group.
          </p>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
            <Icon name="upload" className="w-4 h-4" />
            Upload documents
          </Link>
        </Card>
      </aside>

      {viewer && <FileViewer {...viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}
