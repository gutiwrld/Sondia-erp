"use client";

import { Avatar, cx } from "@/components/ui";
import type { Member } from "@/lib/session";

/** Selector de responsables (uno o varios). */
export function OwnerPicker({
  members,
  meId,
  value,
  onChange,
  legend = "Responsables",
}: {
  members: Member[];
  meId: string;
  value: string[];
  onChange: (v: string[]) => void;
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[12px] font-medium text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const on = value.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id])}
              className={cx(
                "flex h-8 items-center gap-2 rounded-full border pr-3 pl-1 text-[13px] transition-colors duration-150 max-md:h-10",
                on ? "border-text bg-surface-hover text-text" : "border-line text-muted hover:border-line-strong",
              )}
            >
              <Avatar person={m} size="xs" />
              {m.id === meId ? `${m.short_name} (tú)` : m.short_name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
