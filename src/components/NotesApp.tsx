"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pin,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  CheckSquare,
  ArrowLeft,
  Folder,
  StickyNote,
  FolderPlus,
  Briefcase,
  ListTodo,
} from "lucide-react";
import { createNote, saveNote, deleteNote, togglePinNote, moveNote, setNoteClient, convertNoteToTask } from "@/lib/noteActions";

export type NoteRow = {
  id: string;
  folder: string;
  title: string;
  body: string;
  pinned: boolean;
  clientId: string | null;
  updatedAt: string;
};

type ClientOpt = { id: string; name: string };

const ALL_FOLDERS = "__all__";

/**
 * Голый текст из HTML заметки — для сниппета и поиска. Через regex, а не DOM:
 * DOM-парсинг недоступен на сервере и давал разный результат при SSR и на
 * клиенте (пустая строка → текст) — React ругался на расхождение при гидрации.
 */
function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export default function NotesApp({ notes: initialNotes, clients }: { notes: NoteRow[]; clients: ClientOpt[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState<string>(ALL_FOLDERS);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [, startTransition] = useTransition();

  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadedId = useRef<string | null>(null);

  const folders = useMemo(() => {
    const set = new Set<string>(extraFolders);
    notes.forEach((n) => set.add(n.folder));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [notes, extraFolders]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => folder === ALL_FOLDERS || n.folder === folder)
      .filter((n) => !clientFilter || n.clientId === clientFilter)
      .filter((n) => {
        if (!q) return true;
        return n.title.toLowerCase().includes(q) || plainText(n.body).toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [notes, folder, clientFilter, query]);

  // При смене выбранной заметки — подгружаем её содержимое в редактор один раз
  // (не на каждый ререндер, иначе слетит курсор во время печати).
  useEffect(() => {
    if (!selected) return;
    if (lastLoadedId.current === selected.id) return;
    lastLoadedId.current = selected.id;
    if (titleRef.current) titleRef.current.value = selected.title;
    if (bodyRef.current) bodyRef.current.innerHTML = selected.body;
  }, [selected]);

  const patchNote = (id: string, patch: Partial<NoteRow>) => {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)));
  };

  const scheduleSave = () => {
    if (!selectedId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const title = titleRef.current?.value ?? "";
      const body = bodyRef.current?.innerHTML ?? "";
      patchNote(selectedId, { title, body });
      const fd = new FormData();
      fd.set("id", selectedId);
      fd.set("title", title);
      fd.set("body", body);
      startTransition(() => {
        saveNote(fd);
      });
    }, 600);
  };

  const openNote = (id: string) => {
    setSelectedId(id);
    setMobileView("editor");
  };

  const handleNewNote = () => {
    const targetFolder = folder === ALL_FOLDERS ? "Заметки" : folder;
    startTransition(async () => {
      const id = await createNote(targetFolder);
      if (clientFilter) {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("clientId", clientFilter);
        await setNoteClient(fd);
      }
      const fresh: NoteRow = {
        id,
        folder: targetFolder,
        title: "",
        body: "",
        pinned: false,
        clientId: clientFilter || null,
        updatedAt: new Date().toISOString(),
      };
      setNotes((ns) => [fresh, ...ns]);
      lastLoadedId.current = id;
      openNote(id);
      requestAnimationFrame(() => titleRef.current?.focus());
    });
  };

  const handleNewFolder = () => {
    const name = window.prompt("Название папки");
    if (!name?.trim()) return;
    setExtraFolders((f) => [...f, name.trim()]);
    setFolder(name.trim());
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!window.confirm("Удалить заметку без возможности восстановления?")) return;
    const id = selected.id;
    setNotes((ns) => ns.filter((n) => n.id !== id));
    setSelectedId(null);
    setMobileView("list");
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => {
      deleteNote(fd);
    });
  };

  const handlePin = () => {
    if (!selected) return;
    patchNote(selected.id, { pinned: !selected.pinned });
    const fd = new FormData();
    fd.set("id", selected.id);
    startTransition(() => {
      togglePinNote(fd);
    });
  };

  const handleMove = (targetFolder: string) => {
    if (!selected) return;
    patchNote(selected.id, { folder: targetFolder });
    const fd = new FormData();
    fd.set("id", selected.id);
    fd.set("folder", targetFolder);
    startTransition(() => {
      moveNote(fd);
    });
  };

  const handleSetClient = (clientId: string) => {
    if (!selected) return;
    patchNote(selected.id, { clientId: clientId || null });
    const fd = new FormData();
    fd.set("id", selected.id);
    fd.set("clientId", clientId);
    startTransition(() => {
      setNoteClient(fd);
    });
  };

  const [converting, setConverting] = useState(false);
  const handleConvertToTask = () => {
    if (!selected) return;
    setConverting(true);
    const fd = new FormData();
    fd.set("id", selected.id);
    startTransition(async () => {
      const taskId = await convertNoteToTask(fd);
      setConverting(false);
      if (taskId) router.push("/tasks");
    });
  };

  const exec = (cmd: string) => {
    bodyRef.current?.focus();
    document.execCommand(cmd, false);
    scheduleSave();
  };

  const insertChecklist = () => {
    bodyRef.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      '<div class="note-check flex items-start gap-2 my-0.5"><input type="checkbox" class="mt-1 shrink-0" /><span>&nbsp;</span></div>'
    );
    scheduleSave();
  };

  // Клик по чекбоксу внутри заметки — зачёркиваем строку, не открывая редактирование.
  const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      const line = target.closest(".note-check");
      if (target.checked) {
        target.setAttribute("checked", "checked");
        line?.classList.add("line-through", "opacity-50");
      } else {
        target.removeAttribute("checked");
        line?.classList.remove("line-through", "opacity-50");
      }
      scheduleSave();
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[420px] overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {/* Список заметок */}
      <div
        className={`w-full shrink-0 flex-col border-r border-zinc-200 sm:w-80 sm:flex ${
          mobileView === "list" ? "flex" : "hidden"
        }`}
      >
        <div className="space-y-2 border-b border-zinc-200 p-3">
          <div className="flex items-center gap-2">
            <select
              className="input !py-1.5 flex-1 !text-sm"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              <option value={ALL_FOLDERS}>Все заметки</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <button onClick={handleNewFolder} className="btn-ghost !px-2 !py-1.5" title="Новая папка">
              <FolderPlus size={16} />
            </button>
          </div>
          {clients.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Briefcase size={14} className="shrink-0 text-muted" />
              <select
                className="input !py-1.5 flex-1 !text-sm"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="">Все проекты</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input !py-1.5 !pl-8 !text-sm"
              placeholder="Поиск"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={handleNewNote} className="btn-primary w-full !py-1.5 !text-sm">
            <Plus size={15} /> Новая заметка
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
              <StickyNote size={28} className="opacity-40" />
              {query ? "Ничего не найдено" : "Заметок пока нет"}
            </div>
          )}
          {filtered.map((n) => {
            const snippet = plainText(n.body);
            const clientName = n.clientId ? clients.find((c) => c.id === n.clientId)?.name : null;
            return (
              <button
                key={n.id}
                onClick={() => openNote(n.id)}
                className={`block w-full border-b border-zinc-100 px-3 py-2.5 text-left transition ${
                  selectedId === n.id ? "bg-subtle" : "hover:bg-subtle/60"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {n.pinned && <Pin size={11} className="shrink-0 fill-current text-amber-500" />}
                  <span className="truncate text-sm font-medium">{n.title || "Новая заметка"}</span>
                </div>
                {clientName && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--accent)]">
                    <Briefcase size={10} className="shrink-0" /> <span className="truncate">{clientName}</span>
                  </div>
                )}
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <span className="shrink-0">{relativeDate(n.updatedAt)}</span>
                  {snippet && <span className="truncate">— {snippet}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Редактор */}
      <div className={`flex min-w-0 flex-1 flex-col ${mobileView === "editor" ? "flex" : "hidden sm:flex"}`}>
        {selected ? (
          <>
            <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 p-2">
              <button
                onClick={() => setMobileView("list")}
                className="btn-ghost !px-2 !py-1.5 sm:hidden"
                title="К списку"
              >
                <ArrowLeft size={16} />
              </button>
              <button onClick={() => exec("bold")} className="btn-ghost !px-2 !py-1.5" title="Жирный">
                <Bold size={15} />
              </button>
              <button onClick={() => exec("italic")} className="btn-ghost !px-2 !py-1.5" title="Курсив">
                <Italic size={15} />
              </button>
              <button onClick={() => exec("underline")} className="btn-ghost !px-2 !py-1.5" title="Подчёркнутый">
                <Underline size={15} />
              </button>
              <button
                onClick={() => exec("insertUnorderedList")}
                className="btn-ghost !px-2 !py-1.5"
                title="Список"
              >
                <List size={15} />
              </button>
              <button onClick={insertChecklist} className="btn-ghost !px-2 !py-1.5" title="Чек-лист">
                <CheckSquare size={15} />
              </button>
              <button
                onClick={handleConvertToTask}
                disabled={converting}
                className="btn-ghost !px-2 !py-1.5"
                title="Превратить в задачу на доске"
              >
                <ListTodo size={15} /> <span className="hidden sm:inline">В задачу</span>
              </button>

              <div className="ml-auto flex items-center gap-1">
                <select
                  className="input !py-1 !text-xs"
                  value={selected.folder}
                  onChange={(e) => handleMove(e.target.value)}
                  title="Переместить в папку"
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePin}
                  className={`btn-ghost !px-2 !py-1.5 ${selected.pinned ? "text-amber-500" : ""}`}
                  title="Закрепить"
                >
                  <Pin size={15} className={selected.pinned ? "fill-current" : ""} />
                </button>
                <button onClick={handleDelete} className="btn-ghost !px-2 !py-1.5 text-red-600" title="Удалить">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-4 pt-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Folder size={12} /> {selected.folder} · {relativeDate(selected.updatedAt)}
              </span>
              {clients.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Briefcase size={12} />
                  <select
                    className="input !py-0.5 !text-xs"
                    value={selected.clientId ?? ""}
                    onChange={(e) => handleSetClient(e.target.value)}
                    title="Привязать к проекту"
                  >
                    <option value="">— без проекта —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </span>
              )}
            </div>

            <input
              ref={titleRef}
              defaultValue={selected.title}
              onChange={scheduleSave}
              placeholder="Заголовок"
              className="mx-4 mt-1 border-none bg-transparent text-lg font-semibold outline-none placeholder:text-zinc-300"
            />

            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              onInput={scheduleSave}
              onClick={onBodyClick}
              className="note-editor mx-4 mb-4 mt-2 flex-1 overflow-y-auto text-sm leading-relaxed outline-none [&_.note-check]:list-none [&_ul]:list-disc [&_ul]:pl-5"
              data-placeholder="Заметка"
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted">
            <StickyNote size={32} className="opacity-30" />
            Выберите заметку или создайте новую
          </div>
        )}
      </div>
    </div>
  );
}
