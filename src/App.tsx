import { useEffect, useMemo, useRef, useState } from 'react';
import { apply, initialState, progress, type Op, type State, type Store, type Stage } from '../shared/model.ts';

const uid = () => Math.random().toString(36).slice(2, 10);
const fa = (n: number) => n.toLocaleString('fa-IR');
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'همین الان'; if (m < 60) return `${fa(m)} دقیقه پیش`;
  const h = Math.round(m / 60); if (h < 24) return `${fa(h)} ساعت پیش`;
  return new Date(t).toLocaleDateString('fa-IR');
};
const PALETTE = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-teal-500', 'bg-orange-500'];
const color = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

type Status = 'done' | 'active' | 'new';
const statusOf = (x: Store): Status => { const p = progress(x); return p.total && p.done === p.total ? 'done' : p.done ? 'active' : 'new'; };
const STATUS: Record<Status, { label: string; cls: string }> = {
  done: { label: 'آماده بهره‌برداری', cls: 'bg-emerald-100 text-emerald-700' },
  active: { label: 'در حال راه‌اندازی', cls: 'bg-indigo-100 text-indigo-700' },
  new: { label: 'شروع نشده', cls: 'bg-slate-100 text-slate-500' },
};

function useStore() {
  const [state, setState] = useState<State>(initialState());
  const [ok, setOk] = useState(true);
  const pending = useRef(0);
  const load = () => fetch('/api/state').then((r) => r.json()).then((s) => { if (!pending.current) setState(s); setOk(true); }).catch(() => setOk(false));
  useEffect(() => { load(); const i = setInterval(load, 4000); return () => clearInterval(i); }, []);
  const dispatch = (op: Op) => {
    setState((s) => apply(s, op)); pending.current++;
    fetch('/api/op', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(op) })
      .then((r) => r.json()).then((s) => { if (--pending.current === 0) setState(s); setOk(true); })
      .catch(() => { pending.current--; setOk(false); });
  };
  return { state, dispatch, ok };
}

function Ring({ pct, size = 44 }: { pct: number; size?: number }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  const stroke = pct === 100 ? '#10b981' : pct >= 50 ? '#6366f1' : pct > 0 ? '#f59e0b' : '#cbd5e1';
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: 'stroke-dashoffset .5s' }} />
      <text x="50%" y="50%" className="rotate-90 origin-center" textAnchor="middle" dominantBaseline="central" fontSize={size / 4} fontWeight="700" fill="#334155">
        {fa(pct)}٪</text>
    </svg>
  );
}

