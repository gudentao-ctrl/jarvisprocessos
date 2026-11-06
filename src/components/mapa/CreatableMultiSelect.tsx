import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, Check, ChevronsUpDown, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CreatableMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  onEditOption?: (oldValue: string, newValue: string) => void | Promise<void>;
  onDeleteOption?: (valueToDelete: string) => void | Promise<void>;
  className?: string;
  badgeClassName?: string;
}

export function CreatableMultiSelect({
  values = [],
  onChange,
  options = [],
  placeholder = "Selecione ou adicione...",
  searchPlaceholder = "Buscar ou digitar novo...",
  emptyMessage = "Nenhuma opção encontrada",
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  onEditOption,
  onDeleteOption,
  className,
  badgeClassName,
}: CreatableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setEditingOption(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered options based on query
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const unique = Array.from(new Set(options.map((o) => o.trim()).filter(Boolean)));
    if (!q) return unique;
    return unique.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  const canCreate = useMemo(() => {
    if (!allowCreate) return false;
    const q = query.trim();
    if (!q) return false;
    const alreadySelected = values.some(
      (v) => v.toLowerCase() === q.toLowerCase()
    );
    const inFiltered = filteredOptions.some(
      (opt) => opt.toLowerCase() === q.toLowerCase()
    );
    return !alreadySelected && !inFiltered;
  }, [allowCreate, query, values, filteredOptions]);

  const handleSelect = (val: string) => {
    const clean = val.trim();
    if (!clean) return;
    if (values.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      // Toggle off
      onChange(values.filter((v) => v.toLowerCase() !== clean.toLowerCase()));
    } else {
      // Add
      onChange([...values, clean]);
    }
    setQuery("");
  };

  const handleRemove = (valToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(values.filter((v) => v.toLowerCase() !== valToRemove.toLowerCase()));
  };

  const handleStartEdit = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOption(opt);
    setEditingText(opt);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveEdit = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (!editingOption) return;
    const newName = editingText.trim();
    if (!newName || newName === editingOption) {
      setEditingOption(null);
      return;
    }

    if (onEditOption) {
      await onEditOption(editingOption, newName);
    }

    // Update in selected values if present
    if (values.some((v) => v.toLowerCase() === editingOption.toLowerCase())) {
      onChange(
        values.map((v) =>
          v.toLowerCase() === editingOption.toLowerCase() ? newName : v
        )
      );
    }
    setEditingOption(null);
  };

  const handleDelete = async (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Deseja excluir a opção "${opt}"?`)) return;

    if (onDeleteOption) {
      await onDeleteOption(opt);
    }

    // Remove from selected values if present
    if (values.some((v) => v.toLowerCase() === opt.toLowerCase())) {
      onChange(values.filter((v) => v.toLowerCase() !== opt.toLowerCase()));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;

      const exactMatch = filteredOptions.find(
        (o) => o.toLowerCase() === q.toLowerCase()
      );
      if (exactMatch) {
        handleSelect(exactMatch);
      } else if (allowCreate) {
        handleSelect(q);
      }
    } else if (e.key === "Backspace" && !query && values.length > 0) {
      handleRemove(values[values.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setEditingOption(null);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Box containing selected badges and input trigger */}
      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={cn(
          "min-h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm transition-colors",
          "focus-within:ring-1 focus-within:ring-ring focus-within:border-ring cursor-text",
          "flex flex-wrap items-center gap-1.5"
        )}
      >
        {values.map((val) => (
          <Badge
            key={val}
            variant="secondary"
            className={cn(
              "h-6 px-2 py-0 text-[11px] font-medium gap-1 max-w-[200px] truncate select-none bg-accent/60 text-foreground border border-border/60",
              badgeClassName
            )}
          >
            <span className="truncate">{val}</span>
            <button
              type="button"
              onClick={(e) => handleRemove(val, e)}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : searchPlaceholder}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground text-xs h-6 py-0"
        />

        <div className="ml-auto flex items-center shrink-0 text-muted-foreground">
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </div>
      </div>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-1 space-y-0.5">
            {/* Create option */}
            {canCreate && (
              <button
                type="button"
                onClick={() => handleSelect(query)}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 font-semibold text-primary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  Adicionar "<strong>{query.trim()}</strong>"
                </span>
              </button>
            )}

            {/* Existing filtered options */}
            {filteredOptions.map((opt) => {
              const isSelected = values.some(
                (v) => v.toLowerCase() === opt.toLowerCase()
              );
              const isEditing = editingOption === opt;

              if (isEditing) {
                return (
                  <div
                    key={opt}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2 py-1 bg-accent/70 rounded-sm"
                  >
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEdit();
                        } else if (e.key === "Escape") {
                          setEditingOption(null);
                        }
                      }}
                      className="flex-1 bg-background border border-input rounded px-2 py-0.5 text-xs h-6 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="p-1 hover:bg-emerald-100 text-emerald-700 dark:hover:bg-emerald-950/60 dark:text-emerald-400 rounded transition-colors"
                      title="Confirmar alteração"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingOption(null)}
                      className="p-1 hover:bg-rose-100 text-rose-700 dark:hover:bg-rose-950/60 dark:text-rose-400 rounded transition-colors"
                      title="Cancelar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "group flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer select-none",
                    isSelected && "font-semibold bg-accent/40"
                  )}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    {allowEdit && (
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(opt, e)}
                        className="p-1 text-muted-foreground hover:text-primary hover:bg-background/80 rounded transition-colors"
                        title="Editar nome da opção"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {allowDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(opt, e)}
                        className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-background/80 rounded transition-colors"
                        title="Excluir opção"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredOptions.length === 0 && !canCreate && (
              <div className="px-2.5 py-2 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
