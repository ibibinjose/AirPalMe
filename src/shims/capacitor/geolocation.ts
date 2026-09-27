export interface Position {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
}

export interface PositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export type WatchPositionCallback = (position: Position | null, err?: any) => void;
export type CallbackID = string;

export const Geolocation = {
  getCurrentPosition: async (_options?: PositionOptions): Promise<Position> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos as unknown as Position),
          (err) => reject(err),
          _options,
        );
      } else {
        reject(new Error("Geolocation not available"));
      }
    });
  },
  watchPosition: async (_options: PositionOptions, callback: WatchPositionCallback): Promise<CallbackID> => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => callback(pos as unknown as Position),
        (err) => callback(null, err),
        _options,
      );
      return String(id);
    }
    return "";
  },
  clearWatch: async (options: { id: CallbackID }): Promise<void> => {
    if (typeof navigator !== "undefined" && navigator.geolocation && options.id) {
      navigator.geolocation.clearWatch(Number(options.id));
    }
  },
  checkPermissions: async () => ({ location: "granted", coarseLocation: "granted" }),
  requestPermissions: async () => ({ location: "granted", coarseLocation: "granted" }),
};
