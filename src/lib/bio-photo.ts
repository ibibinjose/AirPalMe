import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuth, getFirebaseStorage } from "./firebase";

export async function readImageAsDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image");
  if (file.size > 2.5 * 1024 * 1024) throw new Error("Under 2.5 MB");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read"));
    reader.readAsDataURL(file);
  });
}

export async function uploadBioPhoto(file: File, kind: "avatar" | "cover") {
  const storage = getFirebaseStorage();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!storage || !uid || getFirebaseAuth()?.currentUser?.isAnonymous) {
    return readImageAsDataUrl(file);
  }
  if (!file.type.startsWith("image/")) throw new Error("Choose an image");
  if (file.size > 5 * 1024 * 1024) throw new Error("Under 5 MB");
  const path = `bios/${uid}/${kind}-${Date.now()}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}
