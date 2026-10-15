import { useEffect, useId, useRef, useState } from "react";

import { formatNumber } from "@/domain";
import type { WeightRecord } from "@/data";
import { localDateOfInstant } from "@/app/selectors";

const HEIGHT = 280;
const LEFT = 42;
const RIGHT = 14;
const TOP = 40;
const BOTTOM = 30;

export interface WeightChartProps {
  /** 按记录时间升序。 */
  records: readonly WeightRecord[];
  selectedId: string | null;
  onSelect: (record: WeightRecord) => void;
}

export function WeightChart(props: WeightChartProps) {
  const [container, width] = useElementWidth<HTMLDivElement>();

  return (
    <div ref={container} className="w-full">
      {width > 0 && props.records.length > 0 ? <Chart {...props} width={width} /> : null}
    </div>
  );
}

function Chart({ records, width, selectedId, onSelect }: WeightChartProps & { width: number }) {
  const gradientId = useId();
  const minWeight = Math.min(...records.map((record) => record.weightKg));
  const maxWeight = Math.max(...records.map((record) => record.weightKg));
  // 至少显示 0.8 kg 的跨度，避免把成年猫的几十克波动画得过大。
  const span = Math.max(maxWeight - minWeight, 0.8);
  const roughStep = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 2.5, 5, 10].find((value) => value * magnitude >= roughStep)! * magnitude;
  const middle = (minWeight + maxWeight) / 2;
  const yMin = Math.max(0, Math.floor((middle - span / 2 - span * 0.1) / step) * step);
  const yMax = Math.ceil((middle + span / 2 + span * 0.1) / step) * step;
  const yTicks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + step * i);

  const first = records[0]!;
  const last = records[records.length - 1]!;
  const minTime = first.recordedAtEpochMs;
  const timeSpan = last.recordedAtEpochMs - minTime;
  const plotWidth = Math.max(width - LEFT - RIGHT, 1);
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const xOf = (time: number) => LEFT + (timeSpan === 0 ? 0.5 : (time - minTime) / timeSpan) * plotWidth;
  const yOf = (weight: number) => TOP + (1 - (weight - yMin) / (yMax - yMin)) * plotHeight;
  const points = records.map((record) => ({ record, x: xOf(record.recordedAtEpochMs), y: yOf(record.weightKg) }));
  const foundIndex = records.findIndex((record) => record.id === selectedId);
  const selectedIndex = foundIndex < 0 ? records.length - 1 : foundIndex;
  const selected = points[selectedIndex]!;
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const tickCount = timeSpan === 0 ? 1 : width < 480 ? 3 : 5;
  const tooltipX = Math.max(LEFT + 53, Math.min(selected.x, width - RIGHT - 53));

  function selectAt(clientX: number, element: SVGSVGElement) {
    const x = clientX - element.getBoundingClientRect().left;
    const nearest = points.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
    onSelect(nearest.record);
  }

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label="体重曲线，左右方向键切换记录，Home 和 End 跳到首尾记录"
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      onKeyDown={(event) => {
        let index = selectedIndex;
        if (event.key === "ArrowLeft") index = Math.max(0, index - 1);
        else if (event.key === "ArrowRight") index = Math.min(records.length - 1, index + 1);
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = records.length - 1;
        else return;
        event.preventDefault();
        onSelect(records[index]!);
      }}
    >
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${localDateOfInstant(first.recordedAt)} 至 ${localDateOfInstant(last.recordedAt)}，${records.length} 条体重记录，单位 kg`}
        className="select-none"
        onPointerDown={(event) => selectAt(event.clientX, event.currentTarget)}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons === 1) selectAt(event.clientX, event.currentTarget);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1" className="text-primary">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <text x={LEFT - 10} y={17} textAnchor="end" className="fill-muted-foreground" fontSize={11}>kg</text>
        {yTicks.map((value) => (
          <g key={value}>
            <line x1={LEFT} x2={width - RIGHT} y1={yOf(value)} y2={yOf(value)} className="stroke-border" strokeDasharray="3 5" />
            <text x={LEFT - 10} y={yOf(value)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={11}>
              {formatNumber(value, step < 0.1 ? 2 : 1)}
            </text>
          </g>
        ))}
        {points.length > 1 ? (
          <>
            <polygon points={`${LEFT},${HEIGHT - BOTTOM} ${line} ${width - RIGHT},${HEIGHT - BOTTOM}`} fill={`url(#${gradientId})`} className="text-primary" />
            <polyline points={line} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : null}
        {points.map((point) => (
          <circle key={point.record.id} cx={point.x} cy={point.y} r={points.length > 40 ? 2 : 3} className="fill-card stroke-primary" strokeWidth={1.5} />
        ))}
        <line x1={selected.x} x2={selected.x} y1={TOP} y2={HEIGHT - BOTTOM} className="stroke-primary/40" strokeDasharray="4 4" />
        <circle cx={selected.x} cy={selected.y} r={9} className="fill-primary/15" />
        <circle cx={selected.x} cy={selected.y} r={4.5} className="fill-primary stroke-card" strokeWidth={2} />
        <g transform={`translate(${tooltipX}, 15)`}>
          <rect x={-53} y={-14} width={106} height={27} rx={7} className="fill-primary" />
          <text textAnchor="middle" dominantBaseline="middle" className="fill-primary-foreground" fontSize={11}>
            {localDateOfInstant(selected.record.recordedAt).slice(5).replace("-", "/")} · {formatNumber(selected.record.weightKg, 2)} kg
          </text>
        </g>
        {Array.from({ length: tickCount }, (_, index) => {
          const time = tickCount === 1 ? minTime : minTime + timeSpan * index / (tickCount - 1);
          const date = new Date(time + first.timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
          return (
            <text key={index} x={xOf(time)} y={HEIGHT - 8} textAnchor={tickCount === 1 ? "middle" : index === 0 ? "start" : index === tickCount - 1 ? "end" : "middle"} className="fill-muted-foreground" fontSize={11}>
              {timeSpan < 90 * 86_400_000 ? date.slice(5).replace("-", "/") : date.slice(0, 7).replace("-", ".")}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** 使用实际像素绘制，避免 SVG 缩放文字。 */
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
