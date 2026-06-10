/** 格式化为「更新于 xx」相对时间文案 */
export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '更新于 —';
  }

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return '更新于 刚刚';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `更新于 ${diffMin} 分钟前`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `更新于 ${diffHour} 小时前`;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `更新于 ${month}月${day}日 ${hour}:${minute}`;
}
