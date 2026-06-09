// Rule-based Python learning assistant — no API required

export type AnalysisResult = {
  purpose: string;
  inputs: string;
  branches: string;
  steps: string;
  hints: string;
};

export type ReviewResult = {
  status: "correct" | "needs_improvement" | "error";
  review: string;
};

export type ChatMessage = {
  role: "user" | "model";
  message: string;
};

interface Concepts {
  loop: boolean;
  branch: boolean;
  input: boolean;
  list: boolean;
  dict: boolean;
  func: boolean;
  calc: boolean;
  modulo: boolean;
  sum: boolean;
  avg: boolean;
  max: boolean;
  min: boolean;
  count: boolean;
}

function detect(text: string): Concepts {
  return {
    loop:   /繰り返し|ループ|for文|while文|range\b|それぞれ|すべて|各[^\s]*を|一つずつ|順番に|n回|n個/.test(text),
    branch: /条件|判定|場合|もし|if文|elif|else|偶数|奇数|以上|以下|より大きい|より小さい|正の|負の|正数|負数/.test(text),
    input:  /入力|input\b|ユーザーから|キーボード/.test(text),
    list:   /リスト|配列|list\b|append\b|複数の値|要素/.test(text),
    dict:   /辞書|dict\b|キー|key\b|value\b|対応/.test(text),
    func:   /関数|def\b|function\b|定義|呼び出し/.test(text),
    calc:   /合計|平均|最大|最小|総和|積|商|余り|計算/.test(text),
    modulo: /余り|偶数|奇数|mod\b/.test(text),
    sum:    /合計|総和|足し/.test(text),
    avg:    /平均/.test(text),
    max:    /最大|最も大きい|一番大きい/.test(text),
    min:    /最小|最も小さい|一番小さい/.test(text),
    count:  /個数|数え|カウント|count\b/.test(text),
  };
}

function extractNums(text: string): number[] {
  return (text.match(/\d+/g) || []).map(Number);
}

// ─── Problem Analysis ─────────────────────────────────────────────────────────

