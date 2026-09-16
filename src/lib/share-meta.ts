export function setShareMeta(input: { title: string; description: string; image?: string; url?: string }) {
  if (typeof document === "undefined") return;
  document.title = input.title;
  const set = (key: string, value: string, prop = "property") => {
    let tag = document.head.querySelector(`meta[${prop}="${key}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(prop, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", value);
  };
  set("og:title", input.title);
  set("og:description", input.description);
  set("description", input.description, "name");
  set("twitter:card", "summary_large_image", "name");
  set("twitter:title", input.title, "name");
  set("twitter:description", input.description, "name");
  if (input.image) {
    const image = input.image.startsWith("http") ? input.image : `${window.location.origin}${input.image}`;
    set("og:image", image);
    set("twitter:image", image, "name");
  }
  if (input.url) set("og:url", input.url);
}
