"use client";

import { useState } from "react";
import { Send, Loader2, Target, Type, GitBranch, ListOrdered, Lightbulb, AlertCircle } from "lucide-react";

type AnalysisResult = {
  purpose: string;
  inputs: string;
  branches: string;
  steps: string;
  hints: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        let errorMsg = "解析に失敗しました。後でもう一度お試しください。";
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "予期せぬエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto flex flex-col gap-8">
      <header className="text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-primary">
          思考補助AI for Python
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          プログラミングの課題を入力してください。
          <br />答えのコードではなく、「何を考えるべきか」を一緒に整理します。
        </p>
      </header>

      <section className="bg-surface p-6 rounded-2xl shadow-lg border border-surface-border">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="prompt" className="font-semibold text-gray-200">
            Pythonの課題文
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例：1から10までの数字のうち、偶数だけを出力するプログラムを作りたい"
            className="w-full min-h-[120px] p-4 bg-gray-900/50 border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y text-gray-100 placeholder-gray-500 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="self-end px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>考え中...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>相談する</span>
              </>
            )}
          </button>
        </form>
      </section>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-12">
          <h2 className="text-2xl font-bold text-center mb-8 border-b border-surface-border pb-4">
            🤔 思考のヒント
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResultCard
              icon={<Target className="w-6 h-6 text-blue-400" />}
              title="問題の目的"
              content={result.purpose}
              className="md:col-span-2"
            />
            <ResultCard
              icon={<Type className="w-6 h-6 text-green-400" />}
              title="入力値（必要なデータ）"
              content={result.inputs}
            />
            <ResultCard
              icon={<GitBranch className="w-6 h-6 text-purple-400" />}
              title="条件分岐"
              content={result.branches}
            />
            <ResultCard
              icon={<ListOrdered className="w-6 h-6 text-orange-400" />}
              title="考える手順"
              content={result.steps}
              className="md:col-span-2"
            />
            <ResultCard
              icon={<Lightbulb className="w-6 h-6 text-yellow-400" />}
              title="ヒント"
              content={result.hints}
              className="md:col-span-2 border-yellow-900/50 bg-yellow-900/10"
            />
          </div>
        </section>
      )}
    </main>
  );
}

function ResultCard({ icon, title, content, className = "" }: { icon: React.ReactNode, title: string, content: string, className?: string }) {
  if (!content) return null;
  return (
    <div className={`bg-surface border border-surface-border p-5 rounded-2xl shadow-sm ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="font-bold text-lg text-gray-100">{title}</h3>
      </div>
      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
        {content}
      </div>
    </div>
  );
}
