import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { Notice } from "@/ui/components/notices";
import { SectionHeading } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  installed: boolean;
  canInstall: boolean;
  installing: boolean;
  installError: string | null;
  install(): Promise<void>;
  offlineAvailable: boolean;
  registrationFailed: boolean;
  needRefresh: boolean;
  updating: boolean;
  updateError: string | null;
  update(): Promise<void>;
  dismissUpdate(): void;
}

const PwaContext = createContext<PwaState | null>(null);

function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("PWA 组件必须放在 PwaProvider 内");
  return context;
}

/** 在路由和本地数据加载之前监听安装事件，切换页面不会丢掉安装入口。 */
export function PwaProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [hasActiveWorker, setHasActiveWorker] = useState(false);
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null;
      setHasActiveWorker(Boolean(registration?.active));
    },
    onRegisterError() {
      setRegistrationFailed(true);
    },
  });

  useEffect(() => {
    function onInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setInstallError(null);
    }
    function onInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallError(null);
    }
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    // 长期保持打开的桌面应用也检查更新；离线检查失败不影响已缓存的版本。
    let lastCheck = 0;
    function checkForUpdate() {
      const registration = registrationRef.current;
      if (!registration || !navigator.onLine || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastCheck < 60_000) return;
      lastCheck = now;
      void registration.update().catch(() => undefined);
    }
    const interval = window.setInterval(checkForUpdate, 60 * 60 * 1000);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  async function install() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      setInstallError("未能打开安装窗口，请使用浏览器菜单中的安装或添加到主屏幕功能。");
    } finally {
      // 浏览器提供的安装事件只能使用一次，取消后等待下一次事件。
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  async function update() {
    if (updating) return;
    setUpdateError(null);
    if (!navigator.onLine) {
      setUpdateError("当前处于离线状态，请联网后再更新。");
      return;
    }
    setUpdating(true);
    try {
      await updateServiceWorker();
    } catch {
      setUpdateError("更新未完成，当前版本仍可使用，请稍后重试。");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <PwaContext.Provider value={{
      installed,
      canInstall: installPrompt !== null,
      installing,
      installError,
      install,
      offlineAvailable: offlineReady || hasActiveWorker,
      registrationFailed,
      needRefresh,
      updating,
      updateError,
      update,
      dismissUpdate() {
        setNeedRefresh(false);
        setUpdateError(null);
      },
    }}>
      {children}
    </PwaContext.Provider>
  );
}

export function PwaUpdateNotice() {
  const pwa = usePwa();
  if (!pwa.needRefresh) return null;

  return (
    <div className="mb-6 flex flex-col gap-2" role="status" aria-live="polite">
      <Notice
        tone="muted"
        message="catFan 有新版本。更新会重新加载已打开的应用页面，请先保存正在填写的内容。"
        action={
          <>
            <Button size="sm" onClick={() => void pwa.update()} disabled={pwa.updating}>
              <RefreshCw className="size-3.5" aria-hidden />
              {pwa.updating ? "正在更新" : "更新并重新打开"}
            </Button>
            <Button size="sm" variant="ghost" onClick={pwa.dismissUpdate} disabled={pwa.updating}>
              稍后
            </Button>
          </>
        }
      />
      {pwa.updateError ? <p className="text-sm text-destructive">{pwa.updateError}</p> : null}
    </div>
  );
}

export function PwaInstallCard() {
  const pwa = usePwa();
  const offlineUnavailable = !window.isSecureContext
    ? "当前地址无法启用离线功能，请通过 HTTPS 地址打开。"
    : !("serviceWorker" in navigator)
      ? "当前浏览器不支持离线功能，可以继续在线使用。"
      : null;

  return (
    <section>
      <SectionHeading title="安装到设备" />
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-5">
          <p className="text-sm">
            {pwa.installed
              ? "已安装，可以从桌面或主屏幕打开 catFan。"
              : "把 catFan 添加到桌面或主屏幕，下次点图标即可打开。"}
          </p>
          {!pwa.installed && pwa.canInstall ? (
            <Button variant="outline" onClick={() => void pwa.install()} disabled={pwa.installing}>
              <Download className="size-4" aria-hidden />
              {pwa.installing ? "正在打开安装窗口" : "安装 catFan"}
            </Button>
          ) : null}
          {!pwa.installed && !pwa.canInstall ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>iPhone / iPad：用 Safari 打开，点分享，再选添加到主屏幕。</p>
              <p>安卓或电脑：在 Chrome / Edge 菜单中选择安装应用或添加到主屏幕。</p>
            </div>
          ) : null}
          {pwa.installError ? <p role="status" className="text-sm text-destructive">{pwa.installError}</p> : null}
          <p className="text-xs text-muted-foreground" role="status">
            {offlineUnavailable ?? (pwa.registrationFailed
              ? "离线功能暂未准备好，请联网后重新打开应用。"
              : pwa.offlineAvailable
                ? "已可离线使用，断网后仍能计算、记录体重和查看历史。"
                : "首次联网打开并完成缓存后，可离线计算和查看记录。")}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
