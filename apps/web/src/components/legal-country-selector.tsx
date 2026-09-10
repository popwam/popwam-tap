"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

type Country = { iso2: string; name: string; flag: string; enabled: boolean };

export function LegalCountrySelector({
  countries,
  initial = [],
  locale,
}: {
  countries: Country[];
  initial?: string[];
  locale: "ar" | "en";
}) {
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState("");
  const ar = locale === "ar";
  const matches = useMemo(
    () =>
      countries
        .filter(
          (item) =>
            !selected.includes(item.iso2) &&
            (!query ||
              `${item.iso2} ${item.name}`
                .toLowerCase()
                .includes(query.toLowerCase())),
        )
        .slice(0, 24),
    [countries, query, selected],
  );
  return (
    <div
      className="rounded-2xl border border-white/10 bg-black/10 p-3"
      data-country-selector
    >
      {selected.map((iso2) => (
        <input
          type="hidden"
          name="countries"
          value={iso2}
          key={`input-${iso2}`}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        {selected.map((iso2) => {
          const country = countries.find((item) => item.iso2 === iso2);
          return (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1.5 text-xs font-bold text-brand-200"
              onClick={() =>
                setSelected((current) =>
                  current.filter((item) => item !== iso2),
                )
              }
              key={iso2}
            >
              {country?.flag} {country?.name || iso2}
              <X size={12} />
            </button>
          );
        })}
      </div>
      <label className="relative mt-2 block">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={15}
        />
        <input
          className="input ps-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ar ? "ابحث عن دولة لإضافتها" : "Search a country to add"}
        />
      </label>
      {query && (
        <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
          {matches.map((country) => (
            <button
              type="button"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-start text-xs hover:bg-white/5"
              onClick={() => {
                setSelected((current) => [...current, country.iso2]);
                setQuery("");
              }}
              key={country.iso2}
            >
              <span>
                {country.flag} {country.name}
              </span>
              <code dir="ltr">{country.iso2}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
