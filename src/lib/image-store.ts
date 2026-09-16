import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { outputSize, sourceRect, type CropView } from "@shared/image-crop";
import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";

const DB_NAME = "airpal-media";
const STORE = "images";

export type MediaFolder = "bios" | "listings" | "memories";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Media store failed"));
  });
}

export async function saveLocalImage(blob: Blob): Promise<string> {
  const id = `idb:${crypto.randomUUID()}`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not keep photo"));
  });
  db.close();
  return id;
}

const urlCache = new Map<string, string>();

export async function localImageUrl(id: string): Promise<string | undefined> {
  if (urlCache.has(id)) return urlCache.get(id);
  const db = await openDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error || new Error("Could not read photo"));
  });
  db.close();
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function isStoredSrc(src?: string) {
  if (!src) return false;
  return src.startsWith("idb:") || src.startsWith("http") || src.startsWith("/") || src.startsWith("blob:") || src.startsWith("data:");
}

export async function rasterizeCrop(image: HTMLImageElement, view: CropView, maxEdge: number): Promise<Blob> {
  const rect = sourceRect(view);
  const out = outputSize(rect, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = out.w;
  canvas.height = out.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, out.w, out.h);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((row) => (row ? resolve(row) : reject(new Error("Could not encode photo"))), "image/jpeg", 0.88);
  });
  if (blob.size > 4.5 * 1024 * 1024) throw new Error("Photo is still too large. Zoom in or pick another.");
  return blob;
}

export async function storeMedia(
  blob: Blob,
  dest: { folder: MediaFolder; kind: string },
): Promise<string> {
  if (blob.size > 5 * 1024 * 1024) throw new Error("Under 5 MB");
  const auth = getFirebaseAuth()?.currentUser;
  const storage = getFirebaseStorage();
  if (storage && auth && !auth.isAnonymous) {
    const path = `${dest.folder}/${auth.uid}/${dest.kind}-${Date.now()}.jpg`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000,immutable",
    });
    return getDownloadURL(fileRef);
  }
  return saveLocalImage(blob);
}

export function readFileAsImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo");
  if (file.size > 12 * 1024 * 1024) throw new Error("Under 12 MB");
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ image: img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo"));
    };
    img.src = url;
  });
}
