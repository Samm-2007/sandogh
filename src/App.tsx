import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SignList } from './Sign.tsx';
import { apply, initialState, progress, isLocked, signRoleFor, type Op, type State, type Store, type Stage } from '../shared/model.ts';

/* ───────── helpers ───────── */
const uid = () => Math.random().toString(36).slice(2, 10);
const fa = (n: number) => n.toLocaleString('fa-IR');
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'همین الان'; if (m < 60) return `${fa(m)} دقیقه پیش`;
  const h = Math.round(m / 60); if (h < 24) return `${fa(h)} ساعت پیش`;
  const d = Math.round(h / 24); if (d < 7) return `${fa(d)} روز پیش`;
  return new Date(t).toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
};
const HUES = [12, 32, 150, 190, 220, 262, 300, 340];
const PALETTE = [220, 32, 150, 340, 262, 190, 12, 300, 95, 245];
let ownerIdx: Record<string, number> = {};
const setOwners = (list: string[]) => { ownerIdx = Object.fromEntries(list.map((o, i) => [o, i])); };
const hue = (s: string) => { const i = ownerIdx[s.trim()]; return i !== undefined ? PALETTE[i % PALETTE.length] : HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]; };
const OwnerBadge = ({ name }: { name: string }) => <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
  style={{ background: `oklch(0.95 0.04 ${hue(name)})`, color: `oklch(0.45 0.14 ${hue(name)})` }}>{name}</span>;
const lastActivity = (s: Store) => Math.max(s.createdAt, ...Object.values(s.done), ...s.notes.map((n) => n.at));

type Status = 'live' | 'doing' | 'idle';
const statusOf = (s: Store): Status => { const p = progress(s); return p.total && p.done === p.total ? 'live' : p.done ? 'doing' : 'idle'; };
const STATUS = {
  live: { label: 'متصل شد', dot: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  doing: { label: 'در حال اتصال', dot: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50' },
  idle: { label: 'شروع نشده', dot: 'bg-stone-300', text: 'text-stone-500', soft: 'bg-stone-100' },
} as const;

/* ───────── data sync ───────── */
function useData() {
  const [state, setState] = useState<State>(initialState());
  const [online, setOnline] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef(0);
  useEffect(() => {
    const load = () => fetch('/api/state').then((r) => r.json())
      .then((s) => { if (!pending.current) setState(s); setOnline(true); setLoaded(true); }).catch(() => setOnline(false));
    load(); const i = setInterval(load, 4000); return () => clearInterval(i);
  }, []);
  const dispatch = (op: Op) => {
    setState((s) => apply(s, op)); pending.current++;
    fetch('/api/op', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(op) })
      .then((r) => r.json()).then((s) => { if (--pending.current === 0) setState(s); setOnline(true); })
      .catch(() => { pending.current--; setOnline(false); });
  };
  return { state, dispatch, online, loaded };
}

/* ───────── primitives ───────── */
const I = {
  check: <path d="M4.5 12.5l4.5 4.5L19.5 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>,
  note: <><path d="M5 4h14v12l-4 4H5z" /><path d="M15 20v-4h4" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  pen: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  arrow: <path d="M15 6l-6 6 6 6" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  sort: <path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3" />,
};
const Icon = ({ d, className = 'size-4', w = 2 }: { d: ReactNode; className?: string; w?: number }) =>
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{d}</svg>;

const Avatar = ({ name, size = 'size-6 text-[11px]' }: { name: string; size?: string }) =>
  <span className={`${size} grid shrink-0 place-items-center rounded-full font-bold text-white`}
    style={{ background: `oklch(0.62 0.14 ${hue(name)})` }}>{name.trim()[0]}</span>;

const Bar = ({ pct, className = '' }: { pct: number; className?: string }) =>
  <div className={`h-1.5 overflow-hidden rounded-full bg-stone-200/80 ${className}`}>
    <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-ink'}`} style={{ width: `${pct}%` }} /></div>;

const field = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14px] outline-none placeholder:text-stone-400 transition focus:border-stone-400 focus:ring-4 focus:ring-stone-200/60';
const btnDark = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-stone-800 active:scale-[.98] disabled:opacity-30 cursor-pointer';
const btnGhost = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 active:scale-[.98] cursor-pointer';

