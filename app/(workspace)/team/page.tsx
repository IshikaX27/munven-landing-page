"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { workspaceService } from "../../../services/workspaces";
import { companyService } from "../../../services/company";
import { useWorkspace } from "../../components/WorkspaceContext";
import { useFeedback } from "../../components/Feedback";
import { inputClass } from "../../components/ui";
import { DirectoryEntry, Member, Role } from "../../../types/index";

const primaryButton =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including deleting the group",
  admin: "Manage members, delete any file, project or chat",
  member: "Upload, ask, link and edit the timeline",
};

export default function TeamPage() {
  const { user, workspace, workspaces, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const { toast, confirm, prompt } = useFeedback();
  const [members, setMembers] = useState<Member[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  // Public (self-registered) users add people by their exact email; they never see a directory
  const [inviteEmail, setInviteEmail] = useState("");
  const [addRole, setAddRole] = useState<Exclude<Role, "owner">>("member");
  const [error, setError] = useState<string | null>(null);
  // Company employees, for picking who to add
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const isAdmin = workspace.role !== "member";

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await workspaceService.members(workspace.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load members.");
    }
  }, [workspace.id]);

  useEffect(() => {
    if (workspace.is_personal) return;
    let cancelled = false;
    companyService
      .directory()
      .then((list) => !cancelled && setDirectory(list))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [workspace.is_personal]);

  useEffect(() => {
    let cancelled = false;
    workspaceService
      .members(workspace.id)
      .then((list) => !cancelled && setMembers(list))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [workspace.id]);

  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    try {
      await action();
      after?.();
      await Promise.all([loadMembers(), refreshWorkspaces()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  // Employees not yet in the group first, then members; filtered by the search box
  const query = employeeSearch.trim().toLowerCase();
  const shownEmployees = directory
    .filter((d) => !query || d.name.toLowerCase().includes(query) || d.email.toLowerCase().includes(query))
    .sort((x, y) => {
      const inX = members.some((m) => m.user_id === x.id) ? 1 : 0;
      const inY = members.some((m) => m.user_id === y.id) ? 1 : 0;
      return inX - inY || x.name.localeCompare(y.name);
    });

  const createTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    setError(null);
    try {
      const created = await workspaceService.create(name);
      setNewTeamName("");
      await refreshWorkspaces();
      switchWorkspace(created.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create the group.");
    }
  };

  const leaveOrDelete = async () => {
    const deleting = workspace.role === "owner";
    const question = deleting
      ? `Delete "${workspace.name}" with all its files, chats, projects and timeline for everyone? This cannot be undone.`
      : `Leave "${workspace.name}"? You will lose access to its files and chats.`;
    if (!(await confirm({ title: deleting ? "Delete group?" : "Leave group?", message: question, danger: true,
      confirmLabel: deleting ? "Delete group" : "Leave" }))) return;
    setError(null);
    try {
      if (deleting) await workspaceService.remove(workspace.id);
      else await workspaceService.removeMember(workspace.id, user.id);
      const personal = workspaces.find((w) => w.is_personal);
      if (personal) switchWorkspace(personal.id);
      await refreshWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Workspaces */}
      <section className="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-1">Your groups</h3>
        <p className="text-sm text-gray-500 mb-4">
          Everyone in a group shares its documents, group chat, projects and timelines. Personal stays private to you.
        </p>
        <ul className="space-y-1 mb-6">
          {workspaces.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => switchWorkspace(w.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  w.id === workspace.id ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium">{w.is_personal ? "Personal" : w.name}</span>
                <span className="block text-[11px] text-gray-400">
                  {w.is_personal ? "Only you" : `${w.member_count} member${w.member_count === 1 ? "" : "s"} · you are ${w.role}`}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <label className="block text-sm font-medium text-gray-700 mb-1">Create a group</label>
        <div className="flex gap-2">
          <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTeam()}
            placeholder="Group name (e.g. Product Team)"
            className={inputClass}
          />
          <button onClick={createTeam} disabled={!newTeamName.trim()} className={primaryButton}>
            Create
          </button>
        </div>
      </section>

      {/* Current workspace */}
      <section className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{workspace.is_personal ? "Personal (private)" : workspace.name}</h3>
            <p className="text-sm text-gray-500">
              {workspace.is_personal
                ? "Only you can see this. Create a group to work and ask questions together."
                : { owner: "You are the owner.", admin: "You are an admin.", member: "You are a member." }[workspace.role]}
            </p>
          </div>
          {!workspace.is_personal && (
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href="/group-chat"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Open group chat
              </Link>
              {isAdmin && (
                <button
                  onClick={async () => {
                    const name = await prompt({ title: "Rename group", label: "Group name", defaultValue: workspace.name });
                    if (name && name !== workspace.name) run(() => workspaceService.rename(workspace.id, name));
                  }}
                  className={"inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"}
                >
                  Rename
                </button>
              )}
              <button
                onClick={leaveOrDelete}
                className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                {workspace.role === "owner" ? "Delete group" : "Leave group"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <h4 className="font-semibold text-gray-700 mb-2">Members ({members.length})</h4>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="py-2 pl-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium hidden sm:table-cell">Email</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              // Owners can change anyone but the owner; admins can only manage members
              const canManage = !workspace.is_personal && m.role !== "owner" && m.user_id !== user.id &&
                (workspace.role === "owner" || (workspace.role === "admin" && m.role === "member"));
              return (
                <tr key={m.user_id} className="border-b border-gray-50">
                  <td className="py-2 pl-2 pr-3 text-gray-800">
                    {m.name}
                    {m.user_id === user.id && <span className="text-gray-400"> (you)</span>}
                    {/* Phones have no room for an email column: it goes under the name */}
                    <span className="block sm:hidden text-xs text-gray-500 break-all">{m.email}</span>
                  </td>
                  <td className="py-2 pr-3 text-gray-600 break-all hidden sm:table-cell">{m.email}</td>
                  <td className="py-2 pr-3">
                    {canManage && workspace.role === "owner" ? (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          run(() => workspaceService.updateRole(workspace.id, m.user_id, e.target.value as Exclude<Role, "owner">))
                        }
                        className="px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-900"
                        title={ROLE_HELP[m.role]}
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span className="text-gray-700" title={ROLE_HELP[m.role]}>{m.role}</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    {canManage && (
                      <button
                        onClick={async () =>
                          (await confirm({ title: "Remove member?", message: `${m.name} will lose access to ${workspace.name}.`, danger: true, confirmLabel: "Remove" })) &&
                          run(() => workspaceService.removeMember(workspace.id, m.user_id)).then(() => toast(`${m.name} removed`))
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!workspace.is_personal && user.is_public && (
          <div className="mb-2">
            <h4 className="font-semibold text-gray-700">Add people</h4>
            {isAdmin ? (
              <form
                className="mt-2 flex flex-col sm:flex-row gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const email = inviteEmail.trim();
                  if (!email) return;
                  run(() => workspaceService.addMember(workspace.id, email, addRole), () => {
                    setInviteEmail("");
                    toast(`Added ${email} to the group.`);
                  });
                }}
              >
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Their Munven account email"
                  className={`${inputClass} sm:max-w-xs`}
                />
                {workspace.role === "owner" && (
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as Exclude<Role, "owner">)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                    aria-label="Add as"
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                )}
                <button type="submit" className={primaryButton}>Add</button>
              </form>
            ) : (
              <p className="text-sm text-gray-500">Only group owners and admins can add people.</p>
            )}
            <p className="mt-1 text-xs text-gray-500">They need a Munven account first. Ask them to sign up, then add their email here.</p>
          </div>
        )}

        {!workspace.is_personal && !user.is_public && (
          <>
            <div className="flex justify-between items-end gap-4 mb-2 flex-wrap">
              <div>
                <h4 className="font-semibold text-gray-700">Company employees ({directory.length})</h4>
                <p className="text-sm text-gray-500">
                  {isAdmin ? "Add anyone from the company to this group." : "Only group owners and admins can add people."}
                  {user.is_admin ? (
                    <> Someone missing? Add them on the <Link href="/company" className="text-blue-600 hover:underline">Company</Link> page.</>
                  ) : (
                    " Someone missing? Ask a company admin to add them."
                  )}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {isAdmin && workspace.role === "owner" && (
                  <label className="text-sm text-gray-600 flex items-center gap-1.5">
                    Add as
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as Exclude<Role, "owner">)}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                )}
                <input
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search name or email"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 w-56"
                />
              </div>
            </div>
            <div className="relative border border-gray-100 rounded-lg max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {shownEmployees.length === 0 && (
                    <tr>
                      <td className="py-3 px-3 text-gray-500">No employees match your search.</td>
                    </tr>
                  )}
                  {shownEmployees.map((d) => {
                    const member = members.find((m) => m.user_id === d.id);
                    return (
                      <tr key={d.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 px-3 text-gray-800">
                          {d.name}
                          {d.id === user.id && <span className="text-gray-400"> (you)</span>}
                          <span className="block sm:hidden text-xs text-gray-500 break-all">{d.email}</span>
                        </td>
                        <td className="py-2 px-3 text-gray-600 break-all hidden sm:table-cell">{d.email}</td>
                        <td className="py-2 px-3">
                          {d.status === "invited" && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                              invite pending
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {member ? (
                            <span className="text-xs text-green-700">✓ In group ({member.role})</span>
                          ) : isAdmin ? (
                            <button
                              onClick={() => run(() => workspaceService.addMember(workspace.id, d.email, addRole))}
                              className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                              + Add
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Not in group</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-500">
          {(Object.keys(ROLE_HELP) as Role[]).map((role) => (
            <div key={role} className="border border-gray-100 rounded-lg p-3">
              <p className="font-medium text-gray-700 capitalize">{role}</p>
              <p>{ROLE_HELP[role]}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