export function analyzeLocalProblem(problem: string): AnalysisResult {
  const c = detect(problem);
  const nums = extractNums(problem);

  // ── purpose ──────────────────────────────────────────────────────────────
  let purpose: string;
  if (c.avg) {
    purpose = "複数の数値から平均を計算し、結果を出力することが目的のプログラムです。";
  } else if (c.sum) {
    purpose = "複数の数値の合計（総和）を計算し、結果を出力することが目的のプログラムです。";
  } else if (c.max) {
    purpose = "与えられた数値の中から最大値を見つけ、出力することが目的のプログラムです。";
  } else if (c.min) {
    purpose = "与えられた数値の中から最小値を見つけ、出力することが目的のプログラムです。";
  } else if (c.count) {
    purpose = "条件を満たす要素の個数を数え、出力することが目的のプログラムです。";
  } else if (c.loop && c.branch) {
    purpose = "繰り返し処理の中で条件判定を行い、特定の条件を満たす値だけを選んで処理・出力することが目的のプログラムです。";
  } else if (c.loop) {
    purpose = "繰り返し処理を使って、複数の値を順番に処理・出力することが目的のプログラムです。";
  } else if (c.branch) {
    purpose = "入力値や変数の値を条件で判定し、状況に応じた異なる処理を行うことが目的のプログラムです。";
  } else if (c.input) {
    purpose = "ユーザーから値を入力として受け取り、それに基づいた処理と出力を行うことが目的のプログラムです。";
  } else if (c.func) {
    purpose = "処理を関数としてまとめ、再利用しやすい形で実装することが目的のプログラムです。";
  } else {
    purpose = "課題の要件に沿ったPythonプログラムを実装し、結果を正しく出力することが目的です。";
  }

  // ── inputs ────────────────────────────────────────────────────────────────
  const inputParts: string[] = [];
  if (c.input) {
    inputParts.push("・ユーザーがキーボードで入力する値 → `input()` 関数で受け取ります");
    if (c.calc || nums.length > 0) {
      inputParts.push("・計算に使う場合は `int(input())` や `float(input())` で数値に変換が必要です");
    }
  }
  if (c.loop && nums.length > 0) {
    inputParts.push(`・繰り返しの範囲となる数値（例: ${nums[0]}） → \`range()\` 関数で連番を生成します`);
  } else if (c.loop) {
    inputParts.push("・繰り返しの対象となる値またはリスト → `range()` やリストで指定します");
  }
  if (c.list) {
    inputParts.push("・リスト（複数の値をまとめて管理するデータ）");
  }
  if (c.dict) {
    inputParts.push("・辞書（キーと値のペアで管理するデータ）");
  }
  if (inputParts.length === 0) {
    inputParts.push("・プログラム内で直接定義する値（変数やリスト）");
    inputParts.push("・課題文をよく読んで、どんなデータが必要か整理しましょう");
  }
  const inputs = inputParts.join("\n");

  // ── branches ──────────────────────────────────────────────────────────────
  let branches: string;
  if (!c.branch) {
    branches = "特になし。この問題では条件分岐は必要ないようです。\n（「〜の場合は〜する」という処理がある場合は `if` 文を使います）";
  } else if (/偶数/.test(problem) && /奇数/.test(problem)) {
    branches = "・偶数か奇数かを判定する条件分岐が必要です\n  → `if 数値 % 2 == 0:` で偶数、`else:` で奇数を処理します\n  → `%` は「余り」を求める演算子です（`4 % 2 → 0`、`5 % 2 → 1`）";
  } else if (/偶数/.test(problem)) {
    branches = "・偶数かどうかを判定する条件分岐が必要です\n  → `if 数値 % 2 == 0:` で2で割り切れる（偶数）かチェックします\n  → 条件を満たさない場合は処理をスキップします";
  } else if (/奇数/.test(problem)) {
    branches = "・奇数かどうかを判定する条件分岐が必要です\n  → `if 数値 % 2 != 0:` または `if 数値 % 2 == 1:` で判定します";
  } else if (/正の|正数/.test(problem)) {
    branches = "・数値が正かどうかを判定する条件分岐が必要です\n  → `if 数値 > 0:` で正の数を判定します";
  } else if (/以上|以下|より大きい|より小さい/.test(problem)) {
    branches = "・数値の大小関係を判定する条件分岐が必要です\n  → `>=`（以上）、`<=`（以下）、`>`（より大きい）、`<`（より小さい）を使います\n  → 例: `if x >= 60:` （60以上の場合）";
  } else {
    branches = "・`if`/`elif`/`else` による条件分岐が必要です\n  → `if 条件:` → `elif 別の条件:` → `else:` の順で書きます\n  → 課題文の「〜の場合」「〜かどうか」の部分が条件になります";
  }

  // ── steps ─────────────────────────────────────────────────────────────────
  const stepsList: string[] = [];
  let step = 1;

  if (c.sum || c.avg) {
    stepsList.push(`${step++}. 合計を蓄積するための変数を初期化する（例: \`total = 0\`）`);
  }
  if (c.input) {
    stepsList.push(`${step++}. \`input()\` でユーザーから値を受け取り、変数に代入する`);
    if (c.calc) {
      stepsList.push(`${step++}. \`int()\` または \`float()\` で文字列を数値に変換する`);
    }
  }
  if (c.loop) {
    if (nums.length > 0) {
      stepsList.push(`${step++}. \`for i in range(1, ${nums[0] + 1}):\` のようなループを書く（${nums[0]}回繰り返す）`);
    } else {
      stepsList.push(`${step++}. \`for\` ループを書いて繰り返しの範囲を指定する`);
    }
  }
  if (c.branch) {
    stepsList.push(`${step++}. \`if\` 文で条件を判定し、条件を満たす場合の処理を書く`);
  }
  if (c.sum) {
    stepsList.push(`${step++}. \`total += 値\` のように合計に足し込む`);
  } else if (c.avg) {
    stepsList.push(`${step++}. ループで合計を求め、最後に \`合計 ÷ 個数\` で平均を計算する`);
  }
  stepsList.push(`${step++}. \`print()\` で結果を出力する`);

  const steps =
    stepsList.length < 2
      ? "1. 処理に必要な変数を定義する\n2. 必要な計算や操作を実行する\n3. `print()` で結果を出力する"
      : stepsList.join("\n");

  // ── hints ─────────────────────────────────────────────────────────────────
  const hintList: string[] = [];
  if (c.loop) {
    hintList.push("**range() の使い方:** `range(1, 11)` は1から10までの整数を生成します（11は含まない）。`for i in range(5):` は `i = 0, 1, 2, 3, 4` の5回繰り返しです。");
  }
  if (c.modulo) {
    hintList.push("**余り演算子 `%`:** `a % b` は a を b で割った余りを返します。`10 % 3 → 1`、`9 % 3 → 0`。偶奇の判定には `% 2` がよく使われます。");
  }
  if (c.branch) {
    hintList.push("**条件演算子:** `==`（等しい）、`!=`（等しくない）、`>`、`<`、`>=`（以上）、`<=`（以下）。複数条件は `and`、`or` でつなげます。");
  }
  if (c.sum) {
    hintList.push("**合計の計算:** `total = 0` と初期化し、ループ内で `total += 値` と書くと値を蓄積できます。`+=` は `total = total + 値` の短縮形です。");
  }
  if (c.avg) {
    hintList.push("**平均の計算:** 合計 ÷ 個数 で求めます。整数の割り算は `//`（切り捨て）、小数の割り算は `/` を使います。");
  }
  if (c.input) {
    hintList.push("**input() の注意点:** `input()` は常に「文字列」を返します。数値として使うには `int(input())` や `float(input())` で変換しましょう。");
  }
  if (c.list) {
    hintList.push("**リストの操作:** `リスト.append(値)` で末尾に追加、`len(リスト)` で要素数を取得、`for item in リスト:` で各要素を順に取り出せます。");
  }
  if (c.func) {
    hintList.push("**関数の定義:** `def 関数名(引数):` で定義し、`return 値` で結果を返します。関数は呼び出す前に定義する必要があります。");
  }
  hintList.push("**コーディングのコツ:** まず処理の流れを日本語で書き出してから、Pythonに変換する方法がおすすめです。一気に書こうとせず、少しずつ確認しながら進めましょう！");

  return { purpose, inputs, branches, steps, hints: hintList.join("\n\n") };
}

