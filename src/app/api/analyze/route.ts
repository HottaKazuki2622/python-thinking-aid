import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "課題文が入力されていません" }, { status: 400 });
    }

    // 環境変数が設定されていない場合のエラーハンドリング
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "サーバー側でAPIキーが設定されていません。管理者に連絡するか、.env.localファイルを確認してください。" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // Markdownのバッククォートが含まれている場合を除去する
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();

    let result;
    try {
        result = JSON.parse(cleanedText);
    } catch (e: any) {
        console.error("JSON Parse Error:", e.message);
        console.error("Raw Text:", text);
        return NextResponse.json({ error: `AIの回答を解析できませんでした。生のレスポンス: ${text.substring(0, 50)}...` }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in AI analysis:", error);
    const errorMessage = error.message || "AIの呼び出し中にエラーが発生しました";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
