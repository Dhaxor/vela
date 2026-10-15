// Photo persistence for proofs and Scenes. Picker URIs point into caches iOS
// may clear, so on native the file is copied into the app's document
// directory; on web the picker hands back a data or blob URI that is kept
// as-is. Native modules are required lazily (bun can load this file).

/** File extension of a picked URI ('jpg' when unknown). */
export function photoExtension(uri: string): string {
  const path = uri.split("?")[0].split("#")[0];
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
  return /^[a-z0-9]{2,5}$/u.test(ext) ? ext : "jpg";
}

/** Copy a picked photo somewhere permanent. Falls back to the picker URI if the copy fails. */
export async function persistPhoto(pickedUri: string, name: string): Promise<string> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Platform } = require("react-native") as typeof import("react-native");
  if (Platform.OS === "web" || !pickedUri) return pickedUri;
  try {
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const dest = new File(Paths.document, `${name}.${photoExtension(pickedUri)}`);
    if (dest.exists) return dest.uri;
    await new File(pickedUri).copy(dest);
    return dest.uri;
  } catch {
    return pickedUri;
  }
}
