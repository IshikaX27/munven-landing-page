"use client";

/**
 * App-wide toasts and dialogs that replace the browser's alert / confirm / prompt:
 *   const { toast, confirm, prompt } = useFeedback();
 *   toast("Saved");                                   // or toast(msg, "error")
 *   if (await confirm({ title, message, danger: true })) ...
 *   const name = await prompt({ title: "Rename chat", defaultValue: conv.title });
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button, Icon, IconName, inputClass } from "./ui";

type Tone = "success" | "error" | "info";

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  multiline?: boolean;
}

interface FeedbackValue {
  toast: (message: string, tone?: Tone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function useFeedback(): FeedbackValue {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return value;
}

/** Message of an unknown error, for toasts. */
export const errorMessage = (err: unknown, fallback = "Something went wrong.") =>
  err instanceof Error && err.message ? err.message : fallback;

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

type Dialog =
  | ({ kind: "confirm"; resolve: (ok: boolean) => void } & ConfirmOptions)
  | ({ kind: "prompt"; resolve: (value: string | null) => void } & PromptOptions);

const TOAST_STYLE: Record<Tone, { icon: IconName; className: string }> = {
  success: { icon: "check", className: "text-green-600 bg-green-50" },
  error: { icon: "alert", className: "text-red-600 bg-red-50" },
  info: { icon: "info", className: "text-blue-600 bg-blue-50" },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const nextId = useRef(0);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);

  // The dialog on screen, also kept in a ref so opening a new one can cancel it
  const openDialogRef = useRef<Dialog | null>(null);
  const showDialog = useCallback((next: Dialog) => {
    // Only one dialog at a time: a replaced dialog counts as cancelled, so its caller never hangs
    const previous = openDialogRef.current;
    if (previous) {
      if (previous.kind === "confirm") previous.resolve(false);
      else previous.resolve(null);
    }
    openDialogRef.current = next;
    setDialog(next);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => showDialog({ kind: "confirm", resolve, ...options })),
    [showDialog]
  );

  const prompt = useCallback(
    (options: PromptOptions) => {
      setPromptValue(options.defaultValue || "");
      return new Promise<string | null>((resolve) => showDialog({ kind: "prompt", resolve, ...options }));
    },
    [showDialog]
  );

  const close = useCallback(
    (result: boolean) => {
      if (!dialog) return;
      if (dialog.kind === "confirm") dialog.resolve(result);
      // Saving an emptied field returns "" (e.g. to clear a description); only Cancel returns null
      else dialog.resolve(result ? promptValue.trim() : null);
      openDialogRef.current = null;
      setDialog(null);
    },
    [dialog, promptValue]
  );

  // Escape cancels the open dialog
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="animate-fade-in flex items-start gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${TOAST_STYLE[t.tone].className}`}>
              <Icon name={TOAST_STYLE[t.tone].icon} className="w-4 h-4" />
            </span>
            <p className="text-sm text-gray-800 pt-1 flex-1">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-gray-400 hover:text-gray-600 pt-1"
              aria-label="Dismiss"
            >
              <Icon name="close" className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm / prompt dialog */}
      {dialog && (
        <div className="fixed inset-0 z-[70] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => close(false)}>
          <form
            role="dialog"
            aria-modal="true"
            className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              close(true);
            }}
          >
            <div className="flex items-start gap-3">
              {dialog.kind === "confirm" && (
                <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${dialog.danger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                  <Icon name={dialog.danger ? "alert" : "info"} className="w-5 h-5" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{dialog.title}</h3>
                {dialog.kind === "confirm" && dialog.message && (
                  <div className="mt-1.5 text-sm text-gray-600 whitespace-pre-line">{dialog.message}</div>
                )}
                {dialog.kind === "prompt" && (
                  <div className="mt-3">
                    {dialog.label && <label className="block text-sm font-medium text-gray-700 mb-1">{dialog.label}</label>}
                    {dialog.multiline ? (
                      <textarea
                        autoFocus
                        rows={3}
                        value={promptValue}
                        placeholder={dialog.placeholder}
                        onChange={(e) => setPromptValue(e.target.value)}
                        className={`${inputClass} h-auto py-2`}
                      />
                    ) : (
                      <input
                        autoFocus
                        value={promptValue}
                        placeholder={dialog.placeholder}
                        onChange={(e) => setPromptValue(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className={inputClass}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                autoFocus={dialog.kind === "confirm"}
                variant={dialog.kind === "confirm" && dialog.danger ? "danger" : "primary"}
                disabled={dialog.kind === "prompt" && !dialog.multiline && !promptValue.trim()}
              >
                {dialog.confirmLabel || (dialog.kind === "confirm" ? (dialog.danger ? "Delete" : "Confirm") : "Save")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
