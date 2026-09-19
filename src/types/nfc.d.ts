/** Android Chrome Web NFC. iOS Safari does not expose this. */
interface NDEFReadingEvent extends Event {
  message: { records: Array<{ recordType: string; data?: DataView }> };
}

interface NDEFReader {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  write: (message: unknown) => Promise<void>;
  addEventListener: (type: "reading", listener: (ev: NDEFReadingEvent) => void) => void;
  removeEventListener: (type: "reading", listener: (ev: NDEFReadingEvent) => void) => void;
}

interface Window {
  NDEFReader?: new () => NDEFReader;
}
