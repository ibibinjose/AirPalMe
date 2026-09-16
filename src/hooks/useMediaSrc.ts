import { useEffect, useState } from "react";
import { localImageUrl } from "@/lib/image-store";

export function useMediaSrc(src?: string) {
  const remote = src && !src.startsWith("idb:") ? src : undefined;
  const [url, setUrl] = useState(remote);

  useEffect(() => {
    if (!src) {
      setUrl(undefined);
      return;
    }
    if (!src.startsWith("idb:")) {
      setUrl(src);
      return;
    }
    let live = true;
    void localImageUrl(src).then((next) => {
      if (live) setUrl(next);
    });
    return () => {
      live = false;
    };
  }, [src]);

  return url;
}
