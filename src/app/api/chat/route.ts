import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { prompt, history, message } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "課題文が指定されていません" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "メッセージがありません" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "サーバー側でAPIキーが設定されていません。管理者に連絡するか、.env.localファイルを確認してください。" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    if (history && Array.isArray(history)) {
      history.forEach((item: any) => {
        contents.push({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.message }]
        });
      });
    }

    // 最新のメッセージを追加
    contents.push({
      role: "user",
      parts: [{ text: message }]
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

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error in AI chat:", error);
    const errorMessage = error.message || "AIの呼び出し中にエラーが発生しました";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
