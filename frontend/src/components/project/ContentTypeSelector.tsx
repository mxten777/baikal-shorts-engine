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
      {ALL_TYPES.map((type, index) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            "relative text-left px-5 py-4 rounded-xl border transition-all duration-300 overflow-hidden group animate-fade-in",
            value === type
              ? "border-baikal-cyan bg-gradient-to-br from-baikal-cyan/15 to-baikal-cyan/5 text-white shadow-glow-sm scale-105"
              : "border-baikal-gray-light/50 bg-baikal-gray/50 text-baikal-muted hover:border-baikal-cyan/50 hover:text-white hover:bg-baikal-gray hover:scale-105"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {value === type && (
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 rounded-full bg-baikal-cyan animate-glow-pulse" />
            </div>
          )}
          <p className="font-bold text-sm mb-1">
            {CONTENT_TYPE_LABELS[type]}
          </p>
          <p className="text-xs opacity-80 leading-snug">
            {TYPE_DESCRIPTIONS[type]}
          </p>
          {!value || value !== type && (
            <div className="absolute inset-0 bg-gradient-to-r from-baikal-cyan/0 via-baikal-cyan/5 to-baikal-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          )}
        </button>
      ))}
    </div>
  );
}
