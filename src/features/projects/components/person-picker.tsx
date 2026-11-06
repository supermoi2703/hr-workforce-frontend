"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { usePeopleSearch } from "../hooks";
import type { Person } from "../types";

/** Tìm người theo mã hoặc tên. Khi đã chọn thì hiện tên, bấm vào để chọn lại. */
export function PersonPicker({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: Person | null;
  onChange: (person: Person | null) => void;
  placeholder?: string;
}) {
  const t = useTranslations("Projects");
  const [query, setQuery] = useState("");
  const people = usePeopleSearch(query);

  if (value) {
    return (
      <button type="button" className="border-input hover:bg-muted h-9 w-full truncate rounded-md border px-3 text-left text-sm" onClick={() => onChange(null)}>
        {value.fullName}
      </button>
    );
  }
  return (
    <div className="relative">
      <Input id={id} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder ?? t("searchPerson")} autoComplete="off" />
      {query.trim().length >= 2 && (
        <ul className="bg-popover absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border p-1 shadow-md">
          {(people.data ?? []).map((person) => (
            <li key={person.id}>
              <button
                type="button"
                className="hover:bg-muted w-full rounded-sm px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  onChange(person);
                  setQuery("");
                }}
              >
                {person.fullName} <span className="text-muted-foreground">{person.employeeCode}</span>
              </button>
            </li>
          ))}
          {people.data?.length === 0 && <li className="text-muted-foreground px-2 py-1.5 text-sm">{t("noPersonFound")}</li>}
        </ul>
      )}
    </div>
  );
}
