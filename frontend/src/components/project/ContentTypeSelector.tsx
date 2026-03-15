import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/types";
import { CONTENT_TYPE_LABELS } from "@/types";

interface ContentTypeSelectorProps {
  value: ContentType;
  onChange: (value: ContentType) => void;
}

const TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  PROBLEM: "이 문제 알고 있었나요?",
  SOLUTION: "이렇게 해결했습니다",
  CASE: "실제 구축 사례",
  COMPARE: "기존방식 vs 바이칼",
  SALES: "지금 바로 문의",
  BRAND: "대표 직접 메시지",
};

const ALL_TYPES: ContentType[] = [
  "PROBLEM",
  "SOLUTION",
  "CASE",
  "COMPARE",
  "SALES",
  "BRAND",
];

export function ContentTypeSelector({
  value,
  onChange,
}: ContentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ALL_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            "text-left px-4 py-3 rounded-xl border transition-all",
            value === type
              ? "border-baikal-cyan bg-baikal-cyan/10 text-white"
              : "border-baikal-gray-light bg-baikal-gray text-baikal-muted hover:border-baikal-cyan/50 hover:text-white"
          )}
        >
          <p className="font-semibold text-sm">
            {CONTENT_TYPE_LABELS[type]}
          </p>
          <p className="text-xs mt-0.5 opacity-70">
            {TYPE_DESCRIPTIONS[type]}
          </p>
        </button>
      ))}
    </div>
  );
}
