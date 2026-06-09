// 3-level progressive hints for Python problems

export type HintSet = {
  hint1: string; // 考える方向性
  hint2: string; // 使うべき文法・関数
  hint3: string; // ほぼ解法（コード骨格）
};

function detect(text: string) {
  return {
    loop:   /繰り返し|ループ|for文|while|range|順番|一つずつ/.test(text),
    branch: /条件|判定|場合|もし|if|偶数|奇数|以上|以下|正の|負の/.test(text),
    input:  /入力|input|ユーザーから|キーボード/.test(text),
    sum:    /合計|総和|足し/.test(text),
    avg:    /平均/.test(text),
    max:    /最大/.test(text),
    min:    /最小/.test(text),
    modulo: /余り|偶数|奇数/.test(text),
    func:   /関数|def/.test(text),
    list:   /リスト|配列|list/.test(text),
    fizz:   /fizzbuzz/i.test(text),
    fib:    /フィボナッチ/.test(text),
    prime:  /素数/.test(text),
    fact:   /階乗/.test(text),
  };
}

function extractRange(text: string): [number, number] | null {
  const m = text.match(/(\d+)\s*(?:から|〜|～)\s*(\d+)/);
  return m ? [+m[1], +m[2]] : null;
}

export function generateHints(problem: string): HintSet {
  const c = detect(problem);
  const range = extractRange(problem);

  // ── FizzBuzz ─────────────────────────────────────────────────────────────
  if (c.fizz) {
    return {
      hint1: "1から指定の数まで順に調べて、それぞれの数が「3の倍数」「5の倍数」「両方の倍数」「それ以外」のどれに当たるかで出力を変えます。",
      hint2: "繰り返しには `for i in range(1, n+1):` を使います。倍数の判定は余り演算子 `%` を使います（`i % 3 == 0` で3の倍数）。`if` / `elif` / `else` で場合分けします。",
      hint3: "骨格はこうです：\n```python\nfor i in range(1, 16):\n    if i % 15 == 0:   # 両方の倍数を最初に判定！\n        print(\"FizzBuzz\")\n    elif i % 3 == 0:\n        print(\"Fizz\")\n    elif i % 5 == 0:\n        print(\"Buzz\")\n    else:\n        print(i)\n```\n`15 = 3×5` の倍数を先に判定することがポイントです。",
    };
  }

  // ── 素数の一覧表示（入力なし）────────────────────────────────────────────
  if (c.prime && !c.input) {
    const r = extractRange(problem) ?? [2, 100];
    return {
      hint1: `2 から ${r[1]} まで1つずつ調べて、素数だけ出力します。素数とは「1と自分自身以外では割り切れない2以上の整数」です。外側ループで候補を選び、内側ループで割り切れるか確かめる2重ループが基本です。`,
      hint2: `外側: \`for n in range(2, ${r[1] + 1}):\` で候補を列挙。内側: \`for i in range(2, n):\` で \`n % i == 0\` なら素数でないと確定。フラグ変数 \`is_prime = True\` を内側ループ前に置き、割り切れたら \`False\` にして \`break\`。`,
      hint3: `骨格：\n\`\`\`python\nfor n in range(2, ${r[1] + 1}):\n    is_prime = True\n    for i in range(2, n):   # 2〜n-1で割り切れるか試す\n        if n % i == 0:\n            is_prime = False\n            break\n    if is_prime:\n        print(n)\n\`\`\`\n動きますが遅いです。\`range(2, int(n**0.5) + 1)\` にすると高速化できます（なぜか考えてみましょう）。`,
    };
  }

  // ── 素数判定（入力あり）──────────────────────────────────────────────────
  if (c.prime && c.input) {
    return {
      hint1: "ある数 n が素数かどうかを判定するには「2以上 n-1 以下の数で割り切れるか」を調べます。一つでも割り切れれば素数ではありません。",
      hint2: "`for i in range(2, n):` でループし、`if n % i == 0:` で割り切れるか確認します。フラグ変数（例: `is_prime = True`）を用意して、割り切れたら `False` にします。",
      hint3: "骨格：\n```python\nn = int(input())\nis_prime = True\nif n < 2:\n    is_prime = False\nelse:\n    for i in range(2, n):  # 2からn-1まで調べる\n        if n % i == 0:\n            is_prime = False\n            break\nprint(\"素数\" if is_prime else \"素数ではない\")\n```",
    };
  }

  // ── 階乗 ──────────────────────────────────────────────────────────────────
  if (c.fact) {
    return {
      hint1: "n の階乗 (n!) は 1 × 2 × 3 × … × n のことです。1から n まで順に掛け算を積み上げていきます。",
      hint2: "`result = 1` と初期化し、`for i in range(1, n+1):` のループ内で `result *= i`（`result = result * i` の短縮）と書きます。",
      hint3: "骨格：\n```python\nn = int(input())\nresult = 1\nfor i in range(1, n + 1):\n    result *= i\nprint(result)\n```",
    };
  }

  // ── フィボナッチ ──────────────────────────────────────────────────────────
  if (c.fib) {
    return {
      hint1: "フィボナッチ数列は「前の2つの数を足した値が次の値」になる数列です（0, 1, 1, 2, 3, 5, 8, ...）。直前2つの値を変数で保持しながらループします。",
      hint2: "変数を2つ（`a`, `b`）用意し、ループ内で `a, b = b, a + b` のように同時更新します。",
      hint3: "骨格：\n```python\nn = 10  # 何項出力するか\na, b = 0, 1\nfor _ in range(n):\n    print(a)\n    a, b = b, a + b\n```",
    };
  }

  // ── ループ + 条件（偶数・奇数など）────────────────────────────────────────
  if (c.loop && c.branch && c.modulo) {
    const r = range ?? [1, 10];
    return {
      hint1: `${r[0]} から ${r[1]} まで数字を1つずつ調べて、条件を満たすものだけ出力します。「全部を繰り返す」×「条件に合うものだけ処理する」の組み合わせです。`,
      hint2: "`for i in range(start, stop):` で繰り返し、`i % 2 == 0` で偶数（余りが0）、`i % 2 != 0` で奇数を判定します。条件を満たす場合のみ `print(i)` します。",
      hint3: `骨格：\n\`\`\`python\nfor i in range(${r[0]}, ${r[1] + 1}):\n    if i % 2 == ???:  # 偶数の条件は？\n        print(i)\n\`\`\`\n`+ "`???` の部分を考えてみましょう。",
    };
  }

  // ── 合計（入力あり）───────────────────────────────────────────────────────
  if (c.sum && c.input) {
    return {
      hint1: "入力から2つ（または複数）の数値を受け取り、それらを足して出力します。「入力する」→「足す」→「出力する」の3ステップで考えましょう。",
      hint2: "`input()` の戻り値は文字列なので、`int()` で整数に変換します。2つの数を変数に入れ、`+` で足し合わせ、`print()` で出力します。",
      hint3: "骨格：\n```python\na = int(input())\nb = int(input())\nprint(a + b)\n```",
    };
  }

  // ── 合計（入力なし）───────────────────────────────────────────────────────
  if (c.sum && !c.input) {
    const r = range ?? [1, 10];
    return {
      hint1: `${r[0]} から ${r[1]} まで全部を足した合計を求めます。「足し込む変数」を用意して、ループで1つずつ加算していきます。`,
      hint2: "`total = 0` と初期化し、`for i in range(start, stop):` のループ内で `total += i` と書くと合計が蓄積されます。",
      hint3: `骨格：\n\`\`\`python\ntotal = 0\nfor i in range(${r[0]}, ${r[1] + 1}):\n    total += i\nprint(total)\n\`\`\``,
    };
  }

  // ── 平均 ──────────────────────────────────────────────────────────────────
  if (c.avg) {
    return {
      hint1: "平均 = 合計 ÷ 個数 です。まず合計を求め、次に個数で割ります。入力の個数をどう知るか（事前に与えられるか、EOFまで読むか）を確認しましょう。",
      hint2: "`total = 0` で合計を蓄積し、`count` で個数を数えます。最後に `total / count` で割り算します（整数除算 `//` と小数 `/` に注意）。",
      hint3: "骨格（個数 n を先に入力する場合）：\n```python\nn = int(input())\ntotal = 0\nfor _ in range(n):\n    total += float(input())\nprint(total / n)\n```",
    };
  }

  // ── 最大・最小 ────────────────────────────────────────────────────────────
  if (c.max || c.min) {
    const word = c.max ? "最大" : "最小";
    const op = c.max ? ">" : "<";
    const init = c.max ? "float('-inf')" : "float('inf')";
    return {
      hint1: `複数の数の中から${word}値を見つけるには、「今までで一番${c.max ? "大きい" : "小さい"}値」を変数で覚えておき、新しい値と比べながら更新していきます。`,
      hint2: `\`result = ${init}\` と初期化し、ループ内で \`if 値 ${op} result:\` のときに \`result = 値\` と更新します。Pythonには \`max()\` / \`min()\` 関数もあります。`,
      hint3: `骨格：\n\`\`\`python\nvalues = [int(input()) for _ in range(n)]\nprint(${c.max ? "max" : "min"}(values))\n\`\`\`\nまたはループで自力実装：\n\`\`\`python\nresult = ${init}\nfor v in values:\n    if v ${op} result:\n        result = v\nprint(result)\n\`\`\``,
    };
  }

  // ── ループのみ（連番出力）────────────────────────────────────────────────
  if (c.loop && range) {
    return {
      hint1: `${range[0]} から ${range[1]} まで数字を順番に出力します。「繰り返し処理」を使えば1行で書けます。`,
      hint2: "`for i in range(start, stop):` でループします。`range(1, 11)` は 1〜10 を生成します（stop は含まれない）。ループ内で `print(i)` します。",
      hint3: `骨格：\n\`\`\`python\nfor i in range(${range[0]}, ${range[1] + 1}):\n    print(i)\n\`\`\``,
    };
  }

  // ── 入力 + 演算（汎用）────────────────────────────────────────────────────
  if (c.input) {
    return {
      hint1: "ユーザーから値を受け取り、処理して出力するプログラムです。「入力→処理→出力」の3ステップで整理しましょう。",
      hint2: "`input()` で入力を受け取ります（戻り値は常に文字列）。数値として使うには `int()` か `float()` で変換します。結果は `print()` で出力します。",
      hint3: "基本パターン：\n```python\nx = int(input())   # 入力を受け取り整数に変換\nresult = x の何らかの計算\nprint(result)      # 出力\n```",
    };
  }

  // ── 汎用 ──────────────────────────────────────────────────────────────────
  return {
    hint1: "課題文を読んで「このプログラムは何をするか」を一文で言えるか考えてみましょう。次に「どんなデータ（変数）が必要か」を書き出します。",
    hint2: "必要なPythonの道具は何ですか？`print()`（出力）/ `input()`（入力）/ `for`（繰り返し）/ `if`（条件分岐）のどれが必要か考えてみましょう。",
    hint3: "処理の流れをコメントで先に書くと整理しやすいです：\n```python\n# 1. 必要な変数を初期化\n# 2. 繰り返しや条件の処理\n# 3. print() で結果を出力\n```",
  };
}
