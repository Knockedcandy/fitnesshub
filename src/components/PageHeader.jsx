export default function PageHeader({ eyebrow, title, description }) {
  return <div className="mb-8"><p className="text-sm font-bold uppercase tracking-[.25em] text-cyan-300">{eyebrow}</p><h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{title}</h1><p className="mt-4 max-w-3xl text-lg text-slate-300">{description}</p></div>;
}
