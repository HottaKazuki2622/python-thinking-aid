// Auto-generate test cases from problem text

export type TestCase = {
  id: string;
  label: string;
  input: string;    // stdin (empty = no input required)
  expected: string; // expected stdout after trim (empty = not yet set)
};

let _seq = 0;
function uid() { return `tc_${++_seq}_${Math.random().toString(36).slice(2, 6)}`; }
function tc(label: string, input: string, expected: string): TestCase {
  return { id: uid(), label, input, expected };
}

function detect(text: string) {
  return {
    hasInput:   /入力|input\b|ユーザーから|キーボード|読み込|stdin/.test(text),
    isSum:      /合計|総和|足し合わせ/.test(text),
    isAvg:      /平均/.test(text),
    isMax:      /最大/.test(text),
    isMin:      /最小/.test(text),
    isEven:     /偶数/.test(text),
    isOdd:      /奇数/.test(text),
    isFizz:     /fizzbuzz/i.test(text),
    isMult:     /九九/.test(text),
    isFactorial:/階乗/.test(text),
    isFib:      /フィボナッチ/.test(text),
    isHello:    /hello|こんにちは|Hello/.test(text),
    isPrime:    /素数/.test(text),
  };
}

function extractRange(text: string): [number, number] | null {
  const m = text.match(/(\d+)\s*(?:から|〜|～)\s*(\d+)/);
  return m ? [+m[1], +m[2]] : null;
}

function rangeArr(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function generateTestCases(problem: string): TestCase[] {
  const c = detect(problem);

  // ── FizzBuzz ──────────────────────────────────────────────────────────────
  if (c.isFizz) {
    const expected = rangeArr(1, 20).map((n) => {
      if (n % 15 === 0) return "FizzBuzz";
      if (n % 3 === 0) return "Fizz";
      if (n % 5 === 0) return "Buzz";
      return String(n);
    }).join("\n");
    return [tc("FizzBuzz (1〜20)", "", expected)];
  }

  // ── 九九 ──────────────────────────────────────────────────────────────────
  if (c.isMult) {
    // Just check a specific row
    const expected3 = rangeArr(1, 9).map((j) => `3 x ${j} = ${3 * j}`).join("\n");
    const expected7 = rangeArr(1, 9).map((j) => `7 x ${j} = ${7 * j}`).join("\n");
    // Format varies widely — provide empty expected so user can fill in
    return [
      tc("3の段", "", ""),
      tc("7の段", "", ""),
      tc("確認用（3の段参考）", "", expected3),
      tc("確認用（7の段参考）", "", expected7),
    ].slice(0, 2); // Keep only editable ones
  }

  // ── 偶数のみ出力（入力なし）────────────────────────────────────────────────
  if (c.isEven && !c.isOdd && !c.hasInput) {
    const range = extractRange(problem) ?? [1, 10];
    const expected = rangeArr(range[0], range[1]).filter((n) => n % 2 === 0).join("\n");
    return [tc(`${range[0]}〜${range[1]}の偶数`, "", expected)];
  }

  // ── 奇数のみ出力（入力なし）────────────────────────────────────────────────
  if (c.isOdd && !c.isEven && !c.hasInput) {
    const range = extractRange(problem) ?? [1, 10];
    const expected = rangeArr(range[0], range[1]).filter((n) => n % 2 !== 0).join("\n");
    return [tc(`${range[0]}〜${range[1]}の奇数`, "", expected)];
  }

  // ── 連番出力（入力なし）───────────────────────────────────────────────────
  if (!c.hasInput && !c.isSum && !c.isAvg && extractRange(problem)) {
    const range = extractRange(problem)!;
    const expected = rangeArr(range[0], range[1]).join("\n");
    return [tc(`${range[0]}〜${range[1]}を順に出力`, "", expected)];
  }

  // ── フィボナッチ ──────────────────────────────────────────────────────────
  if (c.isFib) {
    function fib(n: number): number[] {
      const a = [0, 1];
      for (let i = 2; i < n; i++) a.push(a[i - 1] + a[i - 2]);
      return a.slice(0, n);
    }
    return [tc("フィボナッチ数列（10項）", "", fib(10).join("\n"))];
  }

  // ── 合計（入力あり）───────────────────────────────────────────────────────
  if (c.isSum && c.hasInput) {
    return [
      tc("テスト1: 1+2", "1\n2", "3"),
      tc("テスト2: 10+20", "10\n20", "30"),
      tc("テスト3: -5+5", "-5\n5", "0"),
    ];
  }

  // ── 合計（入力なし、範囲指定）────────────────────────────────────────────
  if (c.isSum && !c.hasInput) {
    const range = extractRange(problem);
    if (range) {
      const sum = rangeArr(range[0], range[1]).reduce((a, b) => a + b, 0);
      return [tc(`${range[0]}〜${range[1]}の合計`, "", String(sum))];
    }
  }

  // ── 平均（入力あり）───────────────────────────────────────────────────────
  if (c.isAvg && c.hasInput) {
    return [
      tc("テスト1: 1,2,3 の平均", "1\n2\n3", "2.0"),
      tc("テスト2: 10,20,30 の平均", "10\n20\n30", "20.0"),
    ];
  }

  // ── 最大値（入力あり）────────────────────────────────────────────────────
  if (c.isMax && c.hasInput) {
    return [
      tc("テスト1", "3\n1\n4\n1\n5", "5"),
      tc("テスト2", "10\n2\n8", "10"),
    ];
  }

  // ── 最小値（入力あり）────────────────────────────────────────────────────
  if (c.isMin && c.hasInput) {
    return [
      tc("テスト1", "3\n1\n4\n1\n5", "1"),
      tc("テスト2", "10\n2\n8", "2"),
    ];
  }

  // ── 素数判定（入力あり）──────────────────────────────────────────────────
  if (c.isPrime && c.hasInput) {
    return [
      tc("7は素数", "7", "素数"),
      tc("4は素数でない", "4", "素数ではない"),
      tc("2は素数", "2", "素数"),
      tc("1は素数でない", "1", "素数ではない"),
    ];
  }

  // ── 入力あり（パターン不明）───────────────────────────────────────────────
  if (c.hasInput) {
    return [
      tc("テスト1", "", ""),
      tc("テスト2", "", ""),
    ];
  }

  // ── 入力なし（パターン不明）──────────────────────────────────────────────
  return [tc("テスト1", "", "")];
}
