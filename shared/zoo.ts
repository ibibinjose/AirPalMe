import { handleFromPlaceId } from "./bio";
import { THE_ROCKS_PLACES } from "./the-rocks-data";

export const ZOO_STASH_KEY = "airpal.zoo.v1";

export type ZooAnimalId =
  | "koala"
  | "kangaroo"
  | "wombat"
  | "echidna"
  | "platypus"
  | "cockatoo"
  | "kookaburra"
  | "magpie"
  | "cassowary"
  | "quokka"
  | "dingo"
  | "wren";

export type ZooAnimal = {
  id: ZooAnimalId;
  name: string;
  latin: string;
};

export const ZOO_ANIMALS: ZooAnimal[] = [
  { id: "koala", name: "Koala", latin: "Phascolarctos cinereus" },
  { id: "kangaroo", name: "Kangaroo", latin: "Macropus rufus" },
  { id: "wombat", name: "Wombat", latin: "Vombatus ursinus" },
  { id: "echidna", name: "Echidna", latin: "Tachyglossus aculeatus" },
  { id: "platypus", name: "Platypus", latin: "Ornithorhynchus anatinus" },
  { id: "cockatoo", name: "Cockatoo", latin: "Cacatua galerita" },
  { id: "kookaburra", name: "Kookaburra", latin: "Dacelo novaeguineae" },
  { id: "magpie", name: "Magpie", latin: "Gymnorhina tibicen" },
  { id: "cassowary", name: "Cassowary", latin: "Casuarius casuarius" },
  { id: "quokka", name: "Quokka", latin: "Setonix brachyurus" },
  { id: "dingo", name: "Dingo", latin: "Canis dingo" },
  { id: "wren", name: "Fairy-wren", latin: "Malurus cyaneus" },
];

export type ZooHuntStop = {
  placeId: string;
  handle: string;
  name: string;
  animalId: ZooAnimalId;
  offer?: { badge: string; detail: string };
};

export type ZooHunt = {
  id: string;
  name: string;
  precinctId: string;
  city: string;
  stops: ZooHuntStop[];
};

const PILOT_STOPS: Array<{ placeId: string; animalId: ZooAnimalId; offer: { badge: string; detail: string } }> = [
  { placeId: "glenmore", animalId: "koala", offer: { badge: "Guest schooner", detail: "Show your Koala sticker before 6 for a guest rate on a local schooner." } },
  { placeId: "fortune-of-war", animalId: "kangaroo", offer: { badge: "Counter meal", detail: "Show Kangaroo at the bar for the counter-meal special." } },
  { placeId: "australian-hotel", animalId: "wombat", offer: { badge: "Pizza slice", detail: "Wombat holders get a guest note on a pizza." } },
  { placeId: "la-renaissance", animalId: "echidna", offer: { badge: "Tart of the day", detail: "Show Echidna for a pastry with coffee." } },
  { placeId: "fine-food-store", animalId: "platypus", offer: { badge: "Espresso", detail: "Platypus in Zoo: mention AirPal for a guest espresso." } },
  { placeId: "mecca-cq", animalId: "cockatoo", offer: { badge: "Takeaway pour", detail: "Cockatoo sticker: guest pour at the Quay window." } },
  { placeId: "gumption-cq", animalId: "kookaburra", offer: { badge: "Single origin", detail: "Kookaburra holders: ask for the AirPal cup." } },
  { placeId: "tea-cosy", animalId: "magpie", offer: { badge: "Scone", detail: "Show Magpie for a scone with the pot." } },
  { placeId: "little-marionette", animalId: "cassowary", offer: { badge: "House roast", detail: "Cassowary in Zoo: guest note on a house roast." } },
  { placeId: "gannon-house", animalId: "quokka", offer: { badge: "Print look", detail: "Quokka sticker: a look at the print rack with the desk." } },
  { placeId: "craft-nsw", animalId: "dingo", offer: { badge: "Maker stall", detail: "Dingo holders: weekend stall guest greeting." } },
  { placeId: "rocks-distillery", animalId: "wren", offer: { badge: "Tasting note", detail: "Fairy-wren: ask for the tasting flight note." } },
];

function placeName(placeId: string) {
  return THE_ROCKS_PLACES.find((p) => p.id === placeId)?.name || placeId;
}

function placeHandle(placeId: string) {
  const place = THE_ROCKS_PLACES.find((p) => p.id === placeId);
  return place?.handle || handleFromPlaceId(placeId) || placeId.replace(/[^a-z0-9]/g, "");
}

export const THE_ROCKS_ZOO: ZooHunt = {
  id: "the-rocks-zoo",
  name: "The Rocks Zoo",
  precinctId: "the-rocks",
  city: "Sydney",
  stops: PILOT_STOPS.map((row) => ({
    placeId: row.placeId,
    handle: placeHandle(row.placeId),
    name: placeName(row.placeId),
    animalId: row.animalId,
    offer: row.offer,
  })),
};

