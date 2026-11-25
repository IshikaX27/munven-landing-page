"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { documentService } from "../../../services/documents";
import { conversationService } from "../../../services/conversations";
import Markdown from "../../components/Markdown";
import FileViewer, { formatLocation } from "../../components/FileViewer";
import LinkControl from "../../components/LinkControl";
import { disciplineLabel } from "../../components/Disciplines";
import { useWorkspace } from "../../components/WorkspaceContext";
import { errorMessage, useFeedback } from "../../components/Feedback";
import {
  AiAvatar, Avatar, Badge, Button, Card, EmptyState, FileIcon, Icon, IconButton, Skeleton, StatusBadge, TypingDots,
  selectClass,
} from "../../components/ui";
import { AnswerFeedback, DocumentItem, SourceCitation, Conversation, ConversationMessage } from "../../../types/index";

const ACCEPTED_FILE_TYPES = [
  ".pdf", ".docx", ".pptx", ".xlsx", ".xls", ".csv", ".tsv",
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff",
  ".txt", ".md", ".json", ".html", ".htm", ".xml", ".yaml", ".yml", ".rtf", ".log",
];
const MEDIA_FILE_TYPES = [
  ".mp4", ".mov", ".avi", ".webm", ".mpeg", ".mpg", ".wmv", ".flv", ".3gp",
  ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".aiff",
];
const MAX_FILE_SIZE_MB = 25;
const MAX_MEDIA_FILE_SIZE_MB = 500;
// How often the document list is refreshed while files are processing / being classified
const PROCESSING_POLL_MS = 2000;
// Files uploaded at the same time
const PARALLEL_UPLOADS = 3;
// Files finishing within this window share one document-list refresh
const UPLOAD_REFRESH_DEBOUNCE_MS = 600;
// Gemini suggests a feature/team shortly after a document is ready; stop waiting after this
const SUGGESTION_WAIT_MS = 3 * 60 * 1000;

