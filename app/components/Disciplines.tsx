import { DecisionKind, Discipline } from "../../types/index";

export const DISCIPLINES: { value: Discipline; label: string; className: string }[] = [
  { value: "product", label: "Product", className: "bg-purple-50 text-purple-700 ring-purple-100" },
  { value: "development", label: "Development", className: "bg-blue-50 text-blue-700 ring-blue-100" },
  { value: "design", label: "Design", className: "bg-pink-50 text-pink-700 ring-pink-100" },
  { value: "testing", label: "Testing", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  { value: "management", label: "Management", className: "bg-green-50 text-green-700 ring-green-100" },
  { value: "other", label: "Other", className: "bg-gray-50 text-gray-600 ring-gray-200" },
];

export const disciplineLabel = (d?: Discipline | null) => DISCIPLINES.find((x) => x.value === d)?.label || "";

export function DisciplineBadge({ discipline }: { discipline?: Discipline | null }) {
  const d = DISCIPLINES.find((x) => x.value === discipline);
  if (!d) return null;
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${d.className}`}>{d.label}</span>;
}

export const DECISION_KINDS: { value: DecisionKind; label: string; className: string }[] = [
  { value: "decision", label: "Decision", className: "bg-blue-600 text-white" },
  { value: "change", label: "Change", className: "bg-purple-600 text-white" },
  { value: "requirement", label: "Requirement", className: "bg-gray-700 text-white" },
  { value: "issue", label: "Issue", className: "bg-red-600 text-white" },
];

export function KindBadge({ kind }: { kind: DecisionKind }) {
  const k = DECISION_KINDS.find((x) => x.value === kind) || DECISION_KINDS[0];
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${k.className}`}>{k.label}</span>;
}