export const ZOO_HUNTS: ZooHunt[] = [THE_ROCKS_ZOO];

export type ZooShopVisit = {
  handle: string;
  placeId?: string;
  name: string;
  animalId: ZooAnimalId;
  huntId: string;
  scannedAt: string;
  liked?: boolean;
  followed?: boolean;
};

export type ZooSticker = {
  animalId: ZooAnimalId;
  handle: string;
  huntId: string;
  collectedAt: string;
};

export type ZooState = {
  stickers: ZooSticker[];
  shops: ZooShopVisit[];
};

export function emptyZoo(): ZooState {
  return { stickers: [], shops: [] };
}

export function animalById(id: string) {
  return ZOO_ANIMALS.find((a) => a.id === id);
}

/**
 * Live hunts are passed in (Firestore `zooHunts` via hunts-store). Never
 * defaults to the bundled migration source — empty means no hunts.
 */
export function huntById(id: string, hunts: ZooHunt[] = []) {
  return hunts.find((h) => h.id === id);
}

export function zooStopForHandle(handle: string, hunts: ZooHunt[] = []) {
  const h = handle.trim().toLowerCase().replace(/^@+/, "");
  for (const hunt of hunts) {
    const stop = hunt.stops.find((s) => s.handle === h);
    if (stop) return { hunt, stop };
  }
  return null;
}

export function zooStopForPlaceId(placeId: string, hunts: ZooHunt[] = []) {
  const id = placeId.trim().toLowerCase();
  for (const hunt of hunts) {
    const stop = hunt.stops.find((s) => s.placeId === id);
    if (stop) return { hunt, stop };
  }
  return null;
}

export function huntProgress(state: ZooState, huntId: string, hunts: ZooHunt[] = []) {
  const hunt = huntById(huntId, hunts);
  if (!hunt) return { have: 0, total: 0, label: "" };
  const have = hunt.stops.filter((s) => state.stickers.some((st) => st.animalId === s.animalId && st.huntId === huntId)).length;
  return { have, total: hunt.stops.length, label: `${hunt.name} ${have}/${hunt.stops.length}` };
}

export function mergeZooState(local: ZooState, remote: ZooState): ZooState {
  const stickers = [...remote.stickers];
  for (const row of local.stickers) {
    if (!stickers.some((s) => s.animalId === row.animalId && s.huntId === row.huntId)) stickers.push(row);
  }
  const shops = [...remote.shops];
  for (const row of local.shops) {
    const i = shops.findIndex((s) => s.handle === row.handle);
    if (i < 0) shops.push(row);
    else {
      shops[i] = {
        ...shops[i],
        liked: shops[i].liked || row.liked,
        followed: shops[i].followed || row.followed,
        scannedAt: shops[i].scannedAt < row.scannedAt ? shops[i].scannedAt : row.scannedAt,
      };
    }
  }
  return { stickers, shops };
}

export function collectAtStop(state: ZooState, hunt: ZooHunt, stop: ZooHuntStop, at = new Date().toISOString()): { state: ZooState; fresh: boolean } {
  const already = state.stickers.some((s) => s.animalId === stop.animalId && s.huntId === hunt.id);
  const shops = [...state.shops];
  const i = shops.findIndex((s) => s.handle === stop.handle);
  const visit: ZooShopVisit = {
    handle: stop.handle,
    placeId: stop.placeId,
    name: stop.name,
    animalId: stop.animalId,
    huntId: hunt.id,
    scannedAt: i >= 0 ? shops[i].scannedAt : at,
    liked: i >= 0 ? shops[i].liked : false,
    followed: i >= 0 ? shops[i].followed : false,
  };
  if (i >= 0) shops[i] = { ...shops[i], ...visit };
  else shops.unshift(visit);
  const stickers = already
    ? state.stickers
    : [{ animalId: stop.animalId, handle: stop.handle, huntId: hunt.id, collectedAt: at }, ...state.stickers];
  return { state: { stickers, shops }, fresh: !already };
}

export function zooOffers(state: ZooState, hunts: ZooHunt[] = []) {
  const out: Array<{ handle: string; name: string; animalId: ZooAnimalId; badge: string; detail: string }> = [];
  for (const shop of state.shops) {
    const hit = zooStopForHandle(shop.handle, hunts);
    if (!hit?.stop.offer) continue;
    out.push({
      handle: shop.handle,
      name: shop.name,
      animalId: shop.animalId,
      badge: hit.stop.offer.badge,
      detail: hit.stop.offer.detail,
    });
  }
  return out;
}
