import { describe, expect, it } from "vitest";
import {
  THE_ROCKS_ZOO,
  ZOO_ANIMALS,
  collectAtStop,
  emptyZoo,
  huntProgress,
  mergeZooState,
  zooOffers,
  zooStopForHandle,
  zooStopForPlaceId,
} from "./zoo";

describe("The Rocks Zoo", () => {
  it("has twelve unique shops and animals", () => {
    expect(THE_ROCKS_ZOO.stops).toHaveLength(12);
    expect(new Set(THE_ROCKS_ZOO.stops.map((s) => s.animalId)).size).toBe(12);
    expect(new Set(THE_ROCKS_ZOO.stops.map((s) => s.handle)).size).toBe(12);
    expect(ZOO_ANIMALS).toHaveLength(12);
  });

  it("resolves a scan by handle or place id", () => {
    const hunts = [THE_ROCKS_ZOO];
    const byPlace = zooStopForPlaceId("glenmore", hunts);
    expect(byPlace?.stop.animalId).toBe("koala");
    const byHandle = zooStopForHandle(byPlace!.stop.handle, hunts);
    expect(byHandle?.hunt.id).toBe("the-rocks-zoo");
  });

  it("collects once and keeps shop visits", () => {
    const stop = THE_ROCKS_ZOO.stops[0];
    const first = collectAtStop(emptyZoo(), THE_ROCKS_ZOO, stop);
    expect(first.fresh).toBe(true);
    expect(first.state.stickers).toHaveLength(1);
    const second = collectAtStop(first.state, THE_ROCKS_ZOO, stop);
    expect(second.fresh).toBe(false);
    expect(second.state.stickers).toHaveLength(1);
    expect(second.state.shops).toHaveLength(1);
  });

  it("merges a session stash into an account without dropping stickers", () => {
    const a = collectAtStop(emptyZoo(), THE_ROCKS_ZOO, THE_ROCKS_ZOO.stops[0]).state;
    const b = collectAtStop(emptyZoo(), THE_ROCKS_ZOO, THE_ROCKS_ZOO.stops[1]).state;
    const merged = mergeZooState(a, b);
    expect(merged.stickers).toHaveLength(2);
    expect(huntProgress(merged, "the-rocks-zoo", [THE_ROCKS_ZOO]).label).toBe("The Rocks Zoo 2/12");
  });

  it("lists offers only for shops already scanned", () => {
    const state = collectAtStop(emptyZoo(), THE_ROCKS_ZOO, THE_ROCKS_ZOO.stops[0]).state;
    const offers = zooOffers(state, [THE_ROCKS_ZOO]);
    expect(offers).toHaveLength(1);
    expect(offers[0].handle).toBe(THE_ROCKS_ZOO.stops[0].handle);
  });
});
