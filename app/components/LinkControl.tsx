"use client";

import { useState } from "react";
import { documentService } from "../../services/documents";
import { conversationService } from "../../services/conversations";
import { Discipline, LinkFields } from "../../types/index";
import { DISCIPLINES, DisciplineBadge, disciplineLabel } from "./Disciplines";
import { useWorkspace } from "./WorkspaceContext";
import { errorMessage, useFeedback } from "./Feedback";
import { Button, Icon, selectClass } from "./ui";

type ItemType = "document" | "conversation";

const service = (type: ItemType) => (type === "document" ? documentService : conversationService);

interface LinkEditorProps {
  featureId?: string | null;
  discipline?: Discipline | null;
  onSave: (featureId: string | null, discipline: Discipline | null) => Promise<void>;
  onClose: () => void;
}

/** Choose the feature (grouped by project) and team an item belongs to. */
export function LinkEditor({ featureId, discipline, onSave, onClose }: LinkEditorProps) {
  const { projects } = useWorkspace();
  const [feature, setFeature] = useState(featureId || "");
  const [team, setTeam] = useState<string>(discipline || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFeatures = projects.some((p) => p.features.length > 0);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(feature || null, (team || null) as Discipline | null);
      onClose();
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not save the link."));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Icon name="link" className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Link to a feature</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Linked items appear on the feature&apos;s page, and their decisions go on its timeline.
            </p>
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1.5 mt-5">Feature</label>
        <select value={feature} onChange={(e) => setFeature(e.target.value)} className={`${selectClass} w-full`}>
          <option value="">— Not linked —</option>
          {projects.map((p) => (
            <optgroup key={p.id} label={p.name}>
              {p.features.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {!hasFeatures && (
          <p className="text-xs text-gray-500 mt-1.5">No features yet. Create projects and features on the Projects page.</p>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1.5 mt-4">Team</label>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={`${selectClass} w-full`}>
          <option value="">— Not set —</option>
          {DISCIPLINES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

interface LinkControlProps<T extends LinkFields & { id: string }> {
  item: T;
  itemType: ItemType;
  onChanged: (updated: T) => void;
}

/**
 * Shows where a document/chat belongs (feature + team), Gemini's pending suggestion with
 * Accept / Change / Dismiss, or a "Link to feature" button. Compact, one line.
 */
export default function LinkControl<T extends LinkFields & { id: string }>({ item, itemType, onChanged }: LinkControlProps<T>) {
  const { featureLabel, refreshProjects } = useWorkspace();
  const { toast } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      const updated = (await action()) as T;
      onChanged(updated);
      // Feature counts on the Projects page change with links
      refreshProjects();
      if (done) toast(done);
    } catch (err: unknown) {
      toast(errorMessage(err, "Could not update the link."), "error");
    } finally {
      setBusy(false);
    }
  };

  const editor = editing && (
    <LinkEditor
      featureId={item.feature_id || item.suggested_feature_id}
      discipline={item.discipline || item.suggested_discipline}
      onSave={async (featureId, discipline) => {
        const updated = await service(itemType).setLink(item.id, featureId, discipline);
        onChanged(updated as unknown as T);
        refreshProjects();
        toast(featureId || discipline ? "Link saved" : "Link removed");
      }}
      onClose={() => setEditing(false)}
    />
  );

  const smallButton = "tap rounded-md px-1.5 py-0.5 transition-colors disabled:opacity-50";

  if (item.feature_id || item.discipline) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap text-xs mt-1.5" onClick={(e) => e.stopPropagation()}>
        {item.feature_id && (
          <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
            <Icon name="link" className="w-3 h-3 text-gray-400" />
            {featureLabel(item.feature_id)}
          </span>
        )}
        <DisciplineBadge discipline={item.discipline} />
        <button onClick={() => setEditing(true)} className={`${smallButton} text-blue-600 hover:bg-blue-50`}>
          Edit
        </button>
        {editor}
      </div>
    );
  }

  if (item.suggested_feature_id || item.suggested_discipline) {
    const what = [
      item.suggested_feature_id ? featureLabel(item.suggested_feature_id) : "",
      disciplineLabel(item.suggested_discipline),
    ].filter(Boolean).join(" · ");
    return (
      <div className="flex items-center gap-0.5 flex-wrap text-xs mt-1.5" onClick={(e) => e.stopPropagation()}>
        <span
          className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100 rounded-full px-2 py-0.5"
          title={`Suggested by the AI${item.suggestion_reason ? `: ${item.suggestion_reason}` : ""}`}
        >
          <Icon name="sparkles" className="w-3 h-3" />
          <span className="sr-only">Suggested:</span>
          <span className="font-medium truncate max-w-[12rem]">{what}</span>
        </span>
        <button disabled={busy} onClick={() => run(() => service(itemType).acceptLink(item.id), "Link accepted")}
          className={`${smallButton} text-blue-700 font-medium hover:bg-blue-50`}>
          Accept
        </button>
        <button disabled={busy} onClick={() => setEditing(true)} className={`${smallButton} text-gray-600 hover:bg-gray-100`}>
          Change
        </button>
        <button disabled={busy} onClick={() => run(() => service(itemType).dismissLink(item.id))}
          className={`${smallButton} text-gray-400 hover:bg-gray-100 hover:text-gray-600`}>
          Dismiss
        </button>
        {editor}
      </div>
    );
  }

  return (
    <div className="mt-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setEditing(true)} className={`${smallButton} -ml-1.5 inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50`}>
        <Icon name="plus" className="w-3 h-3" />
        Link to feature
      </button>
      {editor}
    </div>
  );
}
