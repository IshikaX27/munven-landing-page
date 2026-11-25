"use client";

import { useEffect, useRef, useState } from "react";
import { documentService } from "../../services/documents";
import { Button, EmptyState, FileIcon, Icon, Spinner } from "./ui";

// .ogg can be audio or video; a <video> element plays both
const VIDEO_TYPES = ["mp4", "webm", "mov", "ogg", "mpeg", "mpg", "avi", "wmv", "flv", "3gp"];
const AUDIO_TYPES = ["mp3", "wav", "m4a", "aac", "flac", "aiff"];
const IMAGE_TYPES = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];
// Shown inside an iframe by the browser itself
const FRAME_TYPES = ["pdf", "txt", "md", "json", "html", "htm", "xml", "csv", "tsv", "log", "yaml", "yml"];

/** "page:3" -> "Page 3", "time:65" -> "01:05", "sheet:Sales" -> "Sheet: Sales" */
export const formatLocation = (location?: string | null): string => {
  if (!location || !location.includes(":")) return "";
  const [kind, ...rest] = location.split(":");
  const value = rest.join(":");
  if (kind === "time") {
    const total = parseInt(value, 10);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
  if (kind === "sheet") return `Sheet: ${value}`;
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${value}`;
};

interface FileViewerProps {
  documentId: string;
  filename: string;
  fileType: string;
  location?: string | null;
  snippet?: string;
  title?: string;
  onClose: () => void;
}

export default function FileViewer({ documentId, filename, fileType, location, snippet, title, onClose }: FileViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  const type = fileType.toLowerCase();
  const startSeconds = location?.startsWith("time:") ? parseInt(location.slice(5), 10) : 0;
  const page = location?.startsWith("page:") ? location.slice(5) : null;

  useEffect(() => {
    let cancelled = false;
    documentService
      .getFileUrl(documentId)
      .then((fileUrl) => !cancelled && setUrl(fileUrl))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const seekToLocation = () => {
    if (mediaRef.current && startSeconds > 0) mediaRef.current.currentTime = startSeconds;
  };

  const renderPreview = () => {
    if (error) {
      return (
        <div className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <Icon name="info" className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
          {error}
        </div>
      );
    }
    if (!url) {
      return (
        <div className="h-48 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Spinner className="w-4 h-4 text-blue-600" /> Loading file...
        </div>
      );
    }

    if (VIDEO_TYPES.includes(type)) {
      return (
        <video ref={mediaRef} src={url} controls autoPlay className="w-full max-h-[62vh] rounded-xl bg-black" onLoadedMetadata={seekToLocation} />
      );
    }
    if (AUDIO_TYPES.includes(type)) {
      return <audio ref={mediaRef} src={url} controls autoPlay className="w-full" onLoadedMetadata={seekToLocation} />;
    }
    if (IMAGE_TYPES.includes(type)) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt={filename} className="max-h-[62vh] mx-auto rounded-xl" />;
    }
    if (FRAME_TYPES.includes(type)) {
      return (
        <iframe
          src={page ? `${url}#page=${page}` : url}
          title={filename}
          className="w-full h-[62vh] rounded-xl border border-gray-200 bg-gray-50"
        />
      );
    }
    return (
      <EmptyState icon="file" title="No preview for this file type">
        {type.toUpperCase()} files can&apos;t be previewed in the browser. Use Download to open it.
      </EmptyState>
    );
  };

  const where = formatLocation(location);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || filename}
        className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-4 px-5 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon fileType={type} />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{title || filename}</h3>
              <p className="text-sm text-gray-500 truncate">
                {filename}
                {where && <span className="ml-1.5 text-blue-600 font-medium">· {where}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {url && (
              <a
                href={`${url}?download=true`}
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                Download
              </a>
            )}
            <Button variant="secondary" size="sm" icon="close" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="p-5">
          {snippet && (
            <div className="mb-4 rounded-xl bg-blue-50/50 border border-blue-100 p-3.5">
              <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Quoted passage</p>
              <p className="text-sm text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">{snippet}</p>
            </div>
          )}
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
