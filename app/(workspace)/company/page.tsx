"use client";

import { useEffect, useState } from "react";
import { companyService, inviteUrl } from "../../../services/company";
import { useWorkspace } from "../../components/WorkspaceContext";
import { useFeedback } from "../../components/Feedback";
import { inputClass } from "../../components/ui";
import { Employee, InviteResult } from "../../../types/index";

const primaryButton =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const STATUS_STYLE: Record<Employee["status"], string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  invited: "bg-amber-50 text-amber-700 border-amber-200",
  deactivated: "bg-gray-100 text-gray-500 border-gray-200",
};

const parseTime = (iso: string) => new Date(iso.endsWith("Z") || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");

export default function CompanyPage() {
  const { user, workspaces, refreshWorkspaces } = useWorkspace();
  const { toast, confirm } = useFeedback();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ name: "", email: "", isAdmin: false, groupIds: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The last invite / reset link created, shown once so the admin can copy and share it
  const [shareLink, setShareLink] = useState<{ result: InviteResult; reset: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  // Page-load time, for marking expired invite links
  const [now] = useState(() => Date.now());

  // Groups this admin can add people to
  const manageableGroups = workspaces.filter((w) => !w.is_personal && w.role !== "member");

  const reload = async () => setEmployees(await companyService.employees());

  useEffect(() => {
    if (!user.is_admin) return;
    let cancelled = false;
    companyService
      .employees()
      .then((list) => !cancelled && setEmployees(list))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user.is_admin]);

  if (!user.is_admin) {
    return (
      <section className="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm max-w-2xl">
        <h3 className="text-xl font-bold text-gray-800 mb-1">Company</h3>
        <p className="text-gray-600">Only company admins can add and manage employees. Ask an admin to add a colleague.</p>
      </section>
    );
  }

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const addEmployee = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await companyService.addEmployee(form.name.trim(), form.email.trim(), form.isAdmin, form.groupIds);
      setShareLink({ result, reset: false });
      setCopied(false);
      setForm({ name: "", email: "", isAdmin: false, groupIds: [] });
      await reload();
      // Member counts in the sidebar change when the new employee joined groups
      if (form.groupIds.length > 0) await refreshWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add the employee.");
    } finally {
      setSaving(false);
    }
  };

  const newLink = (employee: Employee) =>
    run(async () => {
      const result = await companyService.newInvite(employee.id);
      setShareLink({ result, reset: employee.status === "active" });
      setCopied(false);
    });

  const copyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(shareLink.result.invite_token));
      setCopied(true);
    } catch {
      setCopied(false);
      toast("Could not copy automatically. Select the link and copy it.", "error");
    }
  };

  const toggleGroup = (id: string) =>
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(id) ? f.groupIds.filter((g) => g !== id) : [...f.groupIds, id],
    }));

  const counts = {
    active: employees.filter((e) => e.status === "active").length,
    invited: employees.filter((e) => e.status === "invited").length,
  };
  const query = search.trim().toLowerCase();
  const shown = employees.filter(
    (e) => !query || e.name.toLowerCase().includes(query) || e.email.toLowerCase().includes(query)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add employee */}
      <section className="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-1">Add an employee</h3>
        <p className="text-sm text-gray-500 mb-4">
          Creates their account and gives you an invite link. Send it to them (WhatsApp, Slack, email); they open
          it, set a password and are in.
        </p>
        <div className="space-y-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className={inputClass}
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="work.email@company.com"
            type="email"
            className={inputClass}
          />
          {manageableGroups.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Add to groups (optional)</p>
              <div className="space-y-1">
                {manageableGroups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
            Company admin (can add and manage employees)
          </label>
          <button
            onClick={addEmployee}
            disabled={saving || !form.name.trim() || !form.email.trim()}
            className={`${primaryButton} w-full`}
          >
            {saving ? "Adding..." : "Add employee & create invite link"}
          </button>
        </div>

        {shareLink && (
          <div className="mt-5 border border-blue-100 bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-900 font-medium mb-1">
              {shareLink.reset ? "Password reset link" : "Invite link"} for {shareLink.result.employee.name}
            </p>
            <p className="text-xs text-blue-800 mb-2">
              Valid for 7 days and works once. Send it only to {shareLink.result.employee.email}.
            </p>
            <input
              readOnly
              value={inviteUrl(shareLink.result.invite_token)}
              onFocus={(e) => e.target.select()}
              className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs text-gray-800 bg-white mb-2"
            />
            <button onClick={copyLink} className={primaryButton}>
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
        )}
      </section>

      {/* Employees */}
      <section className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
        <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Employees</h3>
            <p className="text-sm text-gray-500">
              {counts.active} active · {counts.invited} invited (not set up yet). Any employee can be added to any group.
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 w-full sm:w-56"
          />
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {/* On phones each employee is a stacked card instead of a table row */}
        <table className="w-full text-sm block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Email</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Admin</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {shown.map((e) => {
              const isMe = e.id === user.id;
              return (
                <tr key={e.id} className="block md:table-row border-b border-gray-100 md:border-gray-50 py-3 md:py-0">
                  <td className="block md:table-cell md:py-2 text-gray-800 font-medium md:font-normal">
                    {e.name}
                    {isMe && <span className="text-gray-400 font-normal"> (you)</span>}
                  </td>
                  <td className="block md:table-cell md:py-2 text-gray-600 break-all">{e.email}</td>
                  <td className="inline-block md:table-cell mt-2 md:mt-0 md:py-2 mr-4 md:mr-0 align-middle">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded border ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                    {e.status === "invited" && e.invite_expires_at && (
                      <span className="block text-[11px] text-gray-400">
                        {parseTime(e.invite_expires_at).getTime() < now
                          ? "link expired"
                          : `link valid until ${parseTime(e.invite_expires_at).toLocaleDateString()}`}
                      </span>
                    )}
                  </td>
                  <td className="inline-block md:table-cell mt-2 md:mt-0 md:py-2 align-middle">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={e.is_admin}
                        disabled={isMe || !e.is_active}
                        title={isMe ? "You cannot remove your own admin rights" : "Company admin"}
                        aria-label={`Company admin: ${e.name}`}
                        onChange={(ev) => run(() => companyService.update(e.id, { is_admin: ev.target.checked }))}
                      />
                      <span className="md:hidden">Admin</span>
                    </label>
                  </td>
                  <td className="block md:table-cell mt-2 md:mt-0 md:py-2 md:text-right whitespace-nowrap space-x-4 md:space-x-3">
                    {e.is_active && (
                      <button onClick={() => newLink(e)} className="tap text-xs text-blue-600 hover:underline">
                        {e.status === "active" ? "Reset password link" : "New invite link"}
                      </button>
                    )}
                    {!isMe && (
                      <button
                        onClick={async () =>
                          (e.is_active
                            ? await confirm({
                                title: `Deactivate ${e.name}?`,
                                message: "They will be signed out and cannot log in. Their files stay, and you can reactivate them later.",
                                danger: true,
                                confirmLabel: "Deactivate",
                              })
                            : true) && run(() => companyService.update(e.id, { is_active: !e.is_active }))
                        }
                        className={`tap text-xs hover:underline ${e.is_active ? "text-red-600" : "text-green-700"}`}
                      >
                        {e.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
