import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { prompt, code } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "課題文が指定されていません" }, { status: 400 });
    }
    if (code === undefined || code === null) {
      return NextResponse.json({ error: "検証するコードがありません" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "サーバー側でAPIキーが設定されていません。管理者に連絡するか、.env.localファイルを確認してください。" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
${code}
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

    let result;
    try {
        result = JSON.parse(cleanedText);
    } catch (e: any) {
        console.error("JSON Parse Error:", e.message);
        console.error("Raw Text:", text);
        return NextResponse.json({ error: "AIの回答を解析できませんでした。" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in AI review:", error);
    const errorMessage = error.message || "AIの呼び出し中にエラーが発生しました";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