function Check({ on, title, idx, onClick, current }: { on: boolean; title: string; idx: number; onClick: () => void; current?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className={`group relative grid place-items-center size-9 rounded-xl text-xs font-bold transition-all cursor-pointer
      ${on ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 pop' : current ? 'bg-white text-indigo-600 ring-2 ring-indigo-400 ring-offset-1' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>
      {on ? <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg> : fa(idx + 1)}
      <span className="pointer-events-none absolute bottom-full mb-2 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 group-hover:opacity-100 transition">{title}{on ? ' ✓' : ''}</span>
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  return <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 backdrop-blur-sm fade-in p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">{children}</div></div>;
}
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition';
const btn = 'rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer disabled:opacity-40';

function StoreForm({ initial, owners, onSave, onClose }: { initial?: Store; owners: string[]; onSave: (n: string, o: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? ''); const [owner, setOwner] = useState(initial?.owner ?? '');
  return <Modal onClose={onClose}>
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim() && owner.trim()) { onSave(name.trim(), owner.trim()); onClose(); } }} className="space-y-4">
      <h2 className="text-lg font-extrabold">{initial ? 'ویرایش فروشگاه' : 'فروشگاه جدید'}</h2>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-500">نام فروشگاه</span>
        <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً شعبه ونک" /></label>
      <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-500">مسئول</span>
        <input list="owners" className={inputCls} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="نام مسئول راه‌اندازی" />
        <datalist id="owners">{owners.map((o) => <option key={o} value={o} />)}</datalist></label>
      <div className="flex gap-2 pt-2">
        <button disabled={!name.trim() || !owner.trim()} className={`${btn} flex-1 bg-indigo-600 text-white hover:bg-indigo-700`}>ذخیره</button>
        <button type="button" onClick={onClose} className={`${btn} bg-slate-100 hover:bg-slate-200`}>انصراف</button>
      </div>
    </form></Modal>;
}

function StageEditor({ stages, scope, dispatch, storeId }: { stages: Stage[]; scope: string; dispatch: (o: Op) => void; storeId: string | null }) {
  const [title, setTitle] = useState('');
  return <div className="space-y-2">
    <p className="text-xs text-slate-500">تغییرات روی <b className="text-slate-700">{scope}</b> اعمال می‌شود.</p>
    <ul className="space-y-1.5 max-h-72 overflow-auto">
      {stages.map((g, i) => <li key={g.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5">
        <span className="grid size-6 place-items-center rounded-lg bg-white text-[11px] font-bold text-slate-400">{fa(i + 1)}</span>
        <input className="flex-1 bg-transparent text-sm outline-none focus:text-indigo-700" defaultValue={g.title}
          onBlur={(e) => e.target.value.trim() && e.target.value !== g.title && dispatch({ t: 'renameStage', storeId, stageId: g.id, title: e.target.value.trim() })} />
        <button onClick={() => confirm(`مرحله «${g.title}» حذف شود؟`) && dispatch({ t: 'removeStage', storeId, stageId: g.id })}
          className="rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 cursor-pointer" title="حذف">✕</button>
      </li>)}
    </ul>
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { dispatch({ t: 'addStage', storeId, id: 'g' + uid(), title: title.trim() }); setTitle(''); } }}>
      <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان مرحله جدید…" />
      <button className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap`}>+ افزودن</button>
    </form>
  </div>;
}

function Drawer({ store, dispatch, owners, onClose }: { store: Store; dispatch: (o: Op) => void; owners: string[]; onClose: () => void }) {
  const [note, setNote] = useState(''); const [tab, setTab] = useState<'steps' | 'edit'>('steps'); const [edit, setEdit] = useState(false);
  const p = progress(store); const st = statusOf(store);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  return <div className="fixed inset-0 z-30 bg-slate-900/30 fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <aside className="slide-in absolute inset-y-0 left-0 flex w-full max-w-lg flex-col bg-white shadow-2xl">
      <header className="flex items-center gap-4 border-b border-slate-100 p-5">
        <Ring pct={p.pct} size={60} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-extrabold">{store.name}</h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS[st].cls}`}>{STATUS[st].label}</span>
            <span>مسئول: <b className="text-slate-700">{store.owner}</b></span></div>
        </div>
        <button onClick={() => setEdit(true)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer" title="ویرایش">✎</button>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 cursor-pointer">✕</button>
      </header>
      <div className="flex-1 overflow-auto p-5 space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">مراحل <span className="text-slate-400 font-normal text-sm">({fa(p.done)} از {fa(p.total)})</span></h3>
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs">
              {(['steps', 'edit'] as const).map((t) => <button key={t} onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1 font-semibold cursor-pointer ${tab === t ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{t === 'steps' ? 'چک‌لیست' : 'مدیریت مراحل'}</button>)}
            </div>
          </div>
          {tab === 'steps' ? <ul className="space-y-1.5">
            {store.stages.map((g, i) => { const on = !!store.done[g.id]; return <li key={g.id}>
              <button onClick={() => dispatch({ t: 'toggle', storeId: store.id, stageId: g.id, at: Date.now() })}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-right transition cursor-pointer ${on ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40'}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${on ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{on ? '✓' : fa(i + 1)}</span>
                <span className={`flex-1 text-sm ${on ? 'text-emerald-800' : 'text-slate-700'}`}>{g.title}</span>
                {on && <span className="text-[11px] text-emerald-600">{ago(store.done[g.id])}</span>}
              </button></li>; })}
          </ul> : <StageEditor stages={store.stages} scope={`فقط همین فروشگاه`} dispatch={dispatch} storeId={store.id} />}
        </section>
        <section>
          <h3 className="mb-3 font-bold">یادداشت‌ها</h3>
          <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) { dispatch({ t: 'addNote', storeId: store.id, id: uid(), text: note.trim(), at: Date.now() }); setNote(''); } }}>
            <textarea className={`${inputCls} min-h-20 resize-none`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت جدید… (Ctrl+Enter برای ثبت)"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) (e.currentTarget.form as HTMLFormElement).requestSubmit(); }} />
            <button disabled={!note.trim()} className={`${btn} mt-2 w-full bg-amber-400 text-amber-950 hover:bg-amber-500`}>ثبت یادداشت</button>
          </form>
          <ul className="mt-4 space-y-2">
            {store.notes.map((n) => <li key={n.id} className="group rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{n.text}</p>
              <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>{ago(n.at)}</span>
                <button onClick={() => confirm('یادداشت حذف شود؟') && dispatch({ t: 'removeNote', storeId: store.id, id: n.id })} className="opacity-0 group-hover:opacity-100 hover:text-rose-500 cursor-pointer">حذف</button></div>
            </li>)}
            {!store.notes.length && <li className="text-center text-sm text-slate-400 py-4">هنوز یادداشتی ثبت نشده</li>}
          </ul>
        </section>
      </div>
      <footer className="border-t border-slate-100 p-4">
        <button onClick={() => { if (confirm(`فروشگاه «${store.name}» حذف شود؟`)) { dispatch({ t: 'removeStore', id: store.id }); onClose(); } }}
          className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer">حذف فروشگاه</button>
      </footer>
    </aside>
    {edit && <StoreForm initial={store} owners={owners} onClose={() => setEdit(false)} onSave={(name, owner) => dispatch({ t: 'editStore', id: store.id, name, owner })} />}
  </div>;
}

export default function App() {
  const { state, dispatch, ok } = useStore();
  const [q, setQ] = useState(''); const [owner, setOwner] = useState(''); const [filter, setFilter] = useState<Status | 'all'>('all');
  const [sort, setSort] = useState<'new' | 'progress' | 'name'>('new');
  const [openId, setOpenId] = useState<string | null>(null); const [adding, setAdding] = useState(false); const [stagesOpen, setStagesOpen] = useState(false);

  const owners = useMemo(() => [...new Set(state.stores.map((s) => s.owner))].sort(), [state.stores]);
  const counts = useMemo(() => {
    const c = { all: state.stores.length, done: 0, active: 0, new: 0 } as Record<Status | 'all', number>;
    state.stores.forEach((s) => c[statusOf(s)]++); return c;
  }, [state.stores]);
  const avg = state.stores.length ? Math.round(state.stores.reduce((a, s) => a + progress(s).pct, 0) / state.stores.length) : 0;
  const stageStats = state.template.map((g) => ({ ...g, n: state.stores.filter((s) => s.done[g.id]).length }));

  const list = useMemo(() => state.stores
    .filter((s) => (filter === 'all' || statusOf(s) === filter) && (!owner || s.owner === owner) &&
      (!q || (s.name + s.owner + s.notes.map((n) => n.text).join()).includes(q)))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'fa') : sort === 'progress' ? progress(a).pct - progress(b).pct : b.createdAt - a.createdAt),
    [state.stores, q, owner, filter, sort]);
  const open = state.stores.find((s) => s.id === openId);
  const toggle = (s: Store, g: Stage) => dispatch({ t: 'toggle', storeId: s.id, stageId: g.id, at: Date.now() });

  return <div className="min-h-screen">
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-5 py-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5 9-11" /></svg></div>
        <div className="flex-1"><h1 className="font-extrabold leading-tight">راه‌اندازی فروشگاه‌ها روی اوانی</h1>
          <p className="text-xs text-slate-500">آوان‌تک · پیگیری اتصال فروشگاه‌های جدید</p></div>
        <span className={`hidden sm:flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span className={`size-2 rounded-full ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />{ok ? 'همگام' : 'قطع ارتباط'}</span>
        <button onClick={() => setStagesOpen(true)} className={`${btn} bg-slate-100 hover:bg-slate-200`}>⚙ مراحل</button>
        <button onClick={() => setAdding(true)} className={`${btn} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`}>+ فروشگاه جدید</button>
      </div>
    </header>

    <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([['all', 'همه فروشگاه‌ها', 'from-slate-700 to-slate-900'], ['active', 'در حال راه‌اندازی', 'from-indigo-500 to-violet-600'], ['done', 'آماده بهره‌برداری', 'from-emerald-500 to-teal-600'], ['new', 'شروع نشده', 'from-slate-300 to-slate-400']] as const).map(([k, l, g]) =>
          <button key={k} onClick={() => setFilter(k)} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${g} p-4 text-right text-white transition cursor-pointer ${filter === k ? 'ring-4 ring-offset-2 ring-indigo-200 scale-[1.02]' : 'opacity-90 hover:opacity-100'}`}>
            <div className="text-xs opacity-80">{l}</div><div className="mt-1 text-3xl font-black">{fa(counts[k])}</div>
            {k === 'all' && <div className="absolute left-4 top-4 text-xs opacity-80">میانگین پیشرفت {fa(avg)}٪</div>}
          </button>)}
      </section>

      {state.stores.length > 0 && <section className="rounded-3xl border border-slate-200/70 bg-white p-4">
        <div className="mb-3 text-xs font-semibold text-slate-500">گلوگاه‌ها — چند فروشگاه هر مرحله را پاس کرده‌اند</div>
        <div className="flex gap-1.5">{stageStats.map((g, i) => { const pct = state.stores.length ? g.n / state.stores.length : 0; return (
          <div key={g.id} className="group relative flex-1" title={`${g.title}: ${fa(g.n)} از ${fa(state.stores.length)}`}>
            <div className="h-14 overflow-hidden rounded-xl bg-slate-100 flex flex-col justify-end">
              <div className="bg-gradient-to-t from-indigo-500 to-violet-400 transition-all duration-500" style={{ height: `${pct * 100}%` }} /></div>
            <div className="mt-1 text-center text-[11px] text-slate-500"><b className="text-slate-700">{fa(i + 1)}</b> · {fa(g.n)}</div>
          </div>); })}</div>
      </section>}

      <section className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-60">
          <input className={`${inputCls} bg-white pr-10`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در نام، مسئول یا یادداشت‌ها…" />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span></div>
        <select className={`${inputCls} w-auto bg-white`} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">همه مسئولین</option>{owners.map((o) => <option key={o}>{o}</option>)}</select>
        <select className={`${inputCls} w-auto bg-white`} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="new">جدیدترین</option><option value="progress">کمترین پیشرفت</option><option value="name">الفبایی</option></select>
      </section>

      <section className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white">
        <div className="min-w-[1100px]">
          <div className="sticky top-0 flex items-center gap-4 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold text-slate-500">
            <div className="w-64 shrink-0">فروشگاه</div>
            <div className="flex flex-1 gap-1.5">مراحل <span className="font-normal">(برای پاس کردن کلیک کنید · نشانگر را روی هر مرحله نگه دارید)</span></div>
            <div className="w-72 shrink-0">آخرین یادداشت</div>
          </div>
          {list.map((s) => { const p = progress(s); const cur = s.stages.find((g) => !s.done[g.id]); const n = s.notes[0];
            return <div key={s.id} className="flex items-center gap-4 border-b border-slate-50 px-4 py-3 transition hover:bg-indigo-50/30">
              <button onClick={() => setOpenId(s.id)} className="flex w-64 shrink-0 items-center gap-3 text-right cursor-pointer">
                <Ring pct={p.pct} />
                <div className="min-w-0">
                  <div className="truncate font-bold text-slate-800 hover:text-indigo-600">{s.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold text-white ${color(s.owner)}`}>{s.owner[0]}</span>
                    <span className="truncate">{s.owner}</span></div>
                </div></button>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5">{s.stages.map((g, i) => <Check key={g.id} on={!!s.done[g.id]} title={g.title} idx={i} current={g === cur} onClick={() => toggle(s, g)} />)}</div>
                <div className="mt-1.5 truncate text-[11px] text-slate-500">{cur ? <>مرحله فعلی: <b className="text-indigo-600">{cur.title}</b></> : <b className="text-emerald-600">🎉 همه مراحل تکمیل شد</b>}</div>
              </div>
              <button onClick={() => setOpenId(s.id)} className="w-72 shrink-0 text-right cursor-pointer">
                {n ? <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <p className="line-clamp-2 text-xs leading-6 text-slate-700">{n.text}</p>
                  <div className="text-[10px] text-slate-400">{ago(n.at)}{s.notes.length > 1 && ` · ${fa(s.notes.length - 1)} یادداشت دیگر`}</div></div>
                  : <span className="text-xs text-slate-300 hover:text-amber-500">+ افزودن یادداشت</span>}
              </button>
            </div>; })}
          {!list.length && <div className="py-20 text-center">
            <div className="text-5xl">🏪</div>
            <p className="mt-3 text-slate-500">{state.stores.length ? 'فروشگاهی با این فیلتر پیدا نشد' : 'هنوز فروشگاهی اضافه نشده'}</p>
            {!state.stores.length && <button onClick={() => setAdding(true)} className={`${btn} mt-4 bg-indigo-600 text-white`}>+ اولین فروشگاه</button>}
          </div>}
        </div>
      </section>
    </main>

    {adding && <StoreForm owners={owners} onClose={() => setAdding(false)} onSave={(name, ow) => dispatch({ t: 'addStore', id: uid(), name, owner: ow, at: Date.now() })} />}
    {stagesOpen && <Modal onClose={() => setStagesOpen(false)}><h2 className="mb-3 text-lg font-extrabold">مراحل عمومی</h2>
      <StageEditor stages={state.template} scope="همه فروشگاه‌ها" dispatch={dispatch} storeId={null} />
      <button onClick={() => setStagesOpen(false)} className={`${btn} mt-4 w-full bg-slate-100`}>بستن</button></Modal>}
    {open && <Drawer store={open} dispatch={dispatch} owners={owners} onClose={() => setOpenId(null)} />}
  </div>;
}
