import { useRef, useState, type ChangeEvent } from "react";
import { Download, FileText, Pencil, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  ALL_MODEL_IDS,
  MODEL_RULES,
  completedMonthsBetween,
  formatKcalRangeText,
  type ModelId,
} from "@/domain";
import { DB_SCHEMA_VERSION } from "@/data";
import { useCatData } from "@/app/cat-data-context";
import { useCalculator } from "@/app/calculator-context";
import { useServices } from "@/app/services-context";
import { systemClock } from "@/app/clock";
import { APP_VERSION } from "@/app/version";
import { localDateOfInstant } from "@/app/selectors";
import {
  buildBackupFile,
  parseBackupFile,
  summarizeBackup,
  toBackupContents,
  type BackupFile,
  type BackupSummary,
} from "@/backup/format";
import { toBackupCsv } from "@/backup/csv";
import { backupFileStem, downloadText } from "@/backup/download";
import { DefinitionList, DefinitionRow } from "@/ui/components/definition-list";
import { Notice, type NoticeProps } from "@/ui/components/notices";
import { PageHeader, SectionHeading } from "@/ui/components/page-header";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import { PwaInstallCard } from "@/ui/components/pwa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";

interface PendingImport {
  file: BackupFile;
  summary: BackupSummary;
}

interface StatusMessage {
  tone: NoticeProps["tone"];
  text: string;
  /** 结果不确定时给一个确认入口，别让用户凭猜继续操作。 */
  action?: "reload";
}

