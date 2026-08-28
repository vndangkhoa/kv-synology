"use client";

import React from "react";

interface SparklineProps {
  data: number[];
  color: string;
  maxVal?: number;
  height?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color,
  maxVal,
  height = 48,
  className = "",
}) => {
  if (!data || data.length < 2) return null;
  const computedMax = maxVal !== undefined ? maxVal : Math.max(...data, 1);
  const width = 300;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - (Math.min(val, computedMax) / (computedMax || 1)) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className={`w-full overflow-visible ${className}`}
      style={{ height }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

interface DualSparklineProps {
  series1: number[];
  series2: number[];
  color1: string;
  color2: string;
  maxVal?: number;
  height?: number;
  className?: string;
}

export const DualSparkline: React.FC<DualSparklineProps> = ({
  series1,
  series2,
  color1,
  color2,
  maxVal,
  height = 48,
  className = "",
}) => {
  const allVals = [...series1, ...series2];
  if (allVals.length < 2) return null;
  const computedMax = maxVal !== undefined ? maxVal : Math.max(...allVals, 1024);
  const width = 300;

  const getPoints = (pts: number[]) =>
    pts
      .map((val, idx) => {
        const x = (idx / Math.max(pts.length - 1, 1)) * width;
        const y = height - (Math.min(val, computedMax) / computedMax) * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg
      className={`w-full overflow-visible ${className}`}
      style={{ height }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {series1.length > 1 && (
        <polyline
          fill="none"
          stroke={color1}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={getPoints(series1)}
        />
      )}
      {series2.length > 1 && (
        <polyline
          fill="none"
          stroke={color2}
          strokeWidth="2"
          strokeDasharray="4 2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={getPoints(series2)}
        />
      )}
    </svg>
  );
};
