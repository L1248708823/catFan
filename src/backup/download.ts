/** 触发浏览器下载。文件名里带日期，方便多次备份并存。 */
export function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // 立刻撤销会让部分浏览器拿不到数据，放到下一个任务里回收。
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** 形如 "cat-feeding-2026-10-14"，用于拼备份文件名。 */
export function backupFileStem(today: string): string {
  return `cat-feeding-${today}`;
}