export function DataPage() {
  const navigate = useNavigate();
  const services = useServices();
  const { cat, weights, foods } = useCatData();
  const { draft, modelOutcomes, today } = useCalculator();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  /** 覆盖前先看一眼存储上现在有什么。 */
  const [serverSummary, setServerSummary] = useState<BackupSummary | null>(null);

  const completedMonths = cat ? completedMonthsBetween(cat.birthDate, today) : null;

  async function readBackup(): Promise<BackupFile> {
    // 界面暂时只用第一只猫。
    const cats = await services.cats.list();
    const storedCat = cats[0] ?? null;
    const [storedWeights, storedFoods, storedDraft, storedSnapshots] = await Promise.all([
      storedCat ? services.weights.listByCat(storedCat.id) : Promise.resolve([]),
      services.foods.list(),
      storedCat ? services.drafts.load(storedCat.id) : Promise.resolve(null),
      storedCat ? services.snapshots.listByCat(storedCat.id) : Promise.resolve([]),
    ]);

    const modelRuleVersions: Partial<Record<ModelId, string>> = {};
    for (const modelId of ALL_MODEL_IDS) {
      modelRuleVersions[modelId] = MODEL_RULES[modelId].ruleVersion;
    }

    return buildBackupFile({
      contents: {
        cat: storedCat,
        weights: storedWeights,
        foods: storedFoods,
        draft: storedDraft,
        snapshots: storedSnapshots,
      },
      dbSchemaVersion: DB_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: systemClock.nowInstant(),
      modelRuleVersions,
    });
  }

  async function exportJson() {
    setBusy(true);
    setStatus(null);
    try {
      const file = await readBackup();
      downloadText(
        `${backupFileStem(systemClock.today())}.json`,
        JSON.stringify(file, null, 2),
        "application/json",
      );
      setStatus({ tone: "muted", text: "已导出 JSON 备份。" });
    } catch {
      setStatus({ tone: "danger", text: "导出失败，请重试。" });
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setBusy(true);
    setStatus(null);
    try {
      const file = await readBackup();
      downloadText(
        `${backupFileStem(systemClock.today())}.csv`,
        toBackupCsv(file),
        "text/csv;charset=utf-8",
      );
      setStatus({ tone: "muted", text: "已导出 CSV。" });
    } catch {
      setStatus({ tone: "danger", text: "导出失败，请重试。" });
    } finally {
      setBusy(false);
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 立刻清空，保证同一个文件再选一次也能触发 change。
    event.target.value = "";
    if (!file) return;

    setStatus(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ tone: "danger", text: "读不到这个文件，请重新选择。" });
      return;
    }

    const parsed = parseBackupFile(text);
    if (!parsed.ok) {
      setStatus({ tone: "danger", text: parsed.error });
      return;
    }
    setPending({ file: parsed.file, summary: summarizeBackup(parsed.file) });
    try {
      setServerSummary(summarizeBackup(await readBackup()));
    } catch {
      // 读不到现状不影响导入本身，弹窗里少显示一行。
      setServerSummary(null);
    }
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      await services.backup.replaceAll(toBackupContents(pending.file));
      setPending(null);
      // 整库替换后重新载入，避免内存里还留着旧档案和旧草稿。
      window.location.reload();
    } catch {
      setBusy(false);
      setPending(null);
      // 超时不代表服务端没提交，不能说「原数据未改动」。
      setStatus({
        tone: "danger",
        text: "导入结果不确定，服务器可能已经替换完成。重新载入页面确认当前数据，必要时再导入一次。",
        action: "reload",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="数据管理" />

      <PwaInstallCard />

      <section>
        <SectionHeading
          title="猫咪档案"
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate("/data/cat")}>
              <Pencil className="size-3.5" aria-hidden />
              编辑
            </Button>
          }
        />
        <Card>
          <CardContent className="py-5">
            {cat ? (
              <DefinitionList>
                <DefinitionRow label="名称" value={cat.name} />
                <DefinitionRow label="出生日期" value={cat.birthDate} />
                <DefinitionRow
                  label="年龄"
                  value={completedMonths === null ? "未知" : `${completedMonths} 个月`}
                />
                <DefinitionRow label="品种" value={cat.breed ?? "未记录"} />
              </DefinitionList>
            ) : (
              <p className="text-sm text-muted-foreground">还没有猫咪档案。</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="备份与恢复" />
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            <Notice
              tone="warning"
              message="清除浏览器数据或换设备会让记录不可见，建议定期导出备份。"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void exportJson()} disabled={busy}>
                <Download className="size-4" aria-hidden />
                导出 JSON 备份
              </Button>
              <Button variant="outline" onClick={() => void exportCsv()} disabled={busy}>
                <FileText className="size-4" aria-hidden />
                导出 CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <Upload className="size-4" aria-hidden />
                导入备份
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => void handleFileSelected(event)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              JSON 用于完整恢复，CSV 只用于导出。导入会覆盖服务器上的全部数据。
            </p>
            {status ? (
              <Notice
                tone={status.tone}
                message={status.text}
                action={
                  status.action === "reload" ? (
                    <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                      重新载入
                    </Button>
                  ) : undefined
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="本地数据" />
        <Card>
          <CardContent className="py-5">
            <DefinitionList>
              <DefinitionRow label="体重记录" value={`${weights.length} 条`} />
              <DefinitionRow label="食品" value={`${foods.length} 款`} />
            </DefinitionList>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="当前计算" />
        <Card>
          <CardContent className="py-5">
            <DefinitionList>
              <DefinitionRow label="评估日期" value={draft.input.evaluationDate} />
              <DefinitionRow
                label="计算依据的体重记录"
                value={localDateOfInstant(draft.provenance.recordedAt)}
              />
              {modelOutcomes.map((outcome) => (
                <DefinitionRow
                  key={outcome.modelId}
                  label={outcome.displayName}
                  value={
                    outcome.status === "ok" && outcome.range
                      ? formatKcalRangeText(outcome.range, outcome.rounding)
                      : "暂不可用"
                  }
                />
              ))}
              <DefinitionRow label="已启用模型" value={draft.enabledModelIds.join("、")} />
            </DefinitionList>
          </CardContent>
        </Card>
      </section>

      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>用这份备份覆盖服务器上的数据？</DialogTitle>
            <DialogDescription>
              {serverSummary
                ? `服务器上现在有 ${serverSummary.weights} 条体重、${serverSummary.foods} 款食品、${serverSummary.snapshots} 条计算快照，会被这份文件整体替换。`
                : "服务器上的猫咪、体重、食品和计算快照都会被这份文件整体替换。"}
              不做合并，这一步无法撤销。
            </DialogDescription>
          </DialogHeader>
          {pending ? (
            <DefinitionList>
              <DefinitionRow label="猫咪" value={pending.summary.catName ?? "无"} />
              <DefinitionRow label="体重记录" value={`${pending.summary.weights} 条`} />
              <DefinitionRow label="食品" value={`${pending.summary.foods} 款`} />
              <DefinitionRow label="计算快照" value={`${pending.summary.snapshots} 条`} />
              <DefinitionRow
                label="导出时间"
                value={pending.summary.exportedAt || "未记录"}
              />
            </DefinitionList>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>
              取消
            </Button>
            <Button onClick={() => void confirmImport()} disabled={busy}>
              {busy ? "正在导入" : "覆盖并导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