function useEsc(fn: () => void) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && fn(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
}
function Dialog({ title, sub, children, onClose }: { title: string; sub?: string; children: ReactNode; onClose: () => void }) {
  useEsc(onClose);
  return <div className="fade fixed inset-0 z-50 grid items-end bg-stone-900/25 sm:place-items-center sm:p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="rise w-full max-h-[92dvh] overflow-auto rounded-t-[24px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-md sm:rounded-[22px] sm:p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/.35)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 className="text-[17px] font-extrabold tracking-tight">{title}</h2>{sub && <p className="mt-1 text-[13px] text-stone-500">{sub}</p>}</div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"><Icon d={I.x} /></button>
      </div>{children}</div></div>;
}

function Ring({ pct }: { pct: number }) {
  const r = 14, c = 2 * Math.PI * r;
  return <div className="relative grid size-9 shrink-0 place-items-center">
    <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r={r} fill="none" stroke="#e7e5e4" strokeWidth="3.5" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={pct === 100 ? '#10b981' : '#0b0d12'} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: 'stroke-dashoffset .7s' }} /></svg>
    <span className="text-[10px] font-black tabular-nums">{fa(pct)}</span></div>;
}

/* ───────── store form ───────── */
function StoreForm({ initial, owners, onSave, onClose }: { initial?: Store; owners: string[]; onSave: (n: string, o: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? ''); const [owner, setOwner] = useState(initial?.owner ?? '');
  const ok = name.trim() && owner.trim();
  return <Dialog title={initial ? 'ویرایش فروشگاه' : 'افزودن فروشگاه'} sub={initial ? undefined : 'مراحل پیش‌فرض به‌صورت خودکار اضافه می‌شوند.'} onClose={onClose}>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ok) { onSave(name.trim(), owner.trim()); onClose(); } }}>
      <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-stone-500">نام فروشگاه</span>
        <input autoFocus className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً هایپر مادر — شعبه پاسداران" /></label>
      <div><span className="mb-1.5 block text-[12px] font-semibold text-stone-500">مسئول راه‌اندازی</span>
        <input className={field} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="نام و نام خانوادگی" />
        {owners.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{owners.map((o) =>
          <button type="button" key={o} onClick={() => setOwner(o)}
            className={`flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 text-[12px] transition cursor-pointer ${owner === o ? 'border-ink bg-ink text-white' : 'border-stone-200 hover:border-stone-400'}`}>
            <Avatar name={o} size="size-5 text-[10px]" />{o}</button>)}</div>}
      </div>
      <div className="flex gap-2 pt-2"><button disabled={!ok} className={`${btnDark} flex-1`}>{initial ? 'ذخیره تغییرات' : 'افزودن فروشگاه'}</button>
        <button type="button" onClick={onClose} className={btnGhost}>انصراف</button></div>
    </form></Dialog>;
}

/* ───────── stage manager ───────── */
function StageManager({ stages, storeId, dispatch, hint }: { stages: Stage[]; storeId: string | null; dispatch: (o: Op) => void; hint: string }) {
  const [title, setTitle] = useState('');
  return <div>
    <div className="mb-3 rounded-xl bg-stone-100 px-3 py-2 text-[12px] text-stone-600">{hint}</div>
    <ol className="max-h-[50vh] space-y-1 overflow-auto">
      {stages.map((g, i) => <li key={g.id} className="group flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-stone-50">
        <span className="w-6 text-center text-[12px] font-bold tabular-nums text-stone-300">{fa(i + 1)}</span>
        <input defaultValue={g.title} className="flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-stone-200"
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== g.title) dispatch({ t: 'renameStage', storeId, stageId: g.id, title: v }); }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        <button onClick={() => confirm(`مرحله «${g.title}» حذف شود؟`) && dispatch({ t: 'removeStage', storeId, stageId: g.id })}
          className="rounded-lg p-1.5 text-stone-300 transition sm:opacity-0 sm:group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Icon d={I.trash} /></button>
      </li>)}
    </ol>
    <form className="mt-3 flex gap-2 border-t border-stone-100 pt-3" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { dispatch({ t: 'addStage', storeId, id: 'g' + uid(), title: title.trim() }); setTitle(''); } }}>
      <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مرحله جدید…" />
      <button disabled={!title.trim()} className={btnDark}><Icon d={I.plus} /></button>
    </form>
  </div>;
}