const getExtension = (name: string) => (name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "");
const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
// The API returns UTC timestamps without a zone on SQLite
const parseTime = (iso: string) => new Date(iso.endsWith("Z") || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");

interface UploadItem {
  id: number;
  name: string;
  isMedia?: boolean;
  status: "queued" | "uploading" | "done" | "failed";
  progress?: number;
  error?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  citations?: SourceCitation[];
  timestamp: string;
  author?: string | null;
  feedback?: AnswerFeedback;
}

// Answers still streaming or not yet saved have a temporary id and cannot be rated
const isSaved = (msg: ChatMessage) => !msg.id.startsWith("answer-") && !msg.id.startsWith("local-");

/** The chat as a Markdown file: questions, answers and the sources each answer used. */
const chatToMarkdown = (title: string, messages: ChatMessage[], userName: string) => {
  const lines = [`# ${title}`, "", `_Exported from Munven on ${new Date().toLocaleString()}_`, ""];
  for (const msg of messages) {
    lines.push(`## ${msg.sender === "user" ? msg.author || userName : "Munven AI"} · ${msg.timestamp}`, "", msg.text, "");
    if (msg.citations?.length) {
      lines.push("**Sources**", "");
      for (const cite of msg.citations) {
        const where = formatLocation(cite.location);
        lines.push(`${cite.source_index}. ${cite.document_name}${where ? ` (${where})` : ""}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
};

const downloadText = (filename: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

interface ViewerState {
  documentId: string;
  filename: string;
  fileType: string;
  location?: string | null;
  snippet?: string;
  title?: string;
}

const toChatMessage = (msg: ConversationMessage): ChatMessage => ({
  id: msg.id,
  sender: msg.role === "user" ? "user" : "ai",
  text: msg.content,
  citations: msg.citations || undefined,
  timestamp: formatTime(parseTime(msg.created_at)),
  author: msg.author_name,
  feedback: msg.feedback ?? null,
});

// A ready document Gemini may still be classifying (suggestion not arrived, nothing decided yet)
const awaitingSuggestion = (d: DocumentItem) =>
  d.status === "ready" && !d.feature_id && !d.discipline && !d.suggested_feature_id && !d.suggested_discipline &&
  !d.suggestion_dismissed && Date.now() - parseTime(d.created_at).getTime() < SUGGESTION_WAIT_MS;

export default function Dashboard() {
  const { user, workspace, projects, featureLabel, sidebarSlot } = useWorkspace();
  const { toast, confirm, prompt } = useFeedback();
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Document states
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  // Filters the file list by name (selection is kept for files the filter hides)
  const [docSearch, setDocSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Chat / RAG states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [querying, setQuerying] = useState(false);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  // Ask about one feature: searches only its documents and adds its decision timeline
  const [scopeFeatureId, setScopeFeatureId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const chatPaneRef = useRef<HTMLDivElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  // Upload queue: files waiting to be sent, and whether the sending loop is running
  const pendingUploadsRef = useRef<{ id: number; file: File }[]>([]);
  const uploadRunningRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextUploadIdRef = useRef(0);
  // Bumped whenever the chat on screen changes (new chat / switch), so a slow answer or chat
  // load is not shown in a chat the user has since left
  const chatViewRef = useRef(0);

  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await documentService.getDocuments());
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await conversationService.list());
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  }, []);

  const switchChatView = (conversationId: string | null) => {
    chatViewRef.current += 1;
    setActiveConversationId(conversationId);
    setMessages([]);
    // A question still running belongs to the previous chat; it must not block this one
    setQuerying(false);
    setLoadingConversation(false);
    return chatViewRef.current;
  };

  // Below the wide layout the chat sits under the documents: bring it on screen when a chat is picked
  const showChatOnPhone = () => {
    if (window.matchMedia("(max-width: 1279px)").matches) {
      chatPaneRef.current?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openConversation = async (id: string, featureId?: string | null) => {
    const view = switchChatView(id);
    // A chat that belongs to a feature keeps asking about that feature
    setScopeFeatureId(featureId || "");
    setLoadingConversation(true);
    try {
      const detail = await conversationService.get(id);
      if (chatViewRef.current === view) {
        setMessages(detail.messages.map(toChatMessage));
        setScopeFeatureId(detail.feature_id || "");
      }
    } catch (err: unknown) {
      if (chatViewRef.current === view) toast(errorMessage(err, "Failed to open chat."), "error");
    } finally {
      if (chatViewRef.current === view) setLoadingConversation(false);
    }
  };

  useEffect(() => {
    // Both only set state after their request returns, not synchronously in the effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshDocuments();
    refreshConversations();
    // Links from the Projects page: /dashboard?feature=<id> (ask about a feature) or ?conversation=<id>
    const params = new URLSearchParams(window.location.search);
    const feature = params.get("feature");
    const conversation = params.get("conversation");
    if (conversation) openConversation(conversation);
    else if (feature) setScopeFeatureId(feature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshDocuments, refreshConversations]);

  // Files are processed (and then classified by Gemini) in the background: keep refreshing until done
  const keepPolling = documents.some((d) => d.status === "processing" || awaitingSuggestion(d));
  useEffect(() => {
    if (!keepPolling) return;
    const timer = setInterval(refreshDocuments, PROCESSING_POLL_MS);
    return () => clearInterval(timer);
  }, [keepPolling, refreshDocuments]);

  useEffect(() => {
    const pane = chatPaneRef.current;
    if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const updateUploadItem = (id: number, item: Partial<UploadItem>) =>
    setUploadQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...item } : q)));

  // Sends queued files one at a time; server-side processing continues while the next one uploads
  const runUploadQueue = async () => {
    if (uploadRunningRef.current) return;
    uploadRunningRef.current = true;
    setUploading(true);
    // Several files go up at once (each lane takes the next queued file); the server processes
    // them in parallel too
    const lane = async () => {
      while (pendingUploadsRef.current.length > 0) {
        const { id, file } = pendingUploadsRef.current.shift()!;
        updateUploadItem(id, { status: "uploading", progress: 0 });
        try {
          await documentService.uploadDocument(file, (progress) => updateUploadItem(id, { progress }));
          updateUploadItem(id, { status: "done" });
        } catch (err: unknown) {
          updateUploadItem(id, { status: "failed", error: err instanceof Error ? err.message : "Upload failed" });
        }
        // One list refresh for files finishing close together, not one per file
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(refreshDocuments, UPLOAD_REFRESH_DEBOUNCE_MS);
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, lane));
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await refreshDocuments();
    uploadRunningRef.current = false;
    setUploading(false);
  };

  const handleFileUpload = (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    // Allow choosing the same file again later
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Validate type and size up front so bad files are reported without a round trip
    const items: UploadItem[] = files.map((file) => {
      const id = nextUploadIdRef.current++;
      const ext = getExtension(file.name);
      const isMedia = MEDIA_FILE_TYPES.includes(ext);
      if (!isMedia && !ACCEPTED_FILE_TYPES.includes(ext)) {
        return { id, name: file.name, status: "failed", error: "Unsupported file type" };
      }
      const maxMb = isMedia ? MAX_MEDIA_FILE_SIZE_MB : MAX_FILE_SIZE_MB;
      if (file.size > maxMb * 1024 * 1024) {
        return { id, name: file.name, status: "failed", error: `Larger than ${maxMb} MB` };
      }
      pendingUploadsRef.current.push({ id, file });
      return { id, name: file.name, status: "queued", isMedia };
    });

    // Files added while an upload is running join the same queue instead of being ignored
    setUploadQueue((prev) => (uploadRunningRef.current ? [...prev, ...items] : items));
    runUploadQueue();
  };

  const handleFolderUpload = (fileList: FileList | null) => {
    // Copy first: an input's FileList is live and empties when the input is reset
    const picked = fileList ? Array.from(fileList) : [];
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (picked.length === 0) return;
    const all = picked.filter((f) => !f.name.startsWith("."));
    const supported = all.filter((f) => {
      const ext = getExtension(f.name);
      return ACCEPTED_FILE_TYPES.includes(ext) || MEDIA_FILE_TYPES.includes(ext);
    });
    const skipped = all.length - supported.length;
    if (supported.length === 0) {
      toast("This folder has no files Munven can read.", "error");
      return;
    }
    toast(`Uploading ${supported.length} file${supported.length === 1 ? "" : "s"} from the folder` +
      (skipped ? ` (${skipped} unsupported file${skipped === 1 ? "" : "s"} skipped)` : ""), "info");
    handleFileUpload(supported);
  };

  const handleDeleteDocument = async (doc: DocumentItem) => {
    const ok = await confirm({
      title: "Delete document?",
      message: `"${doc.filename}" and everything the AI learned from it will be removed.`,
      danger: true,
    });
    if (!ok) return;
    try {
      await documentService.deleteDocument(doc.id);
      setSelectedDocIds((prev) => prev.filter((docId) => docId !== doc.id));
      await refreshDocuments();
      toast("Document deleted");
    } catch (err: unknown) {
      toast(errorMessage(err, "Failed to delete document."), "error");
    }
  };

  const toggleSelectDocument = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const startNewChat = () => {
    switchChatView(null);
    setInputQuery("");
    // Wait for the input to be re-enabled before focusing it
    setTimeout(() => queryInputRef.current?.focus(), 0);
  };

  const renameConversation = async (conv: Conversation) => {
    const title = await prompt({ title: "Rename chat", label: "Chat name", defaultValue: conv.title });
    if (!title || title === conv.title) return;
    try {
      await conversationService.rename(conv.id, title);
      await refreshConversations();
    } catch (err: unknown) {
      toast(errorMessage(err, "Failed to rename chat."), "error");
    }
  };

  const deleteConversation = async (conv: Conversation) => {
    if (!(await confirm({ title: "Delete chat?", message: `"${conv.title}" and its messages will be removed.`, danger: true }))) return;
    try {
      await conversationService.remove(conv.id);
      if (conv.id === activeConversationId) startNewChat();
      await refreshConversations();
      toast("Chat deleted");
    } catch (err: unknown) {
      toast(errorMessage(err, "Failed to delete chat."), "error");
    }
  };

  const handleSendQuery = async (preset?: string) => {
    const q = (preset ?? inputQuery).trim();
    if (!q || querying) return;

    const conversationId = activeConversationId;
    const view = chatViewRef.current;
    const now = new Date();
    setMessages((prev) => [
      ...prev,
      { id: `local-${now.getTime()}`, sender: "user", text: q, timestamp: formatTime(now), author: user.name },
    ]);
    setInputQuery("");
    setQuerying(true);
    // The answer bubble appears with the first words and grows while Gemini writes
    const answerId = `answer-${now.getTime()}`;
    const showAnswer = (text: string, citations?: SourceCitation[]) => {
      if (chatViewRef.current !== view) return;
      setMessages((prev) => {
        const answer: ChatMessage = { id: answerId, sender: "ai", text, citations, timestamp: formatTime(new Date()) };
        return prev.some((m) => m.id === answerId)
          ? prev.map((m) => (m.id === answerId ? answer : m))
          : [...prev, answer];
      });
    };

    try {
      const response = await documentService.queryDocumentsStream(
        q,
        (answerSoFar) => showAnswer(answerSoFar),
        selectedDocIds.length > 0 ? selectedDocIds : undefined,
        conversationId,
        scopeFeatureId || null
      );
      // A new chat gets its id from the first answer
      if (chatViewRef.current === view) {
        setActiveConversationId(response.conversation_id);
        showAnswer(response.answer, response.citations);
        // The saved messages' ids replace the temporary ones, so the answer can be rated
        conversationService
          .get(response.conversation_id)
          .then((detail) => {
            if (chatViewRef.current === view) setMessages(detail.messages.map(toChatMessage));
          })
          .catch(() => {});
      }
      await refreshConversations();
      // Gemini suggests which feature the chat belongs to a few seconds later
      setTimeout(refreshConversations, 5000);
      setTimeout(refreshConversations, 12000);
    } catch (err: unknown) {
      // Replaces a half-written answer (nothing was saved) with the error
      showAnswer(`⚠️ Could not answer: ${errorMessage(err)}`);
    } finally {
      if (chatViewRef.current === view) setQuerying(false);
    }
  };

  const copyAnswer = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      toast("Answer copied");
    } catch {
      toast("Could not copy. Select the text and copy it.", "error");
    }
  };

  const rateAnswer = async (msg: ChatMessage, value: "up" | "down") => {
    if (!activeConversationId) return;
    const next: AnswerFeedback = msg.feedback === value ? null : value;
    const setRating = (feedback: AnswerFeedback) =>
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, feedback } : m)));
    setRating(next);
    try {
      await conversationService.rateAnswer(activeConversationId, msg.id, next);
      if (next) toast(next === "up" ? "Thanks for the feedback" : "Thanks. We'll use this to improve answers");
    } catch (err) {
      setRating(msg.feedback ?? null);
      toast(errorMessage(err), "error");
    }
  };

  const exportChat = () => {
    const title = activeConversation?.title || messages[0]?.text.slice(0, 60) || "Munven chat";
    const safeName = title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "munven-chat";
    downloadText(`${safeName}.md`, chatToMarkdown(title, messages, user.name));
  };

  const openCitation = (cite: SourceCitation) => {
    const doc = documents.find((d) => d.id === cite.document_id);
    setViewer({
      documentId: cite.document_id,
      filename: cite.document_name,
      fileType: cite.file_type || doc?.file_type || getExtension(cite.document_name).slice(1),
      location: cite.location,
      snippet: cite.snippet,
      title: `Source ${cite.source_index}`,
    });
  };

  const replaceDocument = (updated: DocumentItem) =>
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
  const replaceConversation = (updated: Conversation) =>
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const hasFeatures = projects.some((p) => p.features.length > 0);
  const scopeDocCount = scopeFeatureId
    ? documents.filter((d) => d.feature_id === scopeFeatureId && d.status === "ready").length
    : 0;

  // Chat history, rendered into the layout's sidebar
  const chatList = (
    <>
      <div className="flex justify-between items-center mb-1.5 px-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {workspace.is_personal ? "Chats" : "Team chats"}
        </span>
        <button
          data-closes-menu
          onClick={() => {
            startNewChat();
            showChatOnPhone();
          }}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium rounded px-1"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          New chat
        </button>
      </div>
      <div className="relative overflow-y-auto -mx-1 px-1 pb-2 space-y-0.5">
        {/* The unsaved chat on screen; it becomes a saved chat after its first answer */}
        {activeConversationId === null && (
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg truncate">
            <Icon name="chat" className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{messages.length > 0 ? messages[0].text : "New chat"}</span>
          </div>
        )}
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-400 px-2 py-2">Your saved chats will appear here.</p>
        ) : (
          conversations.map((conv) => {
            const active = conv.id === activeConversationId;
            const meta = [!workspace.is_personal ? conv.created_by_name : "", conv.feature_id ? featureLabel(conv.feature_id) : ""]
              .filter(Boolean)
              .join(" · ");
            return (
              <div
                key={conv.id}
                className={`group flex items-center rounded-lg transition-colors ${
                  active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <button
                  data-closes-menu
                  onClick={() => {
                    if (!active) openConversation(conv.id, conv.feature_id);
                    showChatOnPhone();
                  }}
                  className="flex-1 min-w-0 flex items-start gap-2 text-left text-sm px-3 py-2"
                  title={conv.title}
                >
                  <Icon name="chat" className={`w-4 h-4 mt-0.5 flex-shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} />
                  <span className="min-w-0">
                    <span className="block truncate">{conv.title}</span>
                    {meta && <span className="block truncate text-[11px] text-gray-400">{meta}</span>}
                  </span>
                </button>
                <div className="hidden group-hover:flex group-focus-within:flex flex-shrink-0 pr-1">
                  <IconButton icon="pencil" label="Rename chat" className="w-7 h-7" onClick={() => renameConversation(conv)} />
                  <IconButton icon="trash" label="Delete chat" variant="danger-ghost" className="w-7 h-7" onClick={() => deleteConversation(conv)} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  const docQuery = docSearch.trim().toLowerCase();
  const shownDocuments = docQuery ? documents.filter((d) => d.filename.toLowerCase().includes(docQuery)) : documents;
  const readyCount = documents.filter((d) => d.status === "ready").length;
  const processingCount = documents.filter((d) => d.status === "processing").length;
  const suggestions = [
    "Summarize the key points of my documents",
    "What are the important dates and deadlines?",
    "List the main risks or open issues mentioned",
  ];

  return (
    <>
      {sidebarSlot && createPortal(chatList, sidebarSlot)}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Documents */}
        <Card className="xl:col-span-2 p-5 flex flex-col">
          <CardTitle
            processing={processingCount}
            ready={readyCount}
            total={documents.length}
            description={
              workspace.is_personal
                ? "Only you can see these files."
                : `Shared with everyone in ${workspace.name}.`
            }
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={[...ACCEPTED_FILE_TYPES, ...MEDIA_FILE_TYPES].join(",")}
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // Lets the browser pick a whole folder (all files inside, including subfolders)
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => handleFolderUpload(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            className={`w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50/60 hover:border-blue-400 hover:bg-blue-50/40"
            }`}
          >
            <span className="mx-auto w-11 h-11 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center shadow-sm">
              <Icon name="upload" className="w-5 h-5" />
            </span>
            <p className="mt-2.5 text-sm font-medium text-gray-900">
              {uploading ? "Uploading… you can add more files" : (
                <>
                  <span className="text-blue-600">Click to upload</span> or drag & drop
                </>
              )}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">Select or drop many files at once — they upload together</p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, Word, PowerPoint, Excel, CSV, images, text · up to {MAX_FILE_SIZE_MB} MB
              <br />
              Video & audio up to {MAX_MEDIA_FILE_SIZE_MB} MB
            </p>
          </button>
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="tap inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-700 rounded-md px-2 py-1 hover:bg-blue-50 transition-colors"
            >
              <Icon name="folder" className="w-3.5 h-3.5" />
              Upload a whole folder
            </button>
          </div>

          {uploadQueue.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">
                {uploadQueue.filter((q) => q.status === "done").length} of {uploadQueue.length} uploaded
                {uploadQueue.some((q) => q.status === "failed") &&
                  ` · ${uploadQueue.filter((q) => q.status === "failed").length} failed`}
              </span>
              {!uploading && (
                <button onClick={() => setUploadQueue([])} className="text-gray-500 hover:text-gray-800">
                  Clear
                </button>
              )}
            </div>
          )}
          {uploadQueue.length > 0 && (
            <ul className="relative mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
              {uploadQueue.map((item) => (
                <li key={item.id} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="truncate text-gray-700">{item.name}</span>
                    <span
                      className={`flex-shrink-0 font-medium ${
                        item.status === "done" ? "text-green-600" : item.status === "failed" ? "text-red-600" : "text-gray-500"
                      }`}
                      title={item.error}
                    >
                      {item.status === "failed"
                        ? `Failed: ${item.error}`
                        : item.status === "done"
                        ? "Uploaded"
                        : item.status === "uploading"
                        ? item.progress && item.progress >= 100
                          ? "Saving…"
                          : `Uploading ${item.progress ?? 0}%`
                        : "Queued"}
                    </span>
                  </div>
                  {item.status === "uploading" && (
                    <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${item.progress ?? 0}%` }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-between items-center mt-5 mb-2">
            <span className="text-sm font-medium text-gray-700">Uploaded files</span>
            {selectedDocIds.length > 0 && (
              <button onClick={() => setSelectedDocIds([])} className="text-xs text-blue-600 hover:underline">
                Clear selection ({selectedDocIds.length})
              </button>
            )}
          </div>

          {documents.length > 3 && (
            <div className="relative mb-2">
              <Icon name="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder={`Search ${documents.length} files`}
                aria-label="Search files by name"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          )}

          {loadingDocs ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState icon="file" title="No documents yet">
              Upload a file above, then ask questions about it in the chat.
            </EmptyState>
          ) : shownDocuments.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No files match &ldquo;{docSearch.trim()}&rdquo;.{" "}
              <button onClick={() => setDocSearch("")} className="text-blue-600 hover:underline">Clear search</button>
            </p>
          ) : (
            <ul className="relative space-y-1.5 overflow-y-auto max-h-[52vh] -mx-1 px-1">
              {/* relative: hidden screen-reader labels in off-screen rows must stay inside this scroll
                  box, otherwise they stretch the whole page */}
              {shownDocuments.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                const isMedia = MEDIA_FILE_TYPES.includes(`.${doc.file_type}`);
                return (
                  <li
                    key={doc.id}
                    className={`group rounded-xl border px-3 py-2.5 transition-colors ${
                      isSelected ? "bg-blue-50/60 border-blue-200" : "border-transparent hover:bg-gray-50 hover:border-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSelectDocument(doc.id)}
                        className="flex-1 min-w-0 flex items-start gap-3 text-left"
                        title="Select to limit questions to this document"
                        aria-pressed={isSelected}
                      >
                        <FileIcon fileType={doc.file_type} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-900 truncate">{doc.filename}</span>
                          <span className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500 mt-0.5">
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.status === "ready" && <span>· {doc.chunk_count} {doc.chunk_count === 1 ? "chunk" : "chunks"}</span>}
                            {!workspace.is_personal && doc.uploaded_by_name && <span>· {doc.uploaded_by_name}</span>}
                            <StatusBadge status={doc.status} media={isMedia} />
                          </span>
                          {doc.status === "failed" && doc.error_message && (
                            <span className="block text-xs text-red-600 mt-1 line-clamp-2" title={doc.error_message}>
                              {doc.error_message}
                            </span>
                          )}
                        </span>
                      </button>
                      <div className="flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                        {doc.has_file && (
                          <IconButton
                            icon="external"
                            label={`Open ${doc.filename}`}
                            onClick={() => setViewer({ documentId: doc.id, filename: doc.filename, fileType: doc.file_type })}
                          />
                        )}
                        {(doc.user_id === user.id || workspace.role !== "member") && (
                          <IconButton icon="trash" label={`Delete ${doc.filename}`} variant="danger-ghost" onClick={() => handleDeleteDocument(doc)} />
                        )}
                      </div>
                    </div>
                    {doc.status === "ready" && (
                      <div className="pl-12">
                        <LinkControl item={doc} itemType="document" onChanged={replaceDocument} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Ask Questions */}
        <Card className="xl:col-span-3 flex flex-col h-[calc(100dvh-8.5rem)] min-h-[32rem] overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{activeConversation?.title || "New chat"}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-1.5 text-sm text-gray-500">
                <label htmlFor="ask-scope" className="text-xs">Ask about</label>
                <select
                  id="ask-scope"
                  value={scopeFeatureId}
                  onChange={(e) => setScopeFeatureId(e.target.value)}
                  className={`${selectClass} h-8 text-xs`}
                >
                  <option value="">
                    {selectedDocIds.length > 0 ? `${selectedDocIds.length} selected document(s)` : "All documents"}
                  </option>
                  {hasFeatures &&
                    projects.map((p) => (
                      <optgroup key={p.id} label={p.name}>
                        {p.features.map((f) => (
                          <option key={f.id} value={f.id}>
                            Feature: {f.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </select>
                {scopeFeatureId && (
                  <Badge tone="blue">
                    {scopeDocCount} file{scopeDocCount === 1 ? "" : "s"} + timeline
                  </Badge>
                )}
              </div>
              {activeConversation && (
                <LinkControl item={activeConversation} itemType="conversation" onChanged={replaceConversation} />
              )}
            </div>
            {(activeConversationId || messages.length > 0) && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {messages.length > 0 && !querying && (
                  <Button
                    variant="secondary" size="sm" icon="download" onClick={exportChat} aria-label="Export"
                    title="Download this chat as a Markdown file" className="max-sm:w-8 max-sm:px-0"
                  >
                    <span className="max-sm:hidden">Export</span>
                  </Button>
                )}
                <Button
                  variant="secondary" size="sm" icon="plus" onClick={startNewChat} aria-label="New chat" title="New chat"
                  className="max-sm:w-8 max-sm:px-0"
                >
                  <span className="max-sm:hidden">New chat</span>
                </Button>
              </div>
            )}
          </div>

          <div ref={chatPaneRef} className="relative flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-gray-50/40">
            {loadingConversation && (
              <div className="space-y-3">
                <Skeleton className="h-12 w-2/3 ml-auto" />
                <Skeleton className="h-24 w-4/5" />
              </div>
            )}
            {!loadingConversation && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <span className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Icon name="sparkles" className="w-6 h-6" />
                </span>
                <h4 className="mt-4 text-lg font-semibold text-gray-900">Ask anything about your documents</h4>
                <p className="text-sm text-gray-500 mt-1 max-w-md">
                  {documents.length > 0
                    ? "Ask a question below to get an answer with source citations. Follow-up questions remember this chat."
                    : "Upload a document to start asking questions."}
                </p>
                {readyCount > 0 && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-lg">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSendQuery(s)}
                        disabled={querying}
                        className="text-sm px-3.5 py-2 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50 transition-colors shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) =>
              msg.sender === "user" ? (
                <div key={msg.id} className="flex justify-end gap-3 animate-fade-in">
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-tr-md bg-blue-600 text-white px-4 py-2.5 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400 text-right">
                      {!workspace.is_personal && msg.author ? `${msg.author} · ` : ""}
                      {msg.timestamp}
                    </p>
                  </div>
                  <Avatar name={msg.author || user.name} />
                </div>
              ) : (
                <div key={msg.id} className="flex gap-3 animate-fade-in">
                  <AiAvatar />
                  <div className="max-w-[85%] min-w-0">
                    <div className="rounded-2xl rounded-tl-md bg-white border border-gray-200/80 px-4 py-3 shadow-sm text-gray-800">
                      <div className="text-sm">
                        <Markdown text={msg.text} />
                      </div>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sources</p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite) => {
                              const where = formatLocation(cite.location);
                              const team = disciplineLabel(cite.discipline);
                              return (
                                <button
                                  key={cite.source_index}
                                  onClick={() => openCitation(cite)}
                                  className="inline-flex items-center gap-1.5 text-xs pl-1 pr-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors max-w-full"
                                  title="Open the source"
                                >
                                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                                    {cite.source_index}
                                  </span>
                                  <span className="truncate min-w-0 max-w-[14rem]">[Source {cite.source_index}] {cite.document_name}</span>
                                  {team && <span className="text-gray-400 whitespace-nowrap flex-shrink-0">· {team}</span>}
                                  {where && <span className="text-gray-400 whitespace-nowrap flex-shrink-0">· {where}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="mr-1">Munven AI · {msg.timestamp}</span>
                      {isSaved(msg) && !msg.text.startsWith("⚠️") && (
                        <>
                          <IconButton icon="copy" label="Copy answer" onClick={() => copyAnswer(msg)} className="w-7 h-7" />
                          <IconButton
                            icon="thumbUp" label="Good answer" aria-pressed={msg.feedback === "up"}
                            onClick={() => rateAnswer(msg, "up")}
                            className={`w-7 h-7 ${msg.feedback === "up" ? "text-green-600 bg-green-50" : ""}`}
                          />
                          <IconButton
                            icon="thumbDown" label="Bad answer" aria-pressed={msg.feedback === "down"}
                            onClick={() => rateAnswer(msg, "down")}
                            className={`w-7 h-7 ${msg.feedback === "down" ? "text-red-600 bg-red-50" : ""}`}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Until the first words of the answer arrive */}
            {querying && messages[messages.length - 1]?.sender !== "ai" && (
              <div className="flex gap-3 animate-fade-in">
                <AiAvatar />
                <div className="rounded-2xl rounded-tl-md bg-white border border-gray-200/80 px-4 py-3 shadow-sm flex items-center gap-3 text-sm text-gray-500">
                  <span className="text-blue-600"><TypingDots /></span>
                  Searching documents and generating answer…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="p-4 border-t border-gray-100 bg-white"
          >
            <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition">
              <input
                ref={queryInputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  documents.length > 0 || scopeFeatureId
                    ? scopeFeatureId
                      ? `Ask about ${featureLabel(scopeFeatureId)}...`
                      : messages.length > 0
                      ? "Ask a follow-up question..."
                      : "Ask a question about your documents..."
                    : "Upload a document first"
                }
                disabled={(documents.length === 0 && !scopeFeatureId) || querying || loadingConversation}
                className="flex-1 min-w-0 h-9 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:text-gray-400"
              />
              <Button
                type="submit"
                size="sm"
                icon="send"
                className="h-9"
                disabled={!inputQuery.trim() || querying || (documents.length === 0 && !scopeFeatureId) || loadingConversation}
              >
                Ask
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-gray-400 text-center">
              Answers come only from your documents, with sources you can open.
            </p>
          </form>
        </Card>
      </div>

      {viewer && <FileViewer {...viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

function CardTitle({ total, ready, processing, description }: { total: number; ready: number; processing: number; description: string }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Icon name="fileText" className="w-4.5 h-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">Documents</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Badge tone="gray">{total} file{total === 1 ? "" : "s"}</Badge>
        {processing > 0 ? <Badge tone="amber">{processing} processing</Badge> : ready > 0 && <Badge tone="green">{ready} ready</Badge>}
      </div>
    </div>
  );
}
