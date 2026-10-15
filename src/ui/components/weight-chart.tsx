import { useEffect, useRef, useState } from "react";

import { formatNumber } from "@/domain";
import type { WeightRecord } from "@/data";
import { localDateOfInstant } from "@/app/selectors";
import { cn } from "@/ui/lib/utils";

/**
 * 体重曲线。只画真实记录点，不做预测线。
 * 宽度由容器实测决定，1 用户单位等于 1 像素，文字在任何屏宽下都不会被缩放糊掉。
 */

const HEIGHT = 200;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

export interface WeightChartProps {
  /** 按记录时间升序。 */
  records: readonly WeightRecord[];
  selectedId: string | null;
  onSelect: (record: WeightRecord) => void;
}

export function WeightChart({ records, selectedId, onSelect }: WeightChartProps) {
  const [container, width] = useElementWidth<HTMLDivElement>();

  return (
    <div ref={container} className="w-full">
      {width > 0 ? (
        <Chart
          records={records}
          width={width}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}

function Chart({ records, width, selectedId, onSelect }: WeightChartProps & { width: number }) {
  const weights = records.map((record) => record.weightKg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightSpan = maxWeight - minWeight;
  // 所有记录体重相同时给一个人为的纵向余量，否则点会全部压在一条线上。
  const padding = weightSpan > 0 ? weightSpan * 0.25 : Math.max(maxWeight * 0.05, 0.2);
  const yMin = minWeight - padding;
  const yMax = maxWeight + padding;

  const times = records.map((record) => record.recordedAtEpochMs);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = maxTime - minTime;

  const innerWidth = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xOf = (time: number) =>
    timeSpan === 0
      ? PAD_LEFT + innerWidth / 2
      : PAD_LEFT + ((time - minTime) / timeSpan) * innerWidth;
  const yOf = (weight: number) =>
    PAD_TOP + (1 - (weight - yMin) / (yMax - yMin)) * innerHeight;

  const points = records.map((record) => ({
    record,
    x: xOf(record.recordedAtEpochMs),
    y: yOf(record.weightKg),
  }));

  const yTicks =
    weightSpan === 0
      ? [{ value: minWeight, y: yOf(minWeight) }]
      : [
          { value: maxWeight, y: yOf(maxWeight) },
          { value: (minWeight + maxWeight) / 2, y: yOf((minWeight + maxWeight) / 2) },
          { value: minWeight, y: yOf(minWeight) },
        ];

  const first = records[0]!;
  const last = records[records.length - 1]!;

  return (
    <svg
      width={width}
      height={HEIGHT}
      role="img"
      aria-label={`体重曲线，从 ${localDateOfInstant(first.recordedAt)} 的 ${formatNumber(first.weightKg, 2)} kg 到 ${localDateOfInstant(last.recordedAt)} 的 ${formatNumber(last.weightKg, 2)} kg`}
    >
      {yTicks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={PAD_LEFT}
            x2={width - PAD_RIGHT}
            y1={tick.y}
            y2={tick.y}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={PAD_LEFT - 6}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            fontSize={11}
          >
            {formatNumber(tick.value, 1)}
          </text>
        </g>
      ))}

      {points.length > 1 ? (
        <polyline
          points={points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {points.map((point) => {
        const isSelected = point.record.id === selectedId;
        return (
          <g key={point.record.id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={isSelected ? 6 : 4}
              className={cn(
                "cursor-pointer stroke-primary",
                isSelected ? "fill-primary" : "fill-card",
              )}
              strokeWidth={2}
              onClick={() => onSelect(point.record)}
            >
              <title>
                {`${localDateOfInstant(point.record.recordedAt)} · ${formatNumber(point.record.weightKg, 2)} kg`}
              </title>
            </circle>
            <circle
              cx={point.x}
              cy={point.y}
              r={11}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSelect(point.record)}
            />
          </g>
        );
      })}

      <text
        x={PAD_LEFT}
        y={HEIGHT - 8}
        textAnchor="start"
        className="fill-muted-foreground"
        fontSize={11}
      >
        {localDateOfInstant(first.recordedAt)}
      </text>
      {points.length > 1 ? (
        <text
          x={width - PAD_RIGHT}
          y={HEIGHT - 8}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={11}
        >
          {localDateOfInstant(last.recordedAt)}
        </text>
      ) : null}
    </svg>
  );
}

/** 实测容器宽度。图表用它做坐标系，避免 SVG 缩放把文字压糊。 */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
