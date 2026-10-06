import {
  CURRENT_PROPERTY,
  IN_ROOM_DINING_MENU,
  INITIAL_STAFF_TICKETS,
  SAFETY_AND_EMERGENCY_DATA,
} from "@shared/airpal-data";
import { THE_ROCKS_PRECINCT } from "@shared/the-rocks-data";
import { HARBOUR_COLLEGE } from "@shared/campus";

/**
 * Stay + precinct datasets, split out of `./catalog` so the initial bundle
 * never pays for them. Import from here only in lazy stay/concierge/host
 * surfaces — never from providers, shell, or home-page code.
 */
export const STAY = CURRENT_PROPERTY;
export const MENU = IN_ROOM_DINING_MENU;
export const TICKETS = INITIAL_STAFF_TICKETS;
export const SAFETY = SAFETY_AND_EMERGENCY_DATA;
export const CAMPUS = HARBOUR_COLLEGE;
export const PRECINCT = THE_ROCKS_PRECINCT;

export const ROCKS_BROWSE = {
  mode: "city" as const,
  city: "The Rocks, Sydney",
  lat: THE_ROCKS_PRECINCT.geo?.lat ?? -33.85945,
  lng: THE_ROCKS_PRECINCT.geo?.lng ?? 151.20835,
};
