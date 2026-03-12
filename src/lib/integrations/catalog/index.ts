import type { CatalogEntry, IntegrationType } from "../types";
import { whatsappBridge } from "./bridges/whatsapp";
import { signalBridge } from "./bridges/signal";
import { telegramBridge } from "./bridges/telegram";

const ALL_ENTRIES: CatalogEntry[] = [
  whatsappBridge,
  signalBridge,
  telegramBridge,
];

export function getCatalog(): CatalogEntry[] {
  return ALL_ENTRIES;
}

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return ALL_ENTRIES.find((e) => e.id === id);
}

export function getCatalogByType(type: IntegrationType): CatalogEntry[] {
  return ALL_ENTRIES.filter((e) => e.type === type);
}

export function searchCatalog(query: string): CatalogEntry[] {
  const q = query.toLowerCase();
  return ALL_ENTRIES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
  );
}
