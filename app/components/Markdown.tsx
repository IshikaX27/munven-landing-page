import { ReactNode } from "react";

// Minimal Markdown renderer for Gemini answers: headings, bullet/numbered lists, tables,
// code blocks, **bold**, *italic* and `code`. Builds React elements (no raw HTML injection).

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-800 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const splitRow = (line: string) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key} className="bg-gray-100 rounded-md p-3 text-xs overflow-x-auto">
          {code.join("\n")}
        </pre>
      );
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const size = heading[1].length <= 2 ? "text-base" : "text-sm";
      blocks.push(
        <p key={key} className={`${size} font-semibold mt-2`}>
          {renderInline(heading[2], key)}
        </p>
      );
      i++;
      continue;
    }

    // Table: header row followed by a |---| separator row
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(splitRow(lines[i++]));
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                {header.map((h, j) => (
                  <th key={j} className="border border-gray-200 px-2 py-1 text-left bg-gray-100">
                    {renderInline(h, `${key}h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-gray-200 px-2 py-1">
                      {renderInline(cell, `${key}r${r}c${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet or numbered list (consecutive items, nested items indented)
    const listItem = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;
    if (listItem.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: { indent: number; text: string }[] = [];
      while (i < lines.length && listItem.test(lines[i])) {
        const m = lines[i].match(listItem)!;
        items.push({ indent: m[1].length, text: m[3] });
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={key} className={`${ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1`}>
          {items.map((item, j) => (
            <li key={j} style={{ marginLeft: `${Math.min(item.indent, 8) * 0.5}rem` }}>
              {renderInline(item.text, `${key}i${j}`)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Paragraph: consecutive plain lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|\s*([-*•]|\d+[.)])\s|\s*\|)/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    if (para.length === 0) para.push(lines[i++]);
    blocks.push(<p key={key}>{renderInline(para.join(" "), key)}</p>);
  }

  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}
