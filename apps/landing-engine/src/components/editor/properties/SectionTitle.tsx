export default function SectionTitle({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
      <Icon className="w-3.5 h-3.5 text-slate-400" />
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</label>
    </div>
  );
}
