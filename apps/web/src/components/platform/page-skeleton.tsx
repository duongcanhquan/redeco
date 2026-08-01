/** Skeleton glass dùng chung cho loading.tsx — hiện NGAY khi bấm chuyển trang. */
export function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Đang tải">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-xl bg-glass" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-glass" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="glass rounded-2xl h-28" />
        ))}
      </div>
      <div className="glass rounded-2xl h-72" />
    </div>
  );
}
