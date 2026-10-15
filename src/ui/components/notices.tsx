import { AlertTriangle, Info, X } from "lucide-react";
import type { ReactNode } from "react";

import { formatNumber } from "@/domain";
import type { InputDriftNotice, StageUpdateNotice, WeightUpdateNotice } from "@/app/selectors";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

export interface NoticeProps {
  tone: "muted" | "warning" | "danger";
  message: ReactNode;
  action?: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<NoticeProps["tone"], string> = {
  muted: "border-border bg-muted/60 text-muted-foreground",
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  danger: "border-destructive/30 bg-destructive/5 text-destructive",
};

/** 轻量提示条。不阻断操作，需要时带一个明确的动作。 */
export function Notice({ tone, message, action, className }: NoticeProps) {
  const Icon = tone === "muted" ? Info : AlertTriangle;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="flex items-start gap-2 leading-relaxed sm:items-center">
        <Icon className="mt-0.5 size-3.5 shrink-0 sm:mt-0" aria-hidden />
        <span>{message}</span>
      </span>
      {action ? <span className="flex shrink-0 items-center gap-1">{action}</span> : null}
    </div>
  );
}

export interface WeightUpdateBannerProps {
  notice: WeightUpdateNotice;
  onUseLatest: () => void;
  onRecordWeight: () => void;
}

/**
 * 新体重提示。只提示，不自动覆盖当前计算，旧的计算快照也不受影响。
 */
export function WeightUpdateBanner({ notice, onUseLatest, onRecordWeight }: WeightUpdateBannerProps) {
  if (!notice.hasNewerWeight) {
    if (!notice.isStale) return null;
    return (
      <Notice
        tone="warning"
        message={`最近一次称重是 ${notice.latestRecordedDate}，已经 ${notice.daysSinceLatest} 天。`}
        action={
          <Button size="sm" variant="outline" onClick={onRecordWeight}>
            记录体重
          </Button>
        }
      />
    );
  }

  return (
    <Notice
      tone="warning"
      message={`已记录更新的体重：${formatNumber(notice.latestWeightKg, 2)} kg。当前计算仍按 ${formatNumber(notice.draftWeightKg, 2)} kg（${notice.draftRecordedDate}）。`}
      action={
        <Button size="sm" variant="outline" onClick={onUseLatest}>
          用最新体重重新计算
        </Button>
      }
    />
  );
}

export interface StageUpdateBannerProps {
  notice: StageUpdateNotice;
  onRecalculate: () => void;
}

export function StageUpdateBanner({ notice, onRecalculate }: StageUpdateBannerProps) {
  return (
    <Notice
      tone="warning"
      message={`年龄阶段已从${notice.previousStage}进入${notice.currentStage}，当前计算仍按原评估日期。`}
      action={
        <Button size="sm" variant="outline" onClick={onRecalculate}>
          按今天重新计算
        </Button>
      }
    />
  );
}

export interface DriftBannerProps {
  notices: InputDriftNotice[];
  onReapply: () => void;
}

/** 档案改过之后提示当前计算仍用着旧输入。不静默替换。 */
export function DriftBanner({ notices, onReapply }: DriftBannerProps) {
  if (notices.length === 0) return null;

  return (
    <Notice
      tone="muted"
      message={`档案已更新（${notices.map((notice) => notice.label).join("、")}），当前计算仍按录入时的资料。`}
      action={
        <Button size="sm" variant="outline" onClick={onReapply}>
          按最新档案重新计算
        </Button>
      }
    />
  );
}

export interface BasisSwitchBannerProps {
  modelName: string;
  onDismiss: () => void;
}

/** 关闭了原换算依据时，明确告知切换到了哪个模型。 */
export function BasisSwitchBanner({ modelName, onDismiss }: BasisSwitchBannerProps) {
  return (
    <Notice
      tone="muted"
      message={`原换算依据已停用，食品换算已切换为 ${modelName}。`}
      action={
        <Button size="sm" variant="ghost" onClick={onDismiss} aria-label="关闭提示">
          <X className="size-3.5" aria-hidden />
        </Button>
      }
    />
  );
}
