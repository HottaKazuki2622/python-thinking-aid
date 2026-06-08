"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, Loader2, Target, Type, GitBranch, ListOrdered, Lightbulb, 
  AlertCircle, Code, MessageSquare, CheckCircle2, HelpCircle, 
  ArrowRight, ChevronRight, Terminal, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  Settings, X
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";

type AnalysisResult = {
  purpose: string;
  inputs: string;
  branches: string;
  steps: string;
  hints: string;
};

type ReviewResult = {
  status: "correct" | "needs_improvement" | "error";
  review: string;
};

type ChatMessage = {
  role: "user" | "model";
  message: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  // APIキー関連のステート
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  // 初期ロード時にLocalStorageや環境変数からAPIキーを取得
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key") || "";
    const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    const activeKey = savedKey || envKey;
    setApiKey(activeKey);
    setTempApiKey(activeKey);
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem("gemini_api_key", key);
    setApiKey(key);
    setShowSettings(false);
  };

  const getAiClient = () => {
    if (!apiKey) {
      throw new Error("Gemini APIキーが設定されていません。画面右上の設定（ギアアイコン）からAPIキーを入力してください。");
    }
    return new GoogleGenAI({ apiKey });
  };

  // 新機能関連のステート
  const [activeTab, setActiveTab] = useState<"editor" | "chat">("editor");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [userCode, setUserCode] = useState<string>("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewError, setReviewError] = useState("");

  // チャット関連のステート
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // チャットの自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setReviewResult(null);
    setChatHistory([]);
    setCurrentStep(1);

    try {
      const ai = getAiClient();
      const systemInstruction = `あなたはPython初学者のための「思考補助AI」です。
ユーザーからPythonの課題文が与えられます。
以下の制約を厳守して回答してください。

【絶対の制約】
1. 完成したPythonコード（答え）は絶対に提示しないこと。
2. 初学者がつまずかないよう、優しく励ますようなトーンで丁寧に説明すること。
3. 指定された5つの項目ごとに整理して思考プロセスを出力すること。
4. 必ずJSON形式で出力し、指定されたキーのみを含むこと。

【出力JSONのキーと内容】
- "purpose": 問題の目的（何を解決・実現するためのプログラムか）
- "inputs": 入力値（プログラムに必要なデータ、変数、ユーザーからの入力は何か）
- "branches": 条件分岐（if文など、どのような場合分けが必要か。不要な場合は「特になし」とする）
- "steps": 考える手順（コードを書くためのロジックの順番を分かりやすく箇条書きで）
- "hints": ヒント（使うと便利な組み込み関数や概念、よくある間違いの注意点など）
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("AIから空の応答が返されました");
      }

      const cleanedText = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanedText);
      setResult(data);
      // 初期のコードエディタに初期テンプレートを配置
      setUserCode("# ここにコードを書いてみましょう\n\n");
    } catch (err: any) {
      setError(err.message || "予期せぬエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // コードレビューのリクエスト
  const handleReview = async () => {
    if (!userCode.trim() || reviewLoading) return;

    setReviewLoading(true);
    setReviewError("");
    setReviewResult(null);

    try {
      const ai = getAiClient();
      const systemInstruction = `あなたはPython初学者のための「思考補助AI」です。
ユーザーから「Pythonの課題文」と「ユーザーが書いたPythonコード」が与えられます。
コードを検証し、以下の制約を厳守してレビュー結果をJSON形式で返してください。

【絶対の制約】
1. 正しい完成コード（答え）は絶対に提示しないこと。
2. エラーがある場合や要件を満たしていない場合も、直接答えを教えるのではなく、何が間違っているか、どう修正すべきかの「気づきを与えるヒントや問いかけ」を行ってください。
3. 初学者を優しく励ますトーンで丁寧に説明すること。
4. 必ずJSON形式で出力し、指定されたキーのみを含むこと。

【出力JSONのキーと内容】
- "status": 判定結果。以下のいずれかを選択。
  - "correct": コードが完全に課題の要件を満たしており、エラーもない。
  - "needs_improvement": 課題の要件は一部満たしている、または動作はするが、論理的な誤りや改善の余地がある。
  - "error": 構文エラー（SyntaxError）がある、または実行時に致命的なエラーが起きる書き方になっている。
- "review": ユーザーへのフィードバック内容。現状の評価、良かった点、改善すべき部分への気づきを促すヒント、次のステップへの問いかけを含めてください（マークダウン形式が使用できますが、完成コードは記述しないでください）。
`;

      const userPrompt = `【課題文】
${prompt}

【ユーザーのコード】
\`\`\`python
${userCode}
\`\`\`
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("AIから空の応答が返されました");
      }

      const cleanedText = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanedText);
      setReviewResult(data);
    } catch (err: any) {
      setReviewError(err.message || "レビュー中にエラーが発生しました");
    } finally {
      setReviewLoading(false);
    }
  };

  // AIとチャットのやり取り
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatError("");
    setChatHistory((prev) => [...prev, { role: "user", message: userMsg }]);
    setChatLoading(true);

    try {
      const ai = getAiClient();
      const systemInstruction = `あなたはPython初学者のための「思考補助AI」です。
ユーザーは提示された「Pythonの課題文」についてあなたと対話しています。

【絶対の制約】
1. 正しい完成コード（答え）は絶対に提示しないこと。
2. 部分的なコード例（基本的な文法や関数の使い方）を提示することは構いませんが、課題の解答そのものになってはいけません。
3. ユーザーの質問に対して、直接答えを教えるのではなく、ヒントを与えたり、「〇〇という関数について調べてみてください」「ここではどのような分岐が必要でしょうか？」のように、ユーザー自身が考えるように誘導する問いかけを行ってください。
4. 初学者に寄り添い、優しく丁寧、かつ前向きに励ますトーンで対話してください。
`;

      // チャット履歴をGeminiの形式にマッピング
      const contents = [
        {
          role: "user",
          parts: [{ text: `【課題文】\n${prompt}\n\nこの課題について一緒に考えていきます。サポートをお願いします。` }]
        },
        {
          role: "model",
          parts: [{ text: "わかりました！答えのコードを直接教えるのではなく、ヒントを出しながら一緒に考えていきましょう。何から始めますか？" }]
        }
      ];

      if (chatHistory && Array.isArray(chatHistory)) {
        chatHistory.forEach((item: any) => {
          contents.push({
            role: item.role === "user" ? "user" : "model",
            parts: [{ text: item.message }]
          });
        });
      }

      // 最新のメッセージを追加
      contents.push({
        role: "user",
        parts: [{ text: userMsg }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const reply = response.text;
      if (!reply) {
        throw new Error("AIから空の応答が返されました");
      }

      setChatHistory((prev) => [...prev, { role: "model", message: reply }]);
    } catch (err: any) {
      setChatError(err.message || "通信エラーが発生しました");
    } finally {
      setChatLoading(false);
    }
  };

  // 簡易マークダウンパーサー
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("```")) {
        return null;
      }
      // 太字 **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-yellow-400 font-bold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      return (
        <p key={i} className="min-h-[1.25rem] mb-1">
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* ヘッダー */}
      <header className="relative text-center space-y-3 py-4 border-b border-surface-border/50">
        <div className="absolute right-0 top-0">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-surface-border/40 rounded-full transition-all text-gray-400 hover:text-gray-200 cursor-pointer"
            title="APIキー設定"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          Prototype v2
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          思考補助AI for Python
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
          プログラミングの課題を入力してください。
          答えのコードではなく、自力で解くための「思考の手順」を段階的にガイドし、書いたコードのフィードバックを行います。
        </p>
      </header>

      {/* APIキー未設定時の警告 */}
      {!apiKey && (
        <div className="bg-yellow-950/20 border border-yellow-900/50 text-yellow-300 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm">
              Gemini APIキーが設定されていません。アプリを使用するにはAPIキーの設定が必要です。
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-gray-950 text-xs font-bold rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          >
            APIキーを設定する
          </button>
        </div>
      )}

      {/* 課題入力フォーム */}
      {!result && (
        <section className="bg-surface p-6 rounded-2xl shadow-lg border border-surface-border max-w-3xl mx-auto w-full transition-all duration-300">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="w-5 h-5 text-primary" />
              <label htmlFor="prompt" className="font-semibold text-gray-200">
                Pythonの課題文を入力
              </label>
            </div>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例：1から10までの数字のうち、偶数だけを出力するプログラムを作りたい"
              className="w-full min-h-[140px] p-4 bg-gray-900/50 border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-y text-gray-100 placeholder-gray-500 transition-all font-sans"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="self-end px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>思考を整理中...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>思考を開始する</span>
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-xl flex items-center gap-3 max-w-3xl mx-auto w-full">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* メインエリア：解析後の2カラムレイアウト */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500 ease-out">
          
          {/* 左カラム：思考のステップ（段階的UI） */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex justify-between items-center bg-surface/50 border border-surface-border p-4 rounded-xl">
              <span className="text-xs text-gray-400 font-medium">課題</span>
              <button 
                onClick={() => {
                  setResult(null);
                  setPrompt("");
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                別の課題に変更する
              </button>
            </div>

            <div className="bg-surface/80 backdrop-blur-md p-4 rounded-xl border border-surface-border">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">取り組む課題</h3>
              <p className="text-sm text-gray-200 bg-gray-950/40 p-3 rounded-lg border border-surface-border/40 whitespace-pre-wrap">
                {prompt}
              </p>
            </div>

            {/* 段階的なステップUI */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 px-1">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                思考を組み立てよう
              </h2>

              {/* ステップ1: 問題 of 目的 */}
              <StepCard
                stepNumber={1}
                title="問題の目的を確認する"
                icon={<Target className="w-5 h-5 text-blue-400" />}
                activeStep={currentStep}
                onSelect={() => setCurrentStep(1)}
              >
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.purpose}
                </p>
                {currentStep === 1 && (
                  <button 
                    onClick={() => setCurrentStep(2)}
                    className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors text-blue-300"
                  >
                    目的を理解した。次へ <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </StepCard>

              {/* ステップ2: 入力値と条件 */}
              <StepCard
                stepNumber={2}
                title="必要なデータと条件分岐"
                icon={
                  <div className="flex gap-0.5">
                    <Type className="w-4 h-4 text-green-400" />
                    <GitBranch className="w-4 h-4 text-purple-400" />
                  </div>
                }
                activeStep={currentStep}
                onSelect={() => setCurrentStep(2)}
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-bold text-green-400 block mb-1">■ 必要なデータ (入力値):</span>
                    <p className="text-gray-300 whitespace-pre-wrap">{result.inputs}</p>
                  </div>
                  <div className="border-t border-surface-border/50 pt-2">
                    <span className="text-xs font-bold text-purple-400 block mb-1">■ 条件分岐:</span>
                    <p className="text-gray-300 whitespace-pre-wrap">{result.branches}</p>
                  </div>
                </div>
                {currentStep === 2 && (
                  <button 
                    onClick={() => setCurrentStep(3)}
                    className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors text-purple-300"
                  >
                    データと条件を整理した。次へ <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </StepCard>

              {/* ステップ3: 考える手順 */}
              <StepCard
                stepNumber={3}
                title="コードの設計（手順）"
                icon={<ListOrdered className="w-5 h-5 text-orange-400" />}
                activeStep={currentStep}
                onSelect={() => setCurrentStep(3)}
              >
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.steps}
                </p>
                {currentStep === 3 && (
                  <button 
                    onClick={() => setCurrentStep(4)}
                    className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors text-orange-300"
                  >
                    手順を確認した。最後へ <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </StepCard>

              {/* ステップ4: ヒント・実装 */}
              <StepCard
                stepNumber={4}
                title="実装のヒント"
                icon={<Lightbulb className="w-5 h-5 text-yellow-400" />}
                activeStep={currentStep}
                onSelect={() => setCurrentStep(4)}
              >
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.hints}
                </p>
                <div className="mt-3 bg-yellow-950/20 border border-yellow-900/40 p-2.5 rounded-lg text-xs text-yellow-300/90">
                  💡 右側の「コードを書いてみる」タブを開いて、このヒントを参考にPythonプログラムを入力してみましょう！
                </div>
              </StepCard>
            </div>
          </div>

          {/* 右カラム：実践とサポート（エディタ ＆ チャット） */}
          <div className="lg:col-span-7 flex flex-col min-h-[550px] bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xl">
            
            {/* タブヘッダー */}
            <div className="flex border-b border-surface-border bg-gray-900/40">
              <button
                onClick={() => setActiveTab("editor")}
                className={`flex-1 py-4 px-6 font-semibold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
                  activeTab === "editor"
                    ? "border-primary text-primary bg-surface/30"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Code className="w-4 h-4" />
                コードを書いてみる
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-4 px-6 font-semibold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
                  activeTab === "chat"
                    ? "border-primary text-primary bg-surface/30"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                AIに質問する (答えは教えない)
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="flex-1 flex flex-col p-6 min-h-[450px]">
              
              {/* === タブ1: コードエディタと検証 === */}
              {activeTab === "editor" && (
                <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Python エディタ</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono bg-gray-950 px-2 py-0.5 rounded border border-surface-border">
                      python3
                    </span>
                  </div>

                  {/* 簡易テキストエリアエディタ */}
                  <div className="relative flex-1 min-h-[220px] bg-gray-950 rounded-xl border border-surface-border/80 overflow-hidden flex font-mono text-sm">
                    {/* 行番号デザイン */}
                    <div className="bg-gray-900/50 text-gray-600 px-3 py-4 text-right select-none border-r border-surface-border/40 text-xs flex flex-col gap-1 min-w-[2.5rem]">
                      {Array.from({ length: Math.max(10, userCode.split("\n").length) }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      value={userCode}
                      onChange={(e) => setUserCode(e.target.value)}
                      placeholder="# ここにPythonコードを入力してください&#10;# 例:&#10;# for i in range(1, 11):&#10;#     if i % 2 == 0:&#10;#         print(i)"
                      className="flex-1 p-4 bg-transparent outline-none resize-none text-gray-200 placeholder-gray-600 font-mono text-sm leading-relaxed overflow-y-auto"
                      spellCheck={false}
                    />
                  </div>

                  {/* レビューエラー */}
                  {reviewError && (
                    <div className="bg-red-950/20 border border-red-900/50 text-red-300 p-3.5 rounded-lg flex items-center gap-2.5 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <p>{reviewError}</p>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleReview}
                      disabled={reviewLoading || !userCode.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 shadow hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed"
                    >
                      {reviewLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>コードを分析中...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>コードを検証してもらう</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* レビュー結果表示 */}
                  {reviewResult && (
                    <div className={`mt-2 p-5 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                      reviewResult.status === "correct" 
                        ? "bg-green-950/15 border-green-800/60 text-green-100" 
                        : reviewResult.status === "needs_improvement"
                        ? "bg-yellow-950/15 border-yellow-800/50 text-yellow-100"
                        : "bg-red-950/15 border-red-800/60 text-red-100"
                    }`}>
                      <div className="flex items-center gap-2.5 mb-3">
                        {reviewResult.status === "correct" ? (
                          <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                            <span className="text-xs">🎉</span>
                          </div>
                        ) : reviewResult.status === "needs_improvement" ? (
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                            <span className="text-xs">🤔</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                            <span className="text-xs">❌</span>
                          </div>
                        )}
                        <h4 className="font-bold text-sm">
                          判定: {
                            reviewResult.status === "correct" ? "正しく作れています！" :
                            reviewResult.status === "needs_improvement" ? "惜しい！あと少しです" :
                            "エラーがある、または要件を満たしていません"
                          }
                        </h4>
                      </div>
                      <div className="text-sm leading-relaxed space-y-1 pl-1 text-gray-300">
                        {renderMarkdown(reviewResult.review)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === タブ2: チャット対話機能 === */}
              {activeTab === "chat" && (
                <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-200 overflow-hidden">
                  
                  {/* 対話メッセージ領域 */}
                  <div className="flex-1 bg-gray-950/40 rounded-xl border border-surface-border/50 p-4 overflow-y-auto max-h-[350px] flex flex-col gap-4">
                    {/* 初期ウェルカムメッセージ */}
                    <div className="flex gap-3 max-w-[85%] self-start">
                      <div className="w-7 h-7 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center flex-shrink-0 text-xs">
                        🤖
                      </div>
                      <div className="bg-surface border border-surface-border/60 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm text-gray-300 leading-relaxed shadow-sm">
                        お疲れ様です！課題のヒントや手順についてわからないことはありますか？
                        「この手順はどう実装する？」「このエラーはどう解決する？」など、何でも聞いてください。
                        答えのコードを直接出すことはしませんが、考え方のサポートを全力で行います！
                      </div>
                    </div>

                    {/* 対話ログのループ */}
                    {chatHistory.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 max-w-[85%] ${item.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                          item.role === "user" 
                            ? "bg-primary/20 border border-primary/40 text-primary" 
                            : "bg-indigo-900/50 border border-indigo-700/50"
                        }`}>
                          {item.role === "user" ? "👤" : "🤖"}
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          item.role === "user"
                            ? "bg-primary hover:bg-primary-hover text-white rounded-tr-none font-medium"
                            : "bg-surface border border-surface-border/60 text-gray-300 rounded-tl-none"
                        }`}>
                          {item.role === "user" ? (
                            <p className="whitespace-pre-wrap">{item.message}</p>
                          ) : (
                            renderMarkdown(item.message)
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 送信中ローダー */}
                    {chatLoading && (
                      <div className="flex gap-3 max-w-[85%] self-start">
                        <div className="w-7 h-7 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center flex-shrink-0 text-xs animate-pulse">
                          🤖
                        </div>
                        <div className="bg-surface border border-surface-border/60 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm text-gray-400 flex items-center gap-2 shadow-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>思考のプロセスを巡らせています...</span>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>

                  {/* チャットエラー */}
                  {chatError && (
                    <div className="bg-red-950/20 border border-red-900/50 text-red-300 p-3 rounded-lg flex items-center gap-2 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <p>{chatError}</p>
                    </div>
                  )}

                  {/* 送信フォーム */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="例：「手順2の偶数の判定方法をもう少しヒントください」"
                      className="flex-1 px-4 py-3 bg-gray-950 border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm text-gray-200 placeholder-gray-600 transition-all"
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-4 bg-primary hover:bg-primary-hover disabled:bg-primary/40 text-white rounded-xl transition-all flex items-center justify-center disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* APIキー設定用モーダル */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface max-w-md w-full rounded-2xl border border-surface-border p-6 shadow-2xl space-y-4 relative text-left">
            <button
              onClick={() => {
                setTempApiKey(apiKey);
                setShowSettings(false);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-200 p-1 hover:bg-surface-border/40 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              APIキー設定
            </h3>
            
            <p className="text-xs text-gray-400 leading-relaxed">
              本アプリケーションはブラウザ上で直接 Gemini API を呼び出します。
              入力されたAPIキーはブラウザのLocalStorageにのみ保存され、サーバー等に送信されることはありません。
            </p>
            
            <div className="space-y-2 text-left">
              <label htmlFor="modal-api-key" className="text-sm font-medium text-gray-300 block">
                Gemini API キー (API Key)
              </label>
              <input
                id="modal-api-key"
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-gray-950 border border-surface-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm font-mono text-gray-200"
              />
              <p className="text-[10px] text-gray-500">
                ※無料のAPIキーは <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a> から取得できます。
              </p>
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setTempApiKey(apiKey);
                  setShowSettings(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleSaveApiKey(tempApiKey)}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// 段階的ステップ用カードコンポーネント
interface StepCardProps {
  stepNumber: number;
  title: string;
  icon: React.ReactNode;
  activeStep: number;
  onSelect: () => void;
  children: React.ReactNode;
}

function StepCard({ stepNumber, title, icon, activeStep, onSelect, children }: StepCardProps) {
  const isOpen = activeStep >= stepNumber;
  const isCurrent = activeStep === stepNumber;

  return (
    <div 
      className={`transition-all duration-300 rounded-xl overflow-hidden border ${
        isCurrent 
          ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
          : isOpen 
          ? "border-surface-border bg-surface/40" 
          : "border-surface-border/30 bg-surface/10 opacity-50"
      }`}
    >
      {/* カードヘッダー */}
      <button
        onClick={() => {
          if (activeStep >= stepNumber) {
            onSelect();
          }
        }}
        disabled={activeStep < stepNumber}
        className={`w-full text-left p-4 flex items-center justify-between transition-all ${
          activeStep >= stepNumber ? "cursor-pointer hover:bg-surface/50" : "cursor-not-allowed"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            isCurrent
              ? "bg-primary text-white"
              : isOpen
              ? "bg-surface-border text-gray-300 border border-surface-border"
              : "bg-transparent text-gray-600 border border-surface-border/20"
          }`}>
            {stepNumber}
          </div>
          <div className="flex items-center gap-2">
            {icon}
            <span className={`font-semibold text-sm md:text-base ${
              isCurrent ? "text-primary" : isOpen ? "text-gray-200" : "text-gray-500"
            }`}>
              {title}
            </span>
          </div>
        </div>
        {isOpen && (
          <div className="text-gray-400">
            {isCurrent ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {/* カードボディ */}
      {isOpen && isCurrent && (
        <div className="px-4 pb-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="pl-11 border-l-2 border-surface-border/50 ml-4 py-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
