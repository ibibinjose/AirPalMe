import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { useStay } from "@/contexts/StayContext";
import { checklistKey, defaultChecklist, readChecklist, writeChecklist, type ChecklistItem } from "@/lib/checklist";

export function useStayChecklist() {
  const { property, session, roomLabel } = useStay();
  const key = checklistKey(session.propertyId || property.id, roomLabel);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    setItems(readChecklist(key, defaultChecklist(property, session.kind, roomLabel)));
  }, [key, property, roomLabel, session.kind]);

  const persist = useCallback(
    (next: ChecklistItem[]) => {
      setItems(next);
      writeChecklist(key, next);
    },
    [key],
  );

  const toggle = useCallback(
    (id: string) => {
      persist(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
    },
    [items, persist],
  );

  const add = useCallback(
    (label: string) => {
      const text = label.trim();
      if (!text) return;
      persist([...items, { id: `c-${nanoid(8)}`, label: text, done: false, custom: true }]);
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((item) => item.id !== id));
    },
    [items, persist],
  );

  const reset = useCallback(() => {
    persist(defaultChecklist(property, session.kind, roomLabel).map((item) => ({ ...item, done: false })));
  }, [persist, property, roomLabel, session.kind]);

  const done = items.filter((item) => item.done).length;

  return { items, toggle, add, remove, reset, done, total: items.length };
}
