// Persisting the user's video file handle so a saved project can RE-LINK its
// media automatically on the next visit (CapCut-style) — without re-uploading.
// Uses the File System Access API (Chromium) + IndexedDB to store the
// FileSystemFileHandle keyed by project id. Gracefully degrades: browsers
// without the API fall back to a manual re-pick.

const DB_NAME = "capto-media";
const STORE = "handles";

type FileHandle = FileSystemFileHandle;

export function fsAccessSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveHandle(projectId: string, handle: FileHandle): Promise<void> {
  if (!projectId) return;
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handle, projectId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getHandle(projectId: string): Promise<FileHandle | null> {
  if (!projectId) return null;
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(projectId);
      req.onsuccess = () => resolve((req.result as FileHandle) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Open a video via the File System Access API so we get a persistable handle. */
export async function pickVideoFile(): Promise<{ file: File; handle: FileHandle } | null> {
  if (!fsAccessSupported()) return null;
  try {
    const [handle] = await (
      window as unknown as {
        showOpenFilePicker: (o: unknown) => Promise<FileHandle[]>;
      }
    ).showOpenFilePicker({
      multiple: false,
      types: [{ description: "Video", accept: { "video/*": [".mp4", ".mov", ".webm", ".m4v"] } }],
    });
    const file = await handle.getFile();
    return { file, handle };
  } catch {
    // user cancelled, or API unavailable
    return null;
  }
}

type PermState = "granted" | "denied" | "prompt";

async function permission(handle: FileHandle, request: boolean): Promise<PermState> {
  const h = handle as unknown as {
    queryPermission?: (o: { mode: string }) => Promise<PermState>;
    requestPermission?: (o: { mode: string }) => Promise<PermState>;
  };
  try {
    if (request && h.requestPermission) return await h.requestPermission({ mode: "read" });
    if (h.queryPermission) return await h.queryPermission({ mode: "read" });
  } catch {
    /* ignore */
  }
  return "prompt";
}

/**
 * Try to silently re-read a saved project's file. Returns the File if permission
 * is already granted (no prompt needed). When `interactive` is true (a click),
 * it may prompt the user to re-grant access.
 */
export async function tryRelink(
  projectId: string,
  interactive: boolean,
): Promise<File | null> {
  const handle = await getHandle(projectId);
  if (!handle) return null;
  let state = await permission(handle, false);
  if (state !== "granted" && interactive) state = await permission(handle, true);
  if (state !== "granted") return null;
  try {
    return await handle.getFile();
  } catch {
    // file moved/deleted/renamed → caller falls back to manual re-upload
    return null;
  }
}
