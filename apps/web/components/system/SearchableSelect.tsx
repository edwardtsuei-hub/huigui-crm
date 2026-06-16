"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
};

type SearchableSelectProps = {
  id: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  emptyText,
  disabled = false,
  onChange,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption?.label ?? "");
    }
  }, [open, selectedOption?.label]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <div className="entity-search" ref={rootRef}>
      <div className="entity-search__field">
        <input
          autoComplete="off"
          className="entity-search__input"
          disabled={disabled}
          id={id}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={(event) => {
            event.currentTarget.select();
            setOpen(true);
          }}
          placeholder={placeholder}
          value={query}
        />
        {value ? (
          <button
            className="entity-search__clear"
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
            type="button"
          >
            清空
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="entity-search__panel">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                className={`entity-search__item ${option.id === value ? "active" : ""}`}
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setQuery(option.label);
                  setOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                <strong>{option.label}</strong>
                {option.description ? <span>{option.description}</span> : null}
              </button>
            ))
          ) : (
            <div className="entity-search__empty">{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
