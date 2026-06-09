// Pyodide: run Python in the browser via WebAssembly

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loadPyodide?: (cfg: { indexURL: string }) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _pyodide?: any;
  }
}

type PyStatus = "idle" | "loading" | "ready" | "error";

let _status: PyStatus = "idle";
let _msg = "";
type StatusCb = (status: PyStatus, msg: string) => void;
const _cbs = new Set<StatusCb>();

function emit(s: PyStatus, m: string) {
  _status = s;
  _msg = m;
  _cbs.forEach((cb) => cb(s, m));
}

/** Subscribe to Pyodide loading status. Returns unsubscribe function. */
export function subscribePyodide(cb: StatusCb): () => void {
  _cbs.add(cb);
  cb(_status, _msg); // emit current state immediately
  return () => _cbs.delete(cb);
}

/** Start loading Pyodide (idempotent). */
export async function initPyodide(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_status === "ready") return;
  if (_status === "loading") {
    await new Promise<void>((res, rej) => {
      const unsub = subscribePyodide((s) => {
        if (s === "ready") { unsub(); res(); }
        if (s === "error") { unsub(); rej(new Error(_msg)); }
      });
    });
    return;
  }

  emit("loading", "Pythonランタイムを読み込み中...");

  try {
    if (!window.loadPyodide) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js";
        s.onload = () => res();
        s.onerror = () => rej(new Error("Pyodideスクリプトの読み込みに失敗しました（ネット接続を確認してください）"));
        document.head.appendChild(s);
      });
    }

    emit("loading", "初期化中...");
    window._pyodide = await window.loadPyodide!({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/",
    });

    emit("ready", "");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    emit("error", msg);
    throw e;
  }
}

export type RunResult = {
  stdout: string;
  stderr: string;
  error?: string; // Python exception message (last line only)
};

const TIMEOUT_MS = 8000;

/** Execute Python code with optional stdin. Resolves with stdout/stderr/error. */
export async function runPython(code: string, stdinInput = ""): Promise<RunResult> {
  const py = typeof window !== "undefined" ? window._pyodide : undefined;
  if (!py) throw new Error("Pyodideが初期化されていません");

  let stdout = "";
  let stderr = "";

  py.setStdout({ batched: (line: string) => { stdout += line + "\n"; } });
  py.setStderr({ batched: (line: string) => { stderr += line + "\n"; } });

  // Inject stdin via sys.stdin override
  const stdinStr = stdinInput.trimEnd() ? stdinInput.trimEnd() + "\n" : "";
  const wrapped = `import sys as __sys, io as __io\n__sys.stdin = __io.StringIO(${JSON.stringify(stdinStr)})\n${code}`;

  const runPromise: Promise<RunResult> = py
    .runPythonAsync(wrapped)
    .then(() => ({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd() }))
    .catch((e: unknown) => {
      const raw = e instanceof Error ? e.message : String(e);
      // Extract last meaningful line from Python traceback
      const lines = raw.split("\n").filter((l: string) => l.trim());
      const last = lines[lines.length - 1] ?? raw;
      return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), error: last };
    });

  const timeoutPromise: Promise<RunResult> = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("実行タイムアウト（8秒）。無限ループの可能性があります")), TIMEOUT_MS)
  );

  return Promise.race([runPromise, timeoutPromise]).catch((e: unknown) => ({
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    error: e instanceof Error ? e.message : String(e),
  }));
}