// ─── Code Review ─────────────────────────────────────────────────────────────

function basicSyntaxErrors(code: string): string[] {
  const errors: string[] = [];
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const lineNum = i + 1;

    // Missing colon after block keywords
    if (/^\s*(if|elif|else|for|while|def|class|with|try|except|finally)\b/.test(line)) {
      if (!/:\s*(#.*)?$/.test(line)) {
        errors.push(`${lineNum}行目: \`${trimmed.substring(0, 40)}\` → キーワードの行末に \`:\` が必要です`);
      }
    }
  });

  return errors;
}

export function reviewLocalCode(problem: string, code: string): ReviewResult {
  const c = detect(problem);

  const syntaxErrors = basicSyntaxErrors(code);
  if (syntaxErrors.length > 0) {
    return {
      status: "error",
      review: `## 構文上の問題が見つかりました\n\n${syntaxErrors.map((e) => `- ${e}`).join("\n")}\n\n**ヒント:** エラーの行を確認して、Pythonの書き方（コロン \`:\` の位置、インデントの深さなど）を見直してみましょう！`,
    };
  }

  const codeLines = code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (codeLines.length < 2) {
    return {
      status: "needs_improvement",
      review: "## もう少し書いてみましょう！\n\nまだコードが少ないようです。課題をもう一度読んで、どんな処理が必要か考えてみましょう。",
    };
  }

  const missing: string[] = [];
  if (c.loop && !/\bfor\b|\bwhile\b/.test(code)) {
    missing.push("**繰り返し処理**（`for` 文または `while` 文）");
  }
  if (c.branch && !/\bif\b/.test(code)) {
    missing.push("**条件分岐**（`if` 文）");
  }
  if (c.input && !/\binput\s*\(/.test(code)) {
    missing.push("**ユーザー入力の取得**（`input()` 関数）");
  }
  if (!/\bprint\s*\(/.test(code)) {
    missing.push("**結果の出力**（`print()` 関数）");
  }
  if (c.func && !/\bdef\b/.test(code)) {
    missing.push("**関数の定義**（`def` 文）");
  }

  if (missing.length > 0) {
    return {
      status: "needs_improvement",
      review: `## 🤔 惜しい！あと一息です\n\n以下の要素が見当たりませんでした：\n\n${missing.map((m) => `- ${m}`).join("\n")}\n\nこれらをどこに追加すればよいか、課題文をもう一度読んで考えてみましょう！`,
    };
  }

  const warnings: string[] = [];
  if (c.input && /\binput\s*\(/.test(code) && !/\bint\s*\(|\bfloat\s*\(/.test(code) && c.calc) {
    warnings.push("`input()` で受け取った値は文字列のままです。計算に使うには `int()` または `float()` で変換しましょう。例: `num = int(input())`");
  }
  if (c.sum && !/\+\s*=|total|sum\s*\(/.test(code)) {
    warnings.push("合計を蓄積する変数（例: `total = 0`）が見当たりません。ループ前に初期化し、ループ内で `total += 値` と足し込みましょう。");
  }

  if (warnings.length > 0) {
    return {
      status: "needs_improvement",
      review: `## 🤔 良い出来ですが、確認点があります\n\n${warnings.map((w) => `- ${w}`).join("\n")}\n\n修正してから再度確認してみましょう！`,
    };
  }

  return {
    status: "correct",
    review: `## 🎉 よくできています！\n\n課題に必要な要素がすべて含まれているようです！\n\n**次のステップ：**\n- 実際にPythonで実行して、期待通りの出力が出るか確認しましょう\n- 変数名はわかりやすいですか？\n- インデントは正しく揃っていますか？\n\n実際に動かして確認できたら完璧です！`,
  };
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export function chatLocalResponse(
  problem: string,
  chatHistory: Array<{ role: string; message: string }>,
  userMessage: string
): string {
  const msg = userMessage;
  const c = detect(problem);
  const turn = Math.floor(chatHistory.length / 2);

  if (/エラー|error|動かない/.test(msg)) {
    if (/Syntax|構文/.test(msg))
      return "SyntaxError（構文エラー）は書き方のミスです。よくある原因：\n\n- `if`/`for`/`def` の行末に `:` を忘れた\n- インデント（字下げ）がずれている\n- 括弧 `()` や `[]` が閉じられていない\n\nエラーが出た行番号を確認して、その周辺を見直してみましょう。";
    if (/Name/.test(msg))
      return "NameError は「定義していない変数名を使った」エラーです。\n\n- 変数名のスペルミスはないですか？\n- 変数を使う前に代入（定義）しましたか？\n- `for` ループの変数名と一致していますか？";
    if (/Type|型/.test(msg))
      return "TypeError は「型が合わない」エラーです。例えば文字列と数値を足そうとしたときに発生します。\n\n`input()` で受け取った値は文字列なので、数値として使うには `int()` や `float()` で変換が必要です！";
    if (/Indent|インデント/.test(msg))
      return "IndentationError はインデント（字下げ）のエラーです。\n\n- `if`/`for`/`def` の中身は必ず4スペース（またはタブ1つ）字下げします\n- スペースとタブを混ぜないようにしましょう\n- 同じブロック内は同じ深さに揃えます";
    return "エラーメッセージをよく読むとヒントが書かれています！\n\n- **SyntaxError** → 書き方のミス（コロン忘れ、インデントのズレ）\n- **NameError** → 未定義の変数\n- **TypeError** → 型が合わない（文字列と数値の混在など）\n- **IndentationError** → インデントの深さがおかしい\n\nどんなエラーメッセージが出ていますか？";
  }

  if (/ループ|for文|繰り返し|range/.test(msg)) {
    return "`for` 文の基本形はこうです：\n\n```python\nfor i in range(1, 6):  # 1, 2, 3, 4, 5\n    print(i)\n```\n\n`range(start, stop)` は `start` から `stop-1` までの整数を生成します。\n\n今回の課題では、何回・何から何まで繰り返す必要があるか考えてみましょう！";
  }

  if (/条件|if文|判定|分岐/.test(msg)) {
    return "`if` 文の基本形はこうです：\n\n```python\nif 条件式:\n    # 条件が真のときの処理\nelif 別の条件:\n    # 別の場合\nelse:\n    # それ以外\n```\n\n今回の課題で「〜の場合」という部分はどこですか？その部分が条件式になります！";
  }

  if (/余り|%|偶数|奇数/.test(msg)) {
    return "`%` は余りを求める演算子です：\n\n- `10 % 3 = 1`（10÷3の余り）\n- `6 % 2 = 0`（6÷2の余りは0 → 偶数）\n- `7 % 2 = 1`（7÷2の余りは1 → 奇数）\n\n「偶数かどうか」の判定は `数値 % 2 == 0` で書けます。試してみましょう！";
  }

  if (/input|入力/.test(msg)) {
    return "`input()` の使い方：\n\n```python\nname = input('名前を入力してください: ')\nnum = int(input('数値を入力: '))  # 数値の場合はint()で変換\n```\n\n`input()` は常に文字列を返すので、計算に使う場合は `int()` や `float()` で変換が必要です！";
  }

  if (/インデント|字下げ|indent/.test(msg)) {
    return "Pythonのインデント（字下げ）はとても重要です：\n\n```python\nfor i in range(5):  # ← ブロックの始まり\n    print(i)        # ← 4スペース字下げ（ブロック内）\nprint('終了')       # ← 字下げなし（ブロック外）\n```\n\n- ブロックの中は必ず同じ深さに揃える\n- スペースとタブを混在させない\n\nインデントがズレると `IndentationError` になります！";
  }

  if (/print|出力/.test(msg)) {
    return "`print()` の基本的な使い方：\n\n```python\nprint('文字列')          # 文字列をそのまま表示\nprint(変数)              # 変数の値を表示\nprint(f'値は{変数}です') # f文字列で変数と文字を混ぜる\n```\n\n複数の値を表示するには `print(a, b)` のようにカンマで区切れます！";
  }

  if (/ヒント|hint|教えて/.test(msg)) {
    const hints: string[] = ["課題を解くためのヒントをいくつか出しますね：\n"];
    if (c.loop) hints.push("- `for i in range(...):` で繰り返しを作りましょう");
    if (c.branch) hints.push("- `if 条件:` で条件分岐を書きましょう（コロンを忘れずに！）");
    if (c.modulo) hints.push("- 偶奇の判定には `% 2` を使います（余りが0なら偶数）");
    if (c.sum) hints.push("- 合計は `total = 0` と初期化してから `total += 値` で積み上げます");
    if (c.input) hints.push("- `input()` は文字列を返すので、数値として使うなら `int()` で変換を");
    hints.push("\nまず処理の流れを言葉で書き出してから、コードに変換してみましょう！");
    return hints.join("\n");
  }

  if (/こんにちは|はじめ|よろしく/.test(msg)) {
    return "こんにちは！一緒にPythonの課題を解いていきましょう。\n\n答えは直接教えませんが、ヒントや考え方のサポートは全力でします！\n\n何から始めればいいかわからない場合は、まず課題文を読んで「何をするプログラムか」を自分の言葉で説明してみましょう。";
  }

  const fallbacks = [
    "なるほど！もう少し詳しく教えてもらえますか？どのステップで詰まっていますか？",
    "良い質問ですね。まず、その部分をコードで書くとしたら、どんな処理が必要だと思いますか？",
    "考えてみましょう！課題文の中で、今の質問に関係する部分はどこですか？その部分を自分の言葉で説明してみてください。",
    "一緒に整理しましょう。今書いているコードのどの部分が「うまくいかない」と感じていますか？",
  ];
  return fallbacks[turn % fallbacks.length];
}
