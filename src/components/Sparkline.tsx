import React from 'react';

interface SparklineProps {
  data: (number | null | undefined)[];
  width?: number;
  height?: number;
  color?: string;
  min?: number;
  max?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 38,
  height = 14,
  color = '#9ca0a8',
  min,
  max,
}) => {
  const validData = data.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  if (validData.length < 2) {
    return <span className="inline-block w-[38px] h-[14px] text-surface-border text-center text-[9px] leading-[14px]">—</span>;
  }

  const computedMin = min !== undefined ? min : Math.min(...validData);
  const computedMax = max !== undefined ? max : Math.max(...validData);
  const range = computedMax === computedMin ? 1 : computedMax - computedMin;

  const points = validData.map((val, idx) => {
    const x = (idx / (validData.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((val - computedMin) / range) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastPoint = points[points.length - 1].split(',');

  return (
    <svg width={width} height={height} className="inline-block overflow-visible align-middle shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
      <circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r="1.5"
        fill={color}
      />
    </svg>
  );
};
