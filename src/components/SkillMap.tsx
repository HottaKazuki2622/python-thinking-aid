"use client";

import React from "react";

export type SkillKeys = "syntax" | "branch" | "loop" | "list_dict" | "function";

export type SkillData = Record<SkillKeys, number>;

export interface TargetPreset {
  id: string;
  name: string;
  description: string;
  requirements: SkillData;
}

interface SkillMapProps {
  skills: SkillData;
  target: TargetPreset;
}

const SKILL_NAMES: Record<SkillKeys, string> = {
  syntax: "基礎文法",
  branch: "条件分岐",
  loop: "繰り返し",
  list_dict: "データ操作",
  function: "関数化",
};

const CATEGORIES: SkillKeys[] = ["syntax", "branch", "loop", "list_dict", "function"];

export const SkillMap: React.FC<SkillMapProps> = ({ skills, target }) => {
  const cx = 150;
  const cy = 135;
  const r = 90;

  // 5角形の頂点座標を計算
  const getCoordinates = (skillValues: SkillData) => {
    return CATEGORIES.map((key, i) => {
      const value = skillValues[key];
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = cx + r * Math.cos(angle) * (value / 100);
      const y = cy + r * Math.sin(angle) * (value / 100);
      return { x, y };
    });
  };

  const currentCoords = getCoordinates(skills);
  const targetCoords = getCoordinates(target.requirements);

  const pointsString = (coords: { x: number; y: number }[]) => {
    return coords.map((c) => `${c.x},${c.y}`).join(" ");
  };

  // 背景のグリッド（同心5角形）を描画するためのデータ
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="flex flex-col items-center bg-gray-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
      <div className="w-full flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-200">スキルマップ</h4>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/30 border border-indigo-400/80 inline-block"></span>
            <span className="text-gray-400">現在</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/10 border border-emerald-400/40 border-dashed inline-block"></span>
            <span className="text-gray-400">目標</span>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-[300px] aspect-square">
        <svg viewBox="0 0 300 270" className="w-full h-full drop-shadow-[0_0_15px_rgba(99,102,241,0.1)]">
          {/* グリッドライン（Web） */}
          {gridLevels.map((level) => {
            const levelCoords = getCoordinates({
              syntax: level,
              branch: level,
              loop: level,
              list_dict: level,
              function: level,
            });
            return (
              <polygon
                key={level}
                points={pointsString(levelCoords)}
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="1"
              />
            );
          })}

          {/* 中心から各頂点への放射線 */}
          {CATEGORIES.map((_, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="1"
              />
            );
          })}

          {/* 目標スキルの領域 */}
          <polygon
            points={pointsString(targetCoords)}
            fill="rgba(16, 185, 129, 0.04)"
            stroke="rgba(16, 185, 129, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="3,3"
            className="transition-all duration-700 ease-out"
          />

          {/* 現在スキルの領域 */}
          <polygon
            points={pointsString(currentCoords)}
            fill="url(#currentSkillGrad)"
            stroke="rgba(99, 102, 241, 0.8)"
            strokeWidth="2"
            className="transition-all duration-700 ease-out"
          />

          {/* 各頂点のデータポイント */}
          {currentCoords.map((coord, i) => (
            <circle
              key={i}
              cx={coord.x}
              cy={coord.y}
              r="4"
              className="fill-indigo-400 stroke-gray-950 stroke-2 transition-all duration-700 ease-out"
            />
          ))}

          {/* スキル名ラベルの描画 */}
          {CATEGORIES.map((key, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
            // ラベルの配置調整（少し外側に配置）
            const labelDist = r + 18;
            const x = cx + labelDist * Math.cos(angle);
            const y = cy + labelDist * Math.sin(angle) + 4; // 少し下にずらして垂直中央に合わせる
            
            let anchor: "middle" | "start" | "end" = "middle";
            if (Math.cos(angle) > 0.2) anchor = "start";
            if (Math.cos(angle) < -0.2) anchor = "end";

            const currentValue = skills[key];
            const targetValue = target.requirements[key];

            return (
              <g key={key}>
                <text
                  x={x}
                  y={y - 5}
                  textAnchor={anchor}
                  className="fill-gray-300 text-[10px] font-bold tracking-wider"
                >
                  {SKILL_NAMES[key]}
                </text>
                <text
                  x={x}
                  y={y + 6}
                  textAnchor={anchor}
                  className="fill-gray-500 text-[9px] font-mono"
                >
                  {currentValue} / {targetValue}
                </text>
              </g>
            );
          })}

          {/* グラデーション定義 */}
          <defs>
            <radialGradient id="currentSkillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.15)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.35)" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* 目標達成状況のステータスバー */}
      <div className="w-full mt-4 space-y-2 text-xs">
        <div className="flex justify-between text-gray-400">
          <span>目標達成度</span>
          <span className="font-mono text-indigo-400 font-bold">
            {Math.min(
              100,
              Math.round(
                (CATEGORIES.reduce((acc, key) => acc + Math.min(skills[key], target.requirements[key]), 0) /
                  CATEGORIES.reduce((acc, key) => acc + target.requirements[key], 0)) *
                  100
              )
            )}
            %
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(
                100,
                Math.round(
                  (CATEGORIES.reduce((acc, key) => acc + Math.min(skills[key], target.requirements[key]), 0) /
                    CATEGORIES.reduce((acc, key) => acc + target.requirements[key], 0)) *
                    100
                )
              )}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};
