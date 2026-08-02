export default function EquipmentLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Đang tải">
      <div className="h-10 w-48 rounded-xl bg-panel/40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-panel/30" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-panel/30" />
    </div>
  );
}
