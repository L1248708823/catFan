import { useCallback, useEffect, useState } from "react";

import type { SnapshotRecord } from "@/data";
import { useCatData } from "./cat-data-context";
import { useServices } from "./services-context";

export type SnapshotsStatus = "loading" | "ready" | "error";

export interface SnapshotsValue {
  snapshots: SnapshotRecord[];
  status: SnapshotsStatus;
  reload: () => Promise<void>;
  /** 删掉一条用户自己存错的快照。不可撤销。 */
  remove: (id: string) => Promise<void>;
}

/** 读取已保存的计算快照。历史只渲染保存时的副本，永不重算。 */
export function useSnapshots(): SnapshotsValue {
  const services = useServices();
  const { cat } = useCatData();
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [status, setStatus] = useState<SnapshotsStatus>("loading");

  const reload = useCallback(async () => {
    const list = cat ? await services.snapshots.listByCat(cat.id) : [];
    setSnapshots(list);
    setStatus("ready");
  }, [services, cat]);

  const remove = useCallback(
    async (id: string) => {
      await services.snapshots.delete(id);
      try {
        await reload();
      } catch {
        // 删除已经成功，只是列表没重新拉回来。本地先摘掉。
        setSnapshots((current) => current.filter((snapshot) => snapshot.id !== id));
      }
    },
    [reload, services],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return { snapshots, status, reload, remove };
}
