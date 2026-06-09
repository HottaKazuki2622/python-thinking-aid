"use client";

import { useState, useEffect } from "react";
import {
  Send, Loader2, Terminal, RefreshCw, Sparkles,
  ChevronDown, ChevronUp, Plus, Trash2, Play,
  CheckCircle2, XCircle, AlertCircle, Lock,
  Wifi, WifiOff,
} from "lucide-react";
import { generateTestCases } from "@/lib/testCaseGen";
import type { TestCase } from "@/lib/testCaseGen";
import { generateHints } from "@/lib/hints";
import type { HintSet } from "@/lib/hints";
import { initPyodide, subscribePyodide, runPython } from "@/lib/pyodideRunner";

// ─── Types ────────────────────────────────────────────────────────────────────

type TestResult = {
  id: string;
  status: "pass" | "fail" | "error" | "no_expected";
  actual: string;
  error?: string;
};

type PyStatus = "idle" | "loading" | "ready" | "error";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [problem, setProblem] = useState("");
  const [started, setStarted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [hints, setHints] = useState<HintSet | null>(null);

  const [code, setCode] = useState("# ここにコードを書いてみましょう\n\n");
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  const [pyStatus, setPyStatus] = useState<PyStatus>("idle");
  const [pyMsg, setPyMsg] = useState("");

  // Hint unlock: level 1 always available, 2 unlocked after 1 opened, 3 after 2
  const [openHint, setOpenHint] = useState<1 | 2 | 3 | null>(null);
  const [maxUnlocked, setMaxUnlocked] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    return subscribePyodide((s, m) => {
      setPyStatus(s as PyStatus);
      setPyMsg(m);
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) return;
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 150));

    setTestCases(generateTestCases(problem));
    setHints(generateHints(problem));
    setCode("# ここにコードを書いてみましょう\n\n");
    setTestResults(null);
    setOpenHint(null);
    setMaxUnlocked(0);
    setStarted(true);
    setAnalyzing(false);

    initPyodide().catch(() => {});
  };

  const handleReset = () => {
    setStarted(false);
    setProblem("");
    setTestResults(null);
  };

  const handleRunTests = async () => {
    if (!code.trim() || running || pyStatus !== "ready") return;
    setRunning(true);
    setTestResults(null);

    const results: TestResult[] = [];
    for (const tc of testCases) {
      const res = await runPython(code, tc.input);
      const actual = res.stdout.replace(/\r\n/g, "\n").trim();
      const expected = tc.expected.replace(/\r\n/g, "\n").trim();

      let status: TestResult["status"];
      if (res.error) {
        status = "error";
      } else if (!expected) {
        status = "no_expected";
      } else {
        status = actual === expected ? "pass" : "fail";
      }
      results.push({ id: tc.id, status, actual, error: res.error });
    }

    setTestResults(results);
    setRunning(false);
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string) => {
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)));
    setTestResults(null); // clear stale results when test cases change
  };

  const deleteTestCase = (id: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    setTestResults(null);
  };

  const addTestCase = () => {
    const id = `tc_m_${Date.now()}`;
    setTestCases((prev) => [
      ...prev,
      { id, label: `テスト${prev.length + 1}`, input: "", expected: "" },
    ]);
  };

  const handleHintClick = (level: 1 | 2 | 3) => {
    if (level === 2 && maxUnlocked < 1) return;
    if (level === 3 && maxUnlocked < 2) return;
    setOpenHint((prev) => (prev === level ? null : level));
    if (level > maxUnlocked) setMaxUnlocked(level as 0 | 1 | 2 | 3);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const passCount = testResults?.filter((r) => r.status === "pass").length ?? 0;
  const judgedCount = testResults?.filter((r) => r.status !== "no_expected").length ?? 0;
  const allPass = judgedCount > 0 && passCount === judgedCount;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <header className="text-center space-y-3 py-4 border-b border-surface-border/50">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          v3 — テストケース型採点
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          思考補助AI for Python
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
          課題を入力 → テストケースで実際に採点 → 段階的ヒントで自力解決
        </p>
      </header>

      {/* Problem input form */}
      {!started && (
        <section className="bg-surface p-6 rounded-2xl shadow-lg border border-surface-border max-w-3xl mx-auto w-full">
          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              <label htmlFor="problem" className="font-semibold text-gray-200">
                Pythonの課題文を入力
              </label>
            </div>
            <textarea
              id="problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder={"例：1から10までの偶数をすべて出力するプログラムを作りなさい\n\n例：2つの整数を入力し、その合計を出力するプログラムを作りなさい"}
              className="w-full min-h-[140px] p-4 bg-gray-900/50 border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y text-gray-100 placeholder-gray-500 transition-all"
              disabled={analyzing}
            />
            <button
              type="submit"
              disabled={!problem.trim() || analyzing}
              className="self-end px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              {analyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>準備中...</span></>
              ) : (
                <><Send className="w-5 h-5" /><span>思考を開始する</span></>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Main area (after start) */}
      {started && hints && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">

          {/* ── Left column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-4">

            {/* Problem card */}
            <div className="bg-surface/80 backdrop-blur-md p-4 rounded-xl border border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">取り組む課題</h3>
                <button
                  onClick={handleReset}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />別の課題に変更
                </button>
              </div>
              <p className="text-sm text-gray-200 bg-gray-950/40 p-3 rounded-lg border border-surface-border/40 whitespace-pre-wrap leading-relaxed">
                {problem}
              </p>
            </div>

            {/* Test cases panel */}
            <div className="bg-surface/80 backdrop-blur-md rounded-xl border border-surface-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border/60">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  テストケース
                </h3>
                <button
                  onClick={addTestCase}
                  className="flex items-center gap-1 text-xs text-primary hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" />追加
                </button>
              </div>

              <div className="flex flex-col gap-3 p-4">
                {testCases.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    テストケースがありません。「追加」から作成してください。
                  </p>
                )}
                {testCases.map((tc, idx) => {
                  const result = testResults?.find((r) => r.id === tc.id);
                  return (
                    <TestCaseCard
                      key={tc.id}
                      index={idx}
                      testCase={tc}
                      result={result}
                      onChange={(field, value) => updateTestCase(tc.id, field, value)}
                      onDelete={() => deleteTestCase(tc.id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* 3-level hints */}
            <div className="bg-surface/80 backdrop-blur-md rounded-xl border border-surface-border overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border/60">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  段階的ヒント
                  <span className="text-xs text-gray-500 font-normal">（順番に開いてください）</span>
                </h3>
              </div>
              <div className="flex flex-col divide-y divide-surface-border/40">
                <HintCard
                  level={1}
                  title="ヒント1：考える方向性"
                  content={hints.hint1}
                  isOpen={openHint === 1}
                  isLocked={false}
                  onClick={() => handleHintClick(1)}
                />
                <HintCard
                  level={2}
                  title="ヒント2：使うべき文法・関数"
                  content={hints.hint2}
                  isOpen={openHint === 2}
                  isLocked={maxUnlocked < 1}
                  onClick={() => handleHintClick(2)}
                />
                <HintCard
                  level={3}
                  title="ヒント3：ほぼ解法"
                  content={hints.hint3}
                  isOpen={openHint === 3}
                  isLocked={maxUnlocked < 2}
                  onClick={() => handleHintClick(3)}
                />
              </div>
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-7 flex flex-col gap-4">

            {/* Code editor */}
            <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-gray-900/40">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Terminal className="w-3.5 h-3.5" />
                  Python エディタ
                </div>
                <span className="text-[10px] text-gray-500 font-mono bg-gray-950 px-2 py-0.5 rounded border border-surface-border">
                  python3
                </span>
              </div>

              {/* Editor body */}
              <div className="relative bg-gray-950 flex font-mono text-sm" style={{ minHeight: "280px" }}>
                <div className="bg-gray-900/50 text-gray-600 px-3 py-4 text-right select-none border-r border-surface-border/40 text-xs flex flex-col min-w-[2.5rem]">
                  {Array.from({ length: Math.max(14, code.split("\n").length) }).map((_, i) => (
                    <div key={i} className="leading-[1.625rem]">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="# ここにPythonコードを入力してください"
                  className="flex-1 p-4 bg-transparent outline-none resize-none text-gray-200 placeholder-gray-600 font-mono text-sm leading-[1.625rem]"
                  spellCheck={false}
                  style={{ minHeight: "280px" }}
                />
              </div>

              {/* Run bar */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-surface-border/60 bg-gray-900/20">
                <PyodideStatusBadge status={pyStatus} msg={pyMsg} />
                <button
                  onClick={handleRunTests}
                  disabled={running || pyStatus !== "ready" || testCases.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:bg-green-950/50 disabled:text-green-900 text-white font-semibold rounded-xl text-sm transition-all shadow hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed"
                >
                  {running ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />実行中...</>
                  ) : (
                    <><Play className="w-4 h-4" />テストを実行</>
                  )}
                </button>
              </div>
            </div>

            {/* Test results */}
            {testResults && (
              <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border/60 bg-gray-900/40">
                  <h3 className="text-sm font-semibold text-gray-200">テスト結果</h3>
                  {judgedCount > 0 && (
                    <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                      allPass
                        ? "bg-green-900/40 text-green-300 border-green-700/50"
                        : "bg-red-900/30 text-red-300 border-red-700/40"
                    }`}>
                      {passCount} / {judgedCount} PASS
                    </span>
                  )}
                </div>
                <div className="flex flex-col divide-y divide-surface-border/30">
                  {testResults.map((result) => {
                    const tc = testCases.find((t) => t.id === result.id);
                    if (!tc) return null;
                    return <ResultRow key={result.id} testCase={tc} result={result} />;
                  })}
                </div>
                {allPass && (
                  <div className="px-5 py-4 bg-green-950/20 border-t border-green-800/40 text-green-200 text-sm">
                    🎉 すべてのテストに合格しました！実際にPythonで動かして確認してみましょう。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Pyodide status indicator
function PyodideStatusBadge({ status, msg }: { status: PyStatus; msg: string }) {
  if (status === "idle") return null;
  if (status === "ready") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-400">
        <Wifi className="w-3.5 h-3.5" />
        <span>Python実行環境 準備完了</span>
      </div>
    );
  }
  if (status === "loading") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-yellow-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{msg || "Pythonランタイムを準備中..."}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-400" title={msg}>
      <WifiOff className="w-3.5 h-3.5" />
      <span>ランタイムエラー（ネット接続を確認）</span>
    </div>
  );
}

// Single test case editor card
interface TestCaseCardProps {
  index: number;
  testCase: TestCase;
  result?: TestResult;
  onChange: (field: keyof TestCase, value: string) => void;
  onDelete: () => void;
}

function TestCaseCard({ index, testCase, result, onChange, onDelete }: TestCaseCardProps) {
  const statusIcon = result
    ? result.status === "pass"
      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
      : result.status === "fail"
      ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      : result.status === "error"
      ? <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
      : null
    : null;

  return (
    <div className={`rounded-lg border overflow-hidden ${
      result?.status === "pass"
        ? "border-green-800/60"
        : result?.status === "fail"
        ? "border-red-800/60"
        : result?.status === "error"
        ? "border-orange-800/60"
        : "border-surface-border/60"
    }`}>
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/40 border-b border-surface-border/40">
        {statusIcon}
        <input
          type="text"
          value={testCase.label}
          onChange={(e) => onChange("label", e.target.value)}
          className="flex-1 bg-transparent text-xs font-semibold text-gray-300 outline-none placeholder-gray-600"
          placeholder={`テスト${index + 1}`}
        />
        <button
          onClick={onDelete}
          className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Input / Expected fields */}
      <div className="grid grid-cols-2 divide-x divide-surface-border/40">
        <div className="p-2">
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">入力 (stdin)</div>
          <textarea
            value={testCase.input}
            onChange={(e) => onChange("input", e.target.value)}
            className="w-full text-xs bg-gray-950/60 text-gray-300 rounded p-1.5 outline-none resize-none font-mono border border-surface-border/30 focus:border-primary/50 placeholder-gray-700"
            rows={3}
            placeholder="（なし）"
          />
        </div>
        <div className="p-2">
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">期待する出力</div>
          <textarea
            value={testCase.expected}
            onChange={(e) => onChange("expected", e.target.value)}
            className="w-full text-xs bg-gray-950/60 text-gray-300 rounded p-1.5 outline-none resize-none font-mono border border-surface-border/30 focus:border-primary/50 placeholder-gray-700"
            rows={3}
            placeholder="（未設定）"
          />
        </div>
      </div>
    </div>
  );
}

// Result row in the results panel
interface ResultRowProps {
  testCase: TestCase;
  result: TestResult;
}

function ResultRow({ testCase, result }: ResultRowProps) {
  const [expanded, setExpanded] = useState(result.status !== "pass");

  const bgClass =
    result.status === "pass"
      ? "bg-green-950/10"
      : result.status === "fail"
      ? "bg-red-950/10"
      : result.status === "error"
      ? "bg-orange-950/10"
      : "bg-gray-900/10";

  const badge =
    result.status === "pass" ? (
      <span className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-800/50 px-2 py-0.5 rounded-full">PASS</span>
    ) : result.status === "fail" ? (
      <span className="text-xs font-bold text-red-400 bg-red-900/30 border border-red-800/50 px-2 py-0.5 rounded-full">FAIL</span>
    ) : result.status === "error" ? (
      <span className="text-xs font-bold text-orange-400 bg-orange-900/30 border border-orange-800/50 px-2 py-0.5 rounded-full">ERROR</span>
    ) : (
      <span className="text-xs font-bold text-gray-400 bg-gray-900/40 border border-gray-700/50 px-2 py-0.5 rounded-full">出力確認</span>
    );

  return (
    <div className={`${bgClass}`}>
      {/* Row header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        {result.status === "pass" ? (
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
        ) : result.status === "fail" ? (
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        ) : result.status === "error" ? (
          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-200 flex-1">{testCase.label}</span>
        {badge}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {testCase.input && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">入力</div>
              <pre className="text-xs font-mono bg-gray-950/60 rounded p-2 text-gray-300 whitespace-pre-wrap border border-surface-border/30">
                {testCase.input}
              </pre>
            </div>
          )}
          {testCase.expected && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">期待する出力</div>
              <pre className="text-xs font-mono bg-gray-950/60 rounded p-2 text-gray-300 whitespace-pre-wrap border border-surface-border/30">
                {testCase.expected}
              </pre>
            </div>
          )}
          <div>
            <div className={`text-[10px] font-semibold uppercase mb-1 ${
              result.status === "error" ? "text-orange-500" : "text-gray-500"
            }`}>
              {result.status === "error" ? "エラー" : "実際の出力"}
            </div>
            <pre className={`text-xs font-mono rounded p-2 whitespace-pre-wrap border ${
              result.status === "pass"
                ? "bg-green-950/20 text-green-200 border-green-800/40"
                : result.status === "fail"
                ? "bg-red-950/20 text-red-200 border-red-800/40"
                : result.status === "error"
                ? "bg-orange-950/20 text-orange-200 border-orange-800/40"
                : "bg-gray-950/60 text-gray-300 border-surface-border/30"
            }`}>
              {result.error ?? (result.actual || "（出力なし）")}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Progressive hint card
interface HintCardProps {
  level: 1 | 2 | 3;
  title: string;
  content: string;
  isOpen: boolean;
  isLocked: boolean;
  onClick: () => void;
}

function HintCard({ level, title, content, isOpen, isLocked, onClick }: HintCardProps) {
  const levelColors = {
    1: "text-blue-400 bg-blue-900/20 border-blue-800/40",
    2: "text-purple-400 bg-purple-900/20 border-purple-800/40",
    3: "text-orange-400 bg-orange-900/20 border-orange-800/40",
  };

  return (
    <div>
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
          isLocked
            ? "cursor-not-allowed opacity-40"
            : "hover:bg-surface/60 cursor-pointer"
        }`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
          isLocked ? "bg-gray-900 border-gray-700 text-gray-600" : levelColors[level]
        }`}>
          {isLocked ? <Lock className="w-3 h-3" /> : level}
        </div>
        <span className={`text-sm font-semibold flex-1 ${isLocked ? "text-gray-600" : "text-gray-200"}`}>
          {title}
        </span>
        {!isLocked && (
          isOpen
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isOpen && !isLocked && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="pl-9">
            <HintContent text={content} />
          </div>
        </div>
      )}
    </div>
  );
}

// Render hint content with inline code and code blocks
function HintContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="mt-2 mb-2 text-xs font-mono bg-gray-950/70 border border-surface-border/40 rounded-lg p-3 text-gray-200 whitespace-pre overflow-x-auto">
          {codeLines.join("\n")}
        </pre>
      );
    } else {
      elements.push(
        <p key={i} className={`text-sm text-gray-300 leading-relaxed ${line === "" ? "h-2" : "mb-1"}`}>
          {renderInlineCode(line)}
        </p>
      );
    }
    i++;
  }

  return <div>{elements}</div>;
}

function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="text-xs font-mono bg-gray-800 text-yellow-300 px-1.5 py-0.5 rounded">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  );
}
