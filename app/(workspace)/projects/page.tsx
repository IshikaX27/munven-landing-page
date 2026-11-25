"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projectService } from "../../../services/projects";
import FileViewer, { formatLocation } from "../../components/FileViewer";
import { DECISION_KINDS, DISCIPLINES, DisciplineBadge, KindBadge } from "../../components/Disciplines";
import { useWorkspace } from "../../components/WorkspaceContext";
import { errorMessage, useFeedback } from "../../components/Feedback";
import { inputClass } from "../../components/ui";
import { Decision, DecisionKind, Discipline, FeatureOverview } from "../../../types/index";

// New timeline entries arrive in the background after items are linked
const OVERVIEW_POLL_MS = 8000;

const primaryButton =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50";

interface ViewerState {
  documentId: string;
  filename: string;
  fileType: string;
  location?: string | null;
  snippet?: string;
}

interface EntryForm {
  kind: DecisionKind;
  discipline: Discipline | "";
  title: string;
  detail: string;
}

const emptyEntry: EntryForm = { kind: "decision", discipline: "", title: "", detail: "" };

export default function ProjectsPage() {
  const router = useRouter();
  const { workspace, projects, refreshProjects } = useWorkspace();
  const { toast, confirm, prompt } = useFeedback();
  const isAdmin = workspace.role !== "member";

  // /projects?feature=<id> opens a feature directly (this page only renders in the browser)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("feature") : null
  );
  const [loadedOverview, setOverview] = useState<FeatureOverview | null>(null);
  // Only show the overview of the feature that is currently selected
  const overview = loadedOverview && loadedOverview.feature.id === selectedFeatureId ? loadedOverview : null;
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [addingFeatureTo, setAddingFeatureTo] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState({ name: "", description: "" });
  const [teamFilter, setTeamFilter] = useState<Discipline | "">("");
  const [entryForm, setEntryForm] = useState<EntryForm | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const loadOverview = useCallback(async (featureId: string) => {
    try {
      setOverview(await projectService.overview(featureId));
    } catch (err: unknown) {
      setOverview(null);
      setSelectedFeatureId(null);
      toast(errorMessage(err, "Could not load the feature."), "error");
    }
  }, [toast]);

  useEffect(() => {
    if (!selectedFeatureId) return;
    let cancelled = false;
    projectService
      .overview(selectedFeatureId)
      .then((data) => !cancelled && setOverview(data))
      .catch(() => !cancelled && setSelectedFeatureId(null));
    // Timeline entries keep arriving in the background after items are linked
    const timer = setInterval(() => loadOverview(selectedFeatureId), OVERVIEW_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedFeatureId, loadOverview]);

  // reloadOverview=false after deleting the open feature (or its project): reloading it would 404
  const run = async (action: () => Promise<unknown>, after?: () => void, reloadOverview = true) => {
    try {
      await action();
      await refreshProjects();
      if (reloadOverview && selectedFeatureId) await loadOverview(selectedFeatureId);
      after?.();
    } catch (err: unknown) {
      toast(errorMessage(err), "error");
    }
  };

  const createProject = () =>
    newProject.name.trim() &&
    run(() => projectService.create(newProject.name.trim(), newProject.description.trim()), () =>
      setNewProject({ name: "", description: "" })
    );

  const createFeature = (projectId: string) =>
    newFeature.name.trim() &&
    run(
      async () => {
        const feature = await projectService.createFeature(projectId, newFeature.name.trim(), newFeature.description.trim());
        setSelectedFeatureId(feature.id);
      },
      () => {
        setNewFeature({ name: "", description: "" });
        setAddingFeatureTo(null);
      }
    );

  const saveEntry = () => {
    if (!entryForm || !entryForm.title.trim() || !selectedFeatureId) return;
    const data = {
      kind: entryForm.kind,
      title: entryForm.title.trim(),
      detail: entryForm.detail.trim() || null,
      discipline: entryForm.discipline || null,
    };
    run(
      () =>
        editingEntryId
          ? projectService.updateDecision(editingEntryId, data)
          : projectService.addDecision(selectedFeatureId, data),
      () => {
        setEntryForm(null);
        setEditingEntryId(null);
      }
    );
  };

  const openSource = (d: Decision) => {
    if (d.source_type === "conversation" && d.source_id) {
      router.push(`/dashboard?conversation=${d.source_id}`);
      return;
    }
    const doc = overview?.documents.find((x) => x.id === d.source_id);
    if (doc) {
      setViewer({ documentId: doc.id, filename: doc.filename, fileType: doc.file_type, location: d.source_location, snippet: d.detail || d.title });
    }
  };

  const decisions = (overview?.decisions || []).filter((d) => !teamFilter || d.discipline === teamFilter);
  // Connected work grouped by team, in the PRD order: product, development, design, testing, management
  const groups = [...DISCIPLINES, { value: null, label: "Team not set", className: "" }]
    .map((d) => ({
      ...d,
      documents: (overview?.documents || []).filter((x) => (x.discipline || null) === d.value),
      conversations: (overview?.conversations || []).filter((x) => (x.discipline || null) === d.value),
    }))
    .filter((g) => g.documents.length + g.conversations.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Projects & features */}
      <section className="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm flex flex-col">
        <h3 className="font-semibold text-gray-700 mb-1">Projects</h3>
        <p className="text-sm text-gray-500 mb-4">
          Group work into projects and features. Documents and chats from product, development, design, testing and
          management link to a feature, so everyone sees the same picture.
        </p>

        <div className="space-y-2 mb-6">
          <input
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            placeholder="New project name (e.g. Mobile App)"
            className={inputClass}
          />
          <input
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            placeholder="Description (optional)"
            className={inputClass}
          />
          <button onClick={createProject} disabled={!newProject.name.trim()} className={`${primaryButton} w-full`}>
            + Create project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">No projects yet.</p>
        ) : (
          <ul className="space-y-4">
            {projects.map((project) => (
              <li key={project.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{project.name}</p>
                    {project.description && <p className="text-xs text-gray-500">{project.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 text-xs">
                    <button
                      onClick={async () => {
                        const name = await prompt({ title: "Rename project", label: "Project name", defaultValue: project.name });
                        if (name && name !== project.name) run(() => projectService.update(project.id, { name }));
                      }}
                      className="text-gray-400 hover:text-blue-600"
                      title="Rename"
                    >
                      ✎
                    </button>
                    {isAdmin && (
                      <button
                        onClick={async () =>
                          (await confirm({
                            title: "Delete project?",
                            message: `"${project.name}" and its features will be deleted. Linked files and chats are kept.`,
                            danger: true,
                          })) && run(
                            () => projectService.remove(project.id),
                            () => {
                              if (project.features.some((f) => f.id === selectedFeatureId)) setSelectedFeatureId(null);
                            },
                            !project.features.some((f) => f.id === selectedFeatureId)
                          )
                        }
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <ul className="mt-2 space-y-1">
                  {project.features.map((feature) => (
                    <li key={feature.id}>
                      <button
                        onClick={() => setSelectedFeatureId(feature.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          feature.id === selectedFeatureId ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="block truncate font-medium">{feature.name}</span>
                        <span className="block text-[11px] text-gray-400">
                          {feature.document_count} files · {feature.conversation_count} chats · {feature.decision_count} timeline
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {addingFeatureTo === project.id ? (
                  <div className="mt-2 space-y-2">
                    <input
                      autoFocus
                      value={newFeature.name}
                      onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                      placeholder="Feature name (e.g. Checkout)"
                      className={inputClass}
                    />
                    <input
                      value={newFeature.description}
                      onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                      placeholder="What it covers (helps the AI link files)"
                      className={inputClass}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => createFeature(project.id)} disabled={!newFeature.name.trim()} className={primaryButton}>
                        Add
                      </button>
                      <button onClick={() => setAddingFeatureTo(null)} className={secondaryButton}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingFeatureTo(project.id);
                      setNewFeature({ name: "", description: "" });
                    }}
                    className="mt-2 text-xs text-blue-600 hover:underline"
                  >
                    + Add feature
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Feature overview */}
      <section className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
        {!overview ? (
          <div className="text-sm text-gray-500">
            <h3 className="font-semibold text-gray-700 mb-2">Feature overview</h3>
            <p>Select a feature to see everything connected to it: files and chats from every team, and its timeline of
              decisions, changes, requirements and issues.</p>
            <p className="mt-2">
              New uploads get an AI suggestion for their feature and team on the{" "}
              <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{overview.project_name}</p>
                <h3 className="text-xl font-bold text-gray-800">{overview.feature.name}</h3>
                <p className="text-sm text-gray-600">{overview.feature.description || "No description yet."}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => router.push(`/dashboard?feature=${overview.feature.id}`)} className={primaryButton}>
                  Ask about this feature
                </button>
                <button
                  onClick={async () => {
                    const name = await prompt({ title: "Edit feature", label: "Feature name", defaultValue: overview.feature.name });
                    if (!name) return;
                    const description = await prompt({
                      title: "Edit feature",
                      label: "What it covers (helps the AI link files)",
                      defaultValue: overview.feature.description || "",
                      multiline: true,
                    });
                    run(() => projectService.updateFeature(overview.feature.id, { name, description: description ?? undefined }));
                  }}
                  className={secondaryButton}
                >
                  Edit
                </button>
                {isAdmin && (
                  <button
                    onClick={async () =>
                      (await confirm({
                        title: "Delete feature?",
                        message: `"${overview.feature.name}" and its timeline will be deleted. Linked files and chats are kept.`,
                        danger: true,
                      })) && run(() => projectService.removeFeature(overview.feature.id), () => setSelectedFeatureId(null), false)
                    }
                    className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Connected work by team */}
            <h4 className="font-semibold text-gray-700 mb-2">Connected work</h4>
            {groups.length === 0 ? (
              <p className="text-sm text-gray-500 mb-6">
                Nothing linked yet. Link files and chats from the Dashboard (or accept the AI&apos;s suggestions).
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {groups.map((group) => (
                  <div key={group.label} className="border border-gray-100 rounded-lg p-3">
                    <div className="mb-2">
                      {group.value ? <DisciplineBadge discipline={group.value} /> : <span className="text-xs text-gray-500">{group.label}</span>}
                    </div>
                    <ul className="space-y-1 text-sm">
                      {group.documents.map((doc) => (
                        <li key={doc.id} className="flex justify-between gap-2">
                          <span className="truncate text-gray-700" title={doc.filename}>📄 {doc.filename}</span>
                          {doc.has_file && (
                            <button
                              onClick={() => setViewer({ documentId: doc.id, filename: doc.filename, fileType: doc.file_type })}
                              className="text-xs text-blue-600 hover:underline flex-shrink-0"
                            >
                              Open
                            </button>
                          )}
                        </li>
                      ))}
                      {group.conversations.map((conv) => (
                        <li key={conv.id} className="flex justify-between gap-2">
                          <span className="truncate text-gray-700" title={conv.title}>💬 {conv.title}</span>
                          <Link href={`/dashboard?conversation=${conv.id}`} className="text-xs text-blue-600 hover:underline flex-shrink-0">
                            Open
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            <div className="flex justify-between items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-semibold text-gray-700">Timeline: decisions, changes, requirements & issues</h4>
              <button
                onClick={() => {
                  setEditingEntryId(null);
                  setEntryForm({ ...emptyEntry });
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add entry
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button
                onClick={() => setTeamFilter("")}
                className={`text-xs px-2 py-1 rounded-lg border ${teamFilter === "" ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600"}`}
              >
                All teams
              </button>
              {DISCIPLINES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setTeamFilter(d.value)}
                  className={`text-xs px-2 py-1 rounded-lg border ${teamFilter === d.value ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {entryForm && (
              <div className="border border-blue-100 bg-blue-50/40 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={entryForm.kind}
                    onChange={(e) => setEntryForm({ ...entryForm, kind: e.target.value as DecisionKind })}
                    className={inputClass}
                  >
                    {DECISION_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                  <select
                    value={entryForm.discipline}
                    onChange={(e) => setEntryForm({ ...entryForm, discipline: e.target.value as Discipline | "" })}
                    className={inputClass}
                  >
                    <option value="">Team not set</option>
                    {DISCIPLINES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <input
                  autoFocus
                  value={entryForm.title}
                  onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                  placeholder="What was decided / changed / required / found?"
                  className={inputClass}
                />
                <textarea
                  value={entryForm.detail}
                  onChange={(e) => setEntryForm({ ...entryForm, detail: e.target.value })}
                  placeholder="Details (optional)"
                  rows={2}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button onClick={saveEntry} disabled={!entryForm.title.trim()} className={primaryButton}>
                    {editingEntryId ? "Save" : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setEntryForm(null);
                      setEditingEntryId(null);
                    }}
                    className={secondaryButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {decisions.length === 0 ? (
              <p className="text-sm text-gray-500">
                {overview.decisions.length === 0
                  ? "No entries yet. When files or chats are linked, the AI adds their decisions, changes, requirements and issues here (this takes a little while)."
                  : "No entries for this team."}
              </p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-2 space-y-4">
                {decisions.map((d) => {
                  const where = formatLocation(d.source_location);
                  return (
                    <li key={d.id} className="ml-4 relative">
                      <span className="absolute -left-[22.5px] top-1.5 w-3 h-3 rounded-full bg-blue-200 border border-white" />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <KindBadge kind={d.kind} />
                        <DisciplineBadge discipline={d.discipline} />
                        <span className="text-[11px] text-gray-400">
                          {new Date(d.created_at.endsWith("Z") || d.created_at.includes("+") ? d.created_at : d.created_at + "Z").toLocaleDateString()}
                          {d.origin === "ai" ? " · AI extracted" : " · added by team"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-1">{d.title}</p>
                      {d.detail && <p className="text-sm text-gray-600">{d.detail}</p>}
                      <div className="flex gap-3 text-xs mt-1">
                        {d.source_label && (
                          <button onClick={() => openSource(d)} className="text-blue-600 hover:underline">
                            {d.source_label}
                            {where && ` · ${where}`}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingEntryId(d.id);
                            setEntryForm({ kind: d.kind, discipline: d.discipline || "", title: d.title, detail: d.detail || "" });
                          }}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () =>
                            (await confirm({ title: "Delete timeline entry?", message: d.title, danger: true })) &&
                            run(() => projectService.removeDecision(d.id))
                          }
                          className="text-gray-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </section>

      {viewer && <FileViewer {...viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}
