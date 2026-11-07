import GlassCard from './GlassCard';
export default function FeatureCard({ icon:Icon, title, text }){return <GlassCard className="transition hover:-translate-y-1"><Icon className="mb-4 text-cyan-300"/><h3 className="text-xl font-bold">{title}</h3><p className="mt-2 text-slate-300">{text}</p></GlassCard>}