/* ───────── cell ───────── */
function Cell({ on, at, label, onClick, next, locked }: { on: boolean; at?: number; label: string; onClick: () => void; next?: boolean; locked?: boolean }) {
  return <button onClick={onClick} title={`${label}${on && at ? ' · ' + ago(at) : ''}`}
    className={`group/c relative mx-auto grid size-9 place-items-center rounded-[11px] transition-all duration-150 cursor-pointer active:scale-90
    ${on ? 'bg-emerald-500 text-white shadow-[inset_0_-2px_0_rgb(0_0_0/.12)] hover:bg-emerald-600'
        : next ? 'border-[1.5px] border-dashed border-stone-400 bg-white hover:border-emerald-500 hover:bg-emerald-50'
          : 'border border-stone-200 bg-white hover:border-emerald-400 hover:bg-emerald-50'}`}>
    {on ? <span className="tick"><Icon d={I.check} w={3} /></span>
      : locked ? <span className="text-amber-500"><Icon d={I.lock} className="size-3.5" /></span>
      : <span className="text-emerald-500 opacity-0 transition group-hover/c:opacity-100"><Icon d={I.check} w={2.5} /></span>}
  </button>;
}

/* ───────── drawer ───────── */
function Drawer({ store, owners, dispatch, onClose }: { store: Store; owners: string[]; dispatch: (o: Op) => void; onClose: () => void }) {
  const [note, setNote] = useState(''); const [mode, setMode] = useState<'list' | 'manage'>('list'); const [editing, setEditing] = useState(false); const [signRole, setSignRole] = useState<'manager' | 'cashier' | null>(null);
  const p = progress(store); const st = STATUS[statusOf(store)];
  useEsc(onClose);
  const addNote = () => { if (note.trim()) { dispatch({ t: 'addNote', storeId: store.id, id: uid(), text: note.trim(), at: Date.now() }); setNote(''); } };
  return <div className="fade fixed inset-0 z-40 bg-stone-900/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <aside className="drawer absolute inset-0 flex w-full flex-col overflow-hidden bg-white sm:inset-y-2 sm:left-2 sm:right-auto sm:w-[min(560px,calc(100%-16px))] sm:rounded-[22px] bg-white shadow-[0_30px_80px_-20px_rgb(0_0_0/.4)]">
      <header className="border-b border-stone-100 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${st.soft} ${st.text}`}><span className={`size-1.5 rounded-full ${st.dot}`} />{st.label}</span>
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer" title="ویرایش"><Icon d={I.pen} /></button>
            <button onClick={() => { if (confirm(`«${store.name}» حذف شود؟`)) { dispatch({ t: 'removeStore', id: store.id }); onClose(); } }} className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer" title="حذف"><Icon d={I.trash} /></button>
            <button onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"><Icon d={I.x} /></button>
          </div>
        </div>
        <h2 className="text-[24px] font-black leading-tight tracking-tight">{store.name}</h2>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-stone-500"><Avatar name={store.owner} /><span className="font-semibold text-stone-700">{store.owner}</span><span className="text-stone-300">·</span><span>از {ago(store.createdAt)}</span></div>
        <div className="mt-5 flex items-end gap-4">
          <div className="text-[40px] font-black leading-none tabular-nums tracking-tight">{fa(p.pct)}<span className="text-[20px] text-stone-300">٪</span></div>
          <div className="flex-1 pb-2"><div className="mb-1.5 text-[12px] text-stone-500">{fa(p.done)} از {fa(p.total)} مرحله انجام شده</div><Bar pct={p.pct} /></div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <section className="px-5 py-5 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-stone-500">مراحل</h3>
            <button onClick={() => setMode(mode === 'list' ? 'manage' : 'list')} className="text-[12px] font-semibold text-stone-500 underline-offset-4 hover:text-ink hover:underline cursor-pointer">
              {mode === 'list' ? 'ویرایش مراحل این فروشگاه' : 'بازگشت به چک‌لیست'}</button>
          </div>
          {mode === 'manage' ? <StageManager stages={store.stages} storeId={store.id} dispatch={dispatch} hint="این تغییرات فقط روی همین فروشگاه اعمال می‌شود." />
            : <ol className="relative">
              {store.stages.map((g, i) => { const on = !!store.done[g.id]; const last = i === store.stages.length - 1;
                return <li key={g.id} className="relative">
                  {!last && <span className={`absolute right-[17px] top-9 h-[calc(100%-24px)] w-0.5 rounded-full ${on ? 'bg-emerald-200' : 'bg-stone-100'}`} />}
                  <button onClick={() => !on && isLocked(store, g) ? setSignRole(signRoleFor(g)) : dispatch({ t: 'toggle', storeId: store.id, stageId: g.id, at: Date.now() })}
                    className="group flex w-full items-center gap-3 rounded-2xl py-1.5 pl-2 text-right transition hover:bg-stone-50 cursor-pointer">
                    <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2 transition ${on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-200 bg-white text-stone-300 group-hover:border-emerald-400 group-hover:text-emerald-500'}`}>
                      {on ? <span className="tick"><Icon d={I.check} w={3} /></span> : isLocked(store, g) ? <Icon d={I.lock} /> : <span className="text-[12px] font-bold tabular-nums">{fa(i + 1)}</span>}</span>
                    <span className={`flex-1 text-[14px] ${on ? 'text-stone-400 line-through decoration-stone-300' : 'font-medium text-stone-800'}`}>{g.title}</span>
                    {on ? <span className="text-[11px] text-stone-400">{ago(store.done[g.id])}</span> : isLocked(store, g) && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">نیاز به امضا</span>}
                  </button></li>; })}
            </ol>}
        </section>

        <SignList store={store} dispatch={dispatch} role={signRole} onRole={setSignRole} />
        <section className="border-t border-stone-100 bg-stone-50/60 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
          <h3 className="mb-3 text-[13px] font-bold text-stone-500">یادداشت‌ها {store.notes.length > 0 && <span className="text-stone-400">· {fa(store.notes.length)}</span>}</h3>
          <div className="rounded-2xl border border-stone-200 bg-white p-1.5 focus-within:border-stone-400 focus-within:ring-4 focus-within:ring-stone-200/60 transition">
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مشکل، پیگیری، یا هر نکته‌ای…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              className="block w-full resize-none bg-transparent px-2.5 py-2 text-[14px] leading-7 outline-none placeholder:text-stone-400" />
            <div className="flex items-center justify-between gap-2 px-2 pb-1"><span className="sm:hidden" /><span className="hidden text-[11px] text-stone-400 sm:inline">Enter ثبت · Shift+Enter خط جدید</span>
              <button onClick={addNote} disabled={!note.trim()} className={`${btnDark} px-3 py-1.5`}>ثبت</button></div>
          </div>
          <ul className="mt-4 space-y-2">
            {store.notes.map((n) => <li key={n.id} className="group rise rounded-2xl border border-stone-200/70 bg-white px-4 py-3">
              <p className="whitespace-pre-wrap text-[14px] leading-7 text-stone-800">{n.text}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400"><span>{ago(n.at)}</span>
                <button onClick={() => confirm('یادداشت حذف شود؟') && dispatch({ t: 'removeNote', storeId: store.id, id: n.id })} className="transition sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-600 cursor-pointer">حذف</button></div>
            </li>)}
          </ul>
          {!store.notes.length && <p className="py-6 text-center text-[13px] text-stone-400">هنوز یادداشتی ثبت نشده</p>}
        </section>
      </div>
    </aside>
    {editing && <StoreForm initial={store} owners={owners} onClose={() => setEditing(false)} onSave={(name, owner) => dispatch({ t: 'editStore', id: store.id, name, owner })} />}
  </div>;
}

/* ───────── app ───────── */
export default function App() {
  const { state, dispatch, online, loaded } = useData();
  const [q, setQ] = useState(''); const [owner, setOwner] = useState(''); const [status, setStatus] = useState<Status | ''>('');
  const [sort, setSort] = useState<'recent' | 'least' | 'most' | 'name'>('recent');
  const [openId, setOpenId] = useState<string | null>(null); const [adding, setAdding] = useState(false); const [managing, setManaging] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea') || openId || adding || managing) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n' || e.key === 'د') { e.preventDefault(); setAdding(true); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [openId, adding, managing]);

  const { stores, template } = state;
  const owners = useMemo(() => [...new Set(stores.map((s) => s.owner))].sort((a, b) => a.localeCompare(b, 'fa')), [stores]);
  setOwners(owners);
  const count = (st: Status) => stores.filter((s) => statusOf(s) === st).length;
  const overall = stores.length ? Math.round(stores.reduce((a, s) => a + progress(s).pct, 0) / stores.length) : 0;

  const rows = useMemo(() => stores
    .filter((s) => (!status || statusOf(s) === status) && (!owner || s.owner === owner) &&
      (!q.trim() || [s.name, s.owner, ...s.notes.map((n) => n.text)].join(' ').includes(q.trim())))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'fa')
      : sort === 'least' ? progress(a).pct - progress(b).pct
        : sort === 'most' ? progress(b).pct - progress(a).pct : lastActivity(b) - lastActivity(a)),
    [stores, q, owner, status, sort]);

  const open = stores.find((s) => s.id === openId);
  const toggle = (s: Store, id: string) => { const g = s.stages.find((y) => y.id === id); if (g && !s.done[id] && isLocked(s, g)) { setOpenId(s.id); return; } dispatch({ t: 'toggle', storeId: s.id, stageId: id, at: Date.now() }); };
  const cols = `minmax(260px,1.3fr) repeat(${template.length}, 76px) 72px minmax(220px,1fr)`;
  const filtered = q || owner || status;

  return <div className="min-h-screen text-ink">
    {/* unified bar */}
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f6f6f4]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-6">
        {/* brand + overall ring */}
        
        <div className="flex items-center gap-2" title={`${fa(count('live'))} از ${fa(stores.length)} فروشگاه متصل شده`}>
          <Ring pct={overall} />
          <div className="hidden leading-tight xl:block"><div className="text-[12px] font-bold">پیشرفت کل</div>
            <div className="text-[11px] text-stone-500">{fa(count('live'))}/{fa(stores.length)} متصل</div></div>
        </div>
        <span className="mx-1 hidden h-6 w-px bg-stone-200 xl:block" />

        {/* search */}
        <div className="relative order-last w-full sm:order-none sm:w-auto sm:min-w-44 sm:flex-1 lg:max-w-xs">
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400"><Icon d={I.search} /></span>
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو…"
            className="h-9 w-full rounded-xl border border-stone-200 bg-white pr-8 pl-8 text-[13px] outline-none placeholder:text-stone-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-200/60" />
          {q ? <button onClick={() => setQ('')} className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:text-ink cursor-pointer"><Icon d={I.x} className="size-3.5" /></button>
            : <kbd className="absolute left-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-stone-200 px-1 text-[10px] text-stone-400 sm:block">/</kbd>}
        </div>

        {/* status segmented: dots + counts */}
        <div className="flex h-9 items-center rounded-xl border border-stone-200 bg-white p-0.5">
          {([['', 'همه', stores.length], ['doing', STATUS.doing.label, count('doing')], ['idle', STATUS.idle.label, count('idle')], ['live', STATUS.live.label, count('live')]] as const).map(([k, l, n]) =>
            <button key={k} onClick={() => setStatus(k)} title={l}
              className={`flex h-full items-center gap-1 sm:gap-1.5 rounded-[10px] px-2 sm:px-2.5 text-[12px] font-semibold tabular-nums transition cursor-pointer ${status === k ? 'bg-ink text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
              {k ? <span className={`size-2 rounded-full ${STATUS[k].dot}`} /> : <span>همه</span>}{fa(n)}</button>)}
        </div>

        {/* owners: stacked avatars */}
        {owners.length > 0 && <div className="flex h-9 min-w-0 max-w-[64px] items-center overflow-x-auto rounded-xl border border-stone-200 bg-white px-1.5 [scrollbar-width:none] sm:max-w-none">
          {owner && <button onClick={() => setOwner('')} title="همه مسئولین" className="ml-1 rounded p-0.5 text-stone-400 hover:text-ink cursor-pointer"><Icon d={I.x} className="size-3.5" /></button>}
          <div className="flex shrink-0 -space-x-1.5 space-x-reverse py-1">
            {owners.map((o) => <button key={o} onClick={() => setOwner(owner === o ? '' : o)} title={`${o} · ${fa(stores.filter((s) => s.owner === o).length)} فروشگاه`}
              className={`rounded-full ring-2 transition cursor-pointer hover:z-10 hover:scale-110 ${owner === o ? 'z-10 scale-110 ring-ink' : owner ? 'opacity-35 ring-white' : 'ring-white'}`}>
              <Avatar name={o} size="size-6 text-[10px]" /></button>)}
          </div>
        </div>}

        {/* sort as icon menu */}
        <label className="relative grid size-9 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-stone-300 cursor-pointer" title="مرتب‌سازی">
          <Icon d={I.sort} />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="absolute inset-0 cursor-pointer opacity-0">
            <option value="recent">آخرین فعالیت</option><option value="least">کمترین پیشرفت</option><option value="most">بیشترین پیشرفت</option><option value="name">نام</option></select>
        </label>

        <div className="hidden flex-1 sm:block" /><div className="flex-1 sm:hidden" />
        <span className="relative hidden size-2 sm:flex" title={online ? 'زنده — همگام برای همه' : 'آفلاین'}>
          {online && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />}<span className={`relative size-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} /></span>
        <button onClick={() => setAdding(true)} title="فروشگاه جدید (N)" className="hidden h-9 items-center gap-1.5 rounded-xl bg-ink px-3 text-[13px] font-semibold text-white hover:bg-stone-800 cursor-pointer sm:flex"><Icon d={I.plus} w={2.5} />فروشگاه</button>
      </div>
    </header>

    <main className="mx-auto max-w-[1680px] px-3 pb-28 pt-3 sm:px-6 sm:pb-16 sm:pt-4">
      {/* matrix */}
      <section className="hidden md:block overflow-hidden rounded-[22px] border border-stone-200/80 bg-white shadow-[0_1px_0_rgb(0_0_0/.03),0_12px_40px_-24px_rgb(0_0_0/.25)]">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* head */}
            <div className="grid items-end border-b border-stone-200/80 bg-stone-50/70" style={{ gridTemplateColumns: cols }}>
              <div className="sticky right-0 z-10 bg-stone-50 px-5 py-3 text-[12px] font-bold text-stone-500">
                {filtered ? `${fa(rows.length)} از ${fa(stores.length)} فروشگاه` : `${fa(stores.length)} فروشگاه`}</div>
              {template.map((g, i) => { const n = stores.filter((s) => s.done[g.id]).length; const pct = stores.length ? (n / stores.length) * 100 : 0;
                return <div key={g.id} className="flex h-full flex-col justify-end px-1 pb-2.5 pt-3 text-center" title={g.title}>
                  <span className="mb-0.5 text-[10px] font-bold tabular-nums text-stone-300">{fa(i + 1)}</span>
                  <span className="line-clamp-3 text-[11px] font-semibold leading-[1.45] text-stone-600">{g.title}</span>
                  <div className="mx-auto mt-2 h-1 w-10 overflow-hidden rounded-full bg-stone-200"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                  <span className="mt-1 text-[10px] tabular-nums text-stone-400">{fa(n)}/{fa(stores.length)}</span>
                </div>; })}
              <div className="pb-2.5 text-center text-[11px] font-semibold text-stone-500">اختصاصی</div>
              <div className="px-4 pb-2.5 text-[12px] font-bold text-stone-500">آخرین یادداشت</div>
            </div>

            {/* rows */}
            {rows.map((s) => {
              const p = progress(s); const st = STATUS[statusOf(s)];
              const extra = s.stages.filter((g) => !template.some((t) => t.id === g.id));
              const next = s.stages.find((g) => !s.done[g.id]); const n = s.notes[0];
              return <div key={s.id} className={`group grid items-center border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50/80 ${p.pct === 100 ? 'bg-emerald-50/30' : ''}`} style={{ gridTemplateColumns: cols }}>
                <button onClick={() => setOpenId(s.id)} className="sticky right-0 z-10 flex items-center gap-3 bg-white px-5 py-3.5 text-right transition-colors group-hover:bg-stone-50 cursor-pointer">
                  <Avatar name={s.owner} size="size-9 text-[13px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="truncate text-[14px] font-bold group-hover:underline underline-offset-4 decoration-stone-300">{s.name}</span>
                      <span className={`size-1.5 shrink-0 rounded-full ${st.dot}`} title={st.label} /></div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-stone-500"><OwnerBadge name={s.owner} /><span className="text-stone-300">·</span>
                      <span className="shrink-0 tabular-nums font-semibold text-stone-700">{fa(p.done)}/{fa(p.total)}</span><Bar pct={p.pct} className="w-14 shrink-0" /></div>
                  </div>
                </button>
                {template.map((g) => s.stages.some((x) => x.id === g.id)
                  ? <div key={g.id} className="py-2"><Cell on={!!s.done[g.id]} at={s.done[g.id]} label={g.title + (isLocked(s, g) ? ' · نیاز به امضای الکترونیک' : '')} locked={isLocked(s, g)} next={next?.id === g.id} onClick={() => toggle(s, g.id)} /></div>
                  : <div key={g.id} className="text-center text-stone-200" title="این مرحله برای این فروشگاه حذف شده">—</div>)}
                <div className="flex flex-wrap justify-center gap-1 px-1">
                  {extra.length ? extra.map((g) => <button key={g.id} onClick={() => toggle(s, g.id)} title={g.title}
                    className={`size-4 rounded-[5px] transition cursor-pointer ${s.done[g.id] ? 'bg-emerald-500' : 'border border-stone-300 hover:border-emerald-500'}`} />)
                    : <span className="text-stone-200">—</span>}
                </div>
                <button onClick={() => setOpenId(s.id)} className="flex min-w-0 items-start gap-2 px-4 py-3 text-right cursor-pointer">
                  {n ? <>
                    <span className="mt-1 shrink-0 text-amber-500"><Icon d={I.note} className="size-3.5" /></span>
                    <span className="min-w-0 flex-1"><span className="line-clamp-2 text-[12.5px] leading-6 text-stone-700">{n.text}</span>
                      <span className="text-[11px] text-stone-400">{ago(n.at)}{s.notes.length > 1 && ` · ${fa(s.notes.length - 1)}+ یادداشت دیگر`}</span></span>
                  </> : <span className="text-[12px] text-stone-300 transition group-hover:text-stone-500">+ یادداشت</span>}
                </button>
              </div>;
            })}
          </div>
        </div>

        {loaded && !rows.length && <div className="grain px-6 py-24 text-center">
          {stores.length ? <>
            <p className="text-[15px] font-bold">نتیجه‌ای پیدا نشد</p>
            <button onClick={() => { setQ(''); setOwner(''); setStatus(''); }} className={`${btnGhost} mt-4`}>پاک کردن فیلترها</button>
          </> : <>
            
            <p className="text-[18px] font-extrabold">اولین فروشگاه را اضافه کنید</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-stone-500">هر فروشگاه یک ردیف است و هر مرحله یک خانه. با یک کلیک مرحله را پاس کنید.</p>
            <button onClick={() => setAdding(true)} className={`${btnDark} mt-6`}><Icon d={I.plus} w={2.5} />افزودن فروشگاه</button>
          </>}
        </div>}
      </section>

      <section className="overflow-hidden rounded-[18px] border border-stone-200/80 bg-white md:hidden">
        {rows.map((s) => {
          const p = progress(s); const st = STATUS[statusOf(s)];
          return <button key={s.id} onClick={() => setOpenId(s.id)}
            className="flex w-full items-center gap-3 border-b border-stone-100 px-3.5 py-3.5 text-right last:border-0 active:bg-stone-50 cursor-pointer">
            <span className={`size-2 shrink-0 rounded-full ${st.dot}`} title={st.label} />
            <span className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="truncate text-[14px] font-bold">{s.name}</span>
              <OwnerBadge name={s.owner} />
            </span>
            <Bar pct={p.pct} className="w-16 shrink-0" />
            <span className="shrink-0 text-stone-300"><Icon d={I.arrow} className="size-4" /></span>
          </button>; })}
        {loaded && !rows.length && <div className="px-6 py-16 text-center">
          {stores.length ? <><p className="font-bold">نتیجه‌ای پیدا نشد</p><button onClick={() => { setQ(''); setOwner(''); setStatus(''); }} className={`${btnGhost} mt-4`}>پاک کردن فیلترها</button></>
            : <><p className="text-[17px] font-extrabold">اولین فروشگاه را اضافه کنید</p><p className="mt-2 text-[13px] leading-6 text-stone-500">هر مرحله را با یک لمس پاس کنید.</p></>}
        </div>}
      </section>

      <button onClick={() => setAdding(true)} aria-label="افزودن فروشگاه"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-5 z-20 flex items-center gap-2 rounded-full bg-ink py-3.5 pl-5 pr-4 text-[14px] font-bold text-white shadow-[0_12px_30px_-8px_rgb(0_0_0/.5)] active:scale-95 sm:hidden">
        <Icon d={I.plus} w={2.5} className="size-5" />فروشگاه</button>

      {stores.length > 0 && <p className="mt-4 hidden md:flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-stone-500">
        <span className="flex items-center gap-1.5"><span className="size-3.5 rounded-[5px] bg-emerald-500" />پاس شد</span>
        <span className="flex items-center gap-1.5"><span className="size-3.5 rounded-[5px] border-[1.5px] border-dashed border-stone-400" />مرحله بعدی</span>
        <span className="flex items-center gap-1.5"><span className="size-3.5 rounded-[5px] border border-stone-200 bg-white" />انجام نشده</span>
        <span className="text-stone-400">روی نام فروشگاه کلیک کنید تا جزئیات و یادداشت‌ها باز شود.</span>
      </p>}
    </main>

    {adding && <StoreForm owners={owners} onClose={() => setAdding(false)} onSave={(name, o) => dispatch({ t: 'addStore', id: uid(), name, owner: o, at: Date.now() })} />}
    {managing && <Dialog title="مراحل اتصال" sub="مراحل پیش‌فرض همه فروشگاه‌ها" onClose={() => setManaging(false)}>
      <StageManager stages={template} storeId={null} dispatch={dispatch} hint="افزودن، حذف یا تغییر نام در اینجا روی همه فروشگاه‌ها اعمال می‌شود." /></Dialog>}
    {open && <Drawer store={open} owners={owners} dispatch={dispatch} onClose={() => setOpenId(null)} />}
  </div>;
}
