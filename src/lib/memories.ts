export type Memory = {
  id: string;
  /** Photo src: `idb:` local blob id or a remote https URL. */
  src: string;
  caption?: string;
  /** Free-text names / @handles of people in the shot. */
  people: string[];
  place?: string;
  takenAt: string;
};

const KEY = "airpal:memories:v1";

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function clean(row: unknown): Memory | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Partial<Memory>;
  if (typeof r.src !== "string" || !r.src) return null;
  const people = Array.isArray(r.people)
    ? r.people.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
    : [];
  return {
    id: typeof r.id === "string" && r.id ? r.id : `m-${Date.now()}`,
    src: r.src,
    caption: typeof r.caption === "string" && r.caption.trim() ? r.caption.trim() : undefined,
    people,
    place: typeof r.place === "string" && r.place.trim() ? r.place.trim() : undefined,
    takenAt: typeof r.takenAt === "string" && r.takenAt ? r.takenAt : new Date().toISOString(),
  };
}

export function listMemories(): Memory[] {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(clean).filter((m): m is Memory => m !== null);
  } catch {
    return [];
  }
}

function persist(memories: Memory[]): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(memories));
  } catch {
    /* private mode or quota: metadata is best-effort, blobs live in IndexedDB */
  }
}

export function newMemoryId(): string {
  try {
    return `m-${crypto.randomUUID()}`;
  } catch {
    return `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export function addMemory(input: Omit<Memory, "id" | "takenAt"> & { takenAt?: string }): Memory {
  const row: Memory = {
    id: newMemoryId(),
    src: input.src,
    caption: input.caption?.trim() || undefined,
    people: (input.people || []).map((p) => p.trim()).filter(Boolean),
    place: input.place?.trim() || undefined,
    takenAt: input.takenAt || new Date().toISOString(),
  };
  persist([row, ...listMemories()]);
  return row;
}

export function updateMemory(id: string, patch: Partial<Pick<Memory, "caption" | "people" | "place">>): Memory | null {
  const memories = listMemories();
  const idx = memories.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const next: Memory = {
    ...memories[idx],
    caption: patch.caption !== undefined ? patch.caption.trim() || undefined : memories[idx].caption,
    people:
      patch.people !== undefined
        ? patch.people.map((p) => p.trim()).filter(Boolean)
        : memories[idx].people,
    place: patch.place !== undefined ? patch.place.trim() || undefined : memories[idx].place,
  };
  memories[idx] = next;
  persist(memories);
  return next;
}

export function removeMemory(id: string): void {
  persist(listMemories().filter((m) => m.id !== id));
}

function personKey(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export function memoriesWithPerson(memories: Memory[], personId: string): Memory[] {
  const needle = personKey(personId);
  if (!needle) return [];
  return memories.filter((m) => m.people.some((p) => personKey(p) === needle));
}
