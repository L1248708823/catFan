import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PawPrint } from "lucide-react";

import { useCalculatorStatus, useDraftRecovery } from "@/app/calculator-context";
import { useCatData } from "@/app/cat-data-context";
import { BottomNav } from "./navigation/bottom-nav";
import { SidebarNav } from "./navigation/sidebar-nav";
import { Notice } from "./components/notices";
import { PwaUpdateNotice } from "./components/pwa";
import { Button } from "./components/ui/button";

/**
 * 响应式外壳。PC 走侧栏，H5 走固定底栏。
 * 两端都保留完整导航，移动端不是「把侧栏藏起来」。
 */
export function AppShell() {
  const status = useCalculatorStatus();
  const location = useLocation();
  const isFirstRun = location.pathname === "/cat/new";

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-3 rounded-2xl bg-card px-6 py-5 shadow-sm ring-1 ring-border">
          <PawPrint className="size-5 text-primary" aria-hidden />
          正在读取数据
        </div>
      </div>
    );
  }

  if (status === "error") {
    return <DataErrorScreen />;
  }

  // 草稿读不到时先不进任何页面。开始编辑之后自动保存一恢复，
  // 内存里那份草稿就会盖掉存储上的真草稿。
  if (status === "draftBlocked") {
    return <DraftRecoveryScreen />;
  }

  return (
    <div className="min-h-dvh">
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <SidebarNav />
        <div className="flex h-14 items-center gap-2 border-b border-border/70 bg-card/75 px-5 backdrop-blur lg:hidden">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <PawPrint className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">猫咪喂养计算</span>
        </div>
        <main id="main-content" className="mx-auto w-full max-w-[1500px] px-5 pt-7 pb-36 sm:px-8 lg:px-12 lg:pt-10 lg:pb-14">
          <PwaUpdateNotice />
          <StaleDataNotice />
          <Outlet />
        </main>
      </div>
      {!isFirstRun ? <BottomNav /> : null}
    </div>
  );
}

function DataErrorScreen() {
  const { error } = useCatData();
  return (
    <div className="grid min-h-dvh place-items-center px-5 text-sm text-muted-foreground">
      <div className="flex max-w-md flex-col items-start gap-3 rounded-2xl bg-card px-6 py-5 shadow-sm ring-1 ring-border">
        <p className="font-medium text-foreground">数据读取失败</p>
        {error ? <p className="text-xs leading-relaxed">{error}</p> : null}
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          重新载入
        </Button>
      </div>
    </div>
  );
}

/**
 * 草稿读不到时的恢复界面。重试，或者明确接受用新草稿覆盖存储上那份。
 */
function DraftRecoveryScreen() {
  const { draftLoadError, retryDraftLoad, continueWithNewDraft } = useDraftRecovery();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-card px-6 py-6 shadow-sm ring-1 ring-border">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">读不到上次的计算草稿</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {draftLoadError ?? "读取失败。"}
          </p>
        </div>

        {confirming ? (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-xs leading-relaxed text-destructive">
              用新草稿继续会覆盖存储上原来那份草稿，覆盖后找不回来。
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
                取消
              </Button>
              <Button size="sm" variant="destructive" onClick={continueWithNewDraft}>
                确认覆盖
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={retryDraftLoad}>
              重试
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
              用一份新草稿继续
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 写入成功，界面数据没跟着刷新。 */
function StaleDataNotice() {
  const { refreshError } = useCatData();
  if (!refreshError) return null;
  return (
    <div className="mb-6" role="status">
      <Notice
        tone="warning"
        message="改动已经保存，但界面没刷新。重新载入页面才能看到最新数据。"
        action={
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            重新载入
          </Button>
        }
      />
    </div>
  );
}
