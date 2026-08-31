import type { GardenPost } from "../admin/types";

const LEGACY_IMAGE_DATA_URL = /^data:(image\/(?:png|jpeg|gif|webp|avif));base64,([\s\S]+)$/i;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type UploadImage = (file: File) => Promise<string>;

function legacyImageFile(value: string, name: string) {
  const match = value.match(LEGACY_IMAGE_DATA_URL);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  try {
    const decoded = atob(match[2].replace(/\s/g, ""));
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    return new File([bytes], `${name}.${IMAGE_EXTENSIONS[mimeType]}`, { type: mimeType });
  } catch {
    throw new Error("One of the old note images is damaged and could not be brought into the new library.");
  }
}

export async function materializeLegacyPostImages(posts: GardenPost[], uploadImage: UploadImage) {
  const uploads = new Map<string, Promise<string>>();

  const materialize = (value: string, name: string) => {
    const file = legacyImageFile(value, name);
    if (!file) return Promise.resolve(value);

    const existing = uploads.get(value);
    if (existing) return existing;

    const upload = uploadImage(file);
    uploads.set(value, upload);
    return upload;
  };

  return Promise.all(posts.map(async (post) => ({
    ...post,
    coverImage: await materialize(post.coverImage, `${post.id}-cover`),
    gallery: await Promise.all((post.gallery || []).map((image, index) => (
      materialize(image, `${post.id}-gallery-${index + 1}`)
    ))),
  })));
}
