import { useEffect, useRef, useState } from 'react';
import type { Op, Sign, SignRole, Store } from '../shared/model.ts';

const uid = () => Math.random().toString(36).slice(2, 10);
const ROLE: Record<SignRole, string> = { manager: 'مدیر فروشگاه', cashier: 'صندوق‌دار' };
const dateFa = (t: number) => new Date(t).toLocaleString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const CASHIER_ITEMS = ['باز کردن نرم‌افزار و ورود با کد کارمندی و رمز عبور', 'بازگشایی صندوق و ورود به محیط فروش', 'افزودن کالا به سفارش و ثبت پرداخت',
  'ثبت پرداخت چندگانه و انتخاب مشتری', 'چاپ فاکتور و باز نگه داشتن هم‌زمان تا ۳ فاکتور', 'بازگردانی پرداخت‌های نقدی', 'خروج از نرم‌افزار',
  'چاپ مجدد فاکتور', 'مشاهده فهرست سفارش‌ها', 'ثبت مرجوعی سفارش', 'اعمال تخفیف روی کالا یا فاکتور'];
const MANAGER_ITEMS = ['نصب و راه‌اندازی نرم‌افزار صندوق فروش آوانی', 'نصب و تنظیم دستگاه کارت‌خوان (PC POS) و فیش پرینتر', 'ورود اطلاعات کالاها',
  'آموزش صندوق‌داران و دریافت تأییدیه آموزش از ایشان', 'انجام فروش‌های آزمایشی و اطمینان از صحت عملکرد', 'دریافت بازخورد و پیگیری و رفع کامل مشکلات مطرح‌شده'];
const fd = (t: number) => new Date(t).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
export const formTitle = (r: SignRole) => r === 'manager' ? 'فرم تأیید نهایی راه‌اندازی صندوق فروش آوانی' : 'فرم تأیید آموزش نرم‌افزار صندوق فروش آوانی';
export const agreementText = (store: string, role: SignRole, signer: string, code = '…', at = Date.now()) => role === 'manager'
  ? `اینجانب ${signer} به کد کارمندی ${code}، مدیر فروشگاه «${store}»، تأیید می‌کنم که تا تاریخ ${fd(at)} مراحل زیر به‌طور کامل در فروشگاه انجام شده است:\n${MANAGER_ITEMS.map((x, i) => `${(i + 1).toLocaleString('fa-IR')}. ${x}`).join('\n')}\nمشکلاتی که در دوره راه‌اندازی مطرح شد پیگیری و برطرف شده و در حال حاضر مورد باقی‌مانده‌ای وجود ندارد. بدین‌وسیله آمادگی فروشگاه برای شروع رسمی فروش با نرم‌افزار آوانی را تأیید می‌کنم. مشکلات احتمالی بعدی از طریق پشتیبانی آوان‌تک پیگیری خواهد شد.`
  : `اینجانب ${signer} به کد کارمندی ${code}، صندوق‌دار فروشگاه «${store}»، تأیید می‌کنم که در تاریخ ${fd(at)} موارد زیر به اینجانب آموزش داده شده و توانایی انجام آن‌ها را دارم:\n${CASHIER_ITEMS.map((x, i) => `${(i + 1).toLocaleString('fa-IR')}. ${x}`).join('\n')}`;

function Pad({ onChange }: { onChange: (data: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null); const drawing = useRef(false); const dirty = useRef(false);
  useEffect(() => {
    const c = ref.current!; const r = c.getBoundingClientRect(); const d = devicePixelRatio || 1;
    c.width = r.width * d; c.height = r.height * d;
    const g = c.getContext('2d')!; g.scale(d, d); g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#0b1f4d';
  }, []);
  const pt = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; const g = ref.current!.getContext('2d')!; const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); g.lineTo(x + .1, y + .1); g.stroke(); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const g = ref.current!.getContext('2d')!; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); dirty.current = true; };
  const up = () => { if (!drawing.current) return; drawing.current = false; dirty.current = true; onChange(ref.current!.toDataURL('image/png')); };
  const clear = () => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); dirty.current = false; onChange(''); };
  return <div className="relative">
    <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      className="block h-56 w-full touch-none rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 cursor-crosshair" />
    <span className="pointer-events-none absolute bottom-3 right-4 left-16 border-b border-stone-300" />
    <button type="button" onClick={clear} className="absolute top-2 left-2 rounded-lg bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-stone-500 shadow-sm hover:text-rose-600 cursor-pointer">پاک کردن</button>
  </div>;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export function exportPdf(store: Store, s: Sign) {
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>تاییدیه ${esc(store.name)} - ${esc(s.signer)}</title>
<style>@font-face{font-family:Y;src:url(${location.origin}/fonts/IRANYekanXFaNum-Regular.ttf)}@font-face{font-family:Y;font-weight:700;src:url(${location.origin}/fonts/IRANYekanXFaNum-Bold.ttf)}
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Y,Tahoma,sans-serif;color:#1c1917;margin:0;line-height:2}
h1{font-size:20px;margin:0}.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1c1917;padding-bottom:10px;margin-bottom:22px}
.meta{font-size:12px;color:#57534e}.box{border:1px solid #d6d3d1;border-radius:10px;padding:18px 20px;font-size:14px;text-align:justify;white-space:pre-line;line-height:2.2}
table{width:100%;margin-top:22px;border-collapse:collapse;font-size:13px}td{border:1px solid #d6d3d1;padding:8px 12px}td:first-child{width:28%;background:#f5f5f4;font-weight:700}
.sigs{display:flex;gap:20px;margin-top:34px}.sig{flex:1;border:1px solid #d6d3d1;border-radius:10px;padding:12px;text-align:center;font-size:13px}
.sig img{height:110px;max-width:100%;object-fit:contain;display:block;margin:6px auto}.foot{margin-top:30px;font-size:11px;color:#78716c;text-align:center}</style></head><body>
<div class="top"><div><h1>${formTitle(s.role)}</h1><div class="meta">فروشگاه: ${esc(store.name)}</div></div><div class="meta">تاریخ: ${dateFa(s.at)}<br>شناسه: ${s.id}</div></div>
<div class="box">${esc(s.text)}</div>
<table><tr><td>فروشگاه</td><td>${esc(store.name)}</td></tr><tr><td>${esc(ROLE[s.role])}</td><td>${esc(s.signer)}</td></tr>${s.code ? `<tr><td>کد ${s.role === 'manager' ? 'مدیر' : 'صندوق‌دار'}</td><td>${esc(s.code)}</td></tr>` : ''}<tr><td>مسئول راه‌اندازی</td><td>${esc(s.owner)}</td></tr><tr><td>زمان امضا</td><td>${dateFa(s.at)}</td></tr></table>
<div class="sigs"><div class="sig"><b>امضای ${esc(ROLE[s.role])}</b><img src="${s.sig}"><div>${esc(s.signer)}</div></div>
<div class="sig"><b>امضای مسئول راه‌اندازی</b><img src="${s.ownerSig}"><div>${esc(s.owner)}</div></div></div>
<div class="foot">این سند به‌صورت الکترونیکی امضا شده است.</div></body></html>`;
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px';
  document.body.appendChild(f); const d = f.contentDocument!; d.open(); d.write(html); d.close();
  const go = () => { f.contentWindow!.focus(); f.contentWindow!.print(); setTimeout(() => f.remove(), 60000); };
  (d.fonts ? d.fonts.ready : Promise.resolve()).then(() => Promise.all([...d.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(go, 150));
}

export function SignFlow({ store, dispatch, onClose, initRole = 'manager' }: { store: Store; dispatch: (o: Op) => void; onClose: () => void; initRole?: SignRole }) {
  const [step, setStep] = useState(0); const [role, setRole] = useState<SignRole>(initRole); const [signer, setSigner] = useState('');
  const [sig, setSig] = useState(''); const [ownerSig, setOwnerSig] = useState(''); const owner = store.owner; const [code, setCode] = useState('');
  const text = agreementText(store.name, role, signer.trim() || '…', code.trim() || '…');
  const finish = () => {
    const s: Sign = { id: uid(), role, signer: signer.trim(), text, sig, owner, ownerSig, at: Date.now(), code: code.trim() };
    dispatch({ t: 'addSign', storeId: store.id, sign: s }); onClose(); exportPdf(store, s);
  };
  const inp = 'min-w-0 rounded-xl border border-stone-200 px-3 py-2.5 text-[14px] outline-none focus:border-stone-400';
  const main = 'w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-white transition disabled:opacity-30 cursor-pointer';
  return <div className="fade vv z-[60] flex bg-stone-900/30 sm:items-center sm:justify-center sm:p-4">
    <div className="flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-[22px] sm:shadow-2xl">
      <header className="flex items-center gap-2 border-b border-stone-100 px-3 py-2 pt-[max(.5rem,env(safe-area-inset-top))]">
        <button onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 cursor-pointer">✕</button>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-extrabold">تأیید {role === 'manager' ? 'نهایی مدیر' : 'آموزش صندوق‌دار'} <span className="font-medium text-stone-400">· {store.name}</span></h2>
        {step > 0 && <button onClick={() => { setStep(step - 1); step === 1 ? setSig('') : setOwnerSig(''); }} className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer">قبلی</button>}
      </header>
      <div className="flex-1 overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {step === 0 && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">{(['manager', 'cashier'] as SignRole[]).map((r) =>
            <button key={r} onClick={() => setRole(r)} className={`rounded-lg py-2 text-[13px] font-semibold cursor-pointer ${role === r ? 'bg-white shadow-sm' : 'text-stone-500'}`}>{ROLE[r]}</button>)}</div>
          <input autoFocus value={signer} onChange={(e) => setSigner(e.target.value)} placeholder={`نام و نام خانوادگی ${ROLE[role]}`} className={`${inp} w-full`} />
          <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد کارمندی" className={`${inp} w-full`} />
          <button disabled={!signer.trim() || !code.trim()} onClick={() => setStep(1)} className={main}>ادامه</button>
        </div>}
        {step === 1 && <div className="space-y-3">
          <div className="whitespace-pre-line rounded-2xl bg-stone-50 p-4 text-[13.5px] leading-8 text-stone-700">{text}</div>
          <div className="text-[12px] font-semibold text-stone-500">امضای {signer}</div>
          <Pad key="a" onChange={setSig} />
          <button disabled={!sig} onClick={() => setStep(2)} className={main}>تأیید و ادامه</button>
        </div>}
        {step === 2 && <div className="space-y-3">
          <div className="text-[12px] font-semibold text-stone-500">امضای مسئول راه‌اندازی · {owner}</div>
          <Pad key="b" onChange={setOwnerSig} />
          <button disabled={!ownerSig} onClick={finish} className={`${main} bg-emerald-600`}>ثبت و دریافت PDF</button>
        </div>}
      </div>
    </div></div>;
}

export function SignList({ store, dispatch, role, onRole }: { store: Store; dispatch: (o: Op) => void; role: SignRole | null; onRole: (r: SignRole | null) => void }) {
  const [o, setOpen] = useState(false); const open = o || !!role; const list = store.signs ?? [];
  return <section className="border-t border-stone-100 px-5 py-5 sm:px-6">
    <div className="mb-3 flex items-center justify-between"><h3 className="text-[13px] font-bold text-stone-500">تاییدیه‌ها {list.length > 0 && <span className="text-stone-400">· {list.length.toLocaleString('fa-IR')}</span>}</h3>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-xl bg-ink px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-stone-800 cursor-pointer">+ افزودن تاییدیه</button></div>
    <ul className="space-y-2">{list.map((s) => <li key={s.id} className="group flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white p-2.5">
      <img src={s.sig} className="h-11 w-20 shrink-0 rounded-lg bg-stone-50 object-contain" />
      <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold">{s.signer}</div><div className="text-[11px] text-stone-400">{ROLE[s.role]}{s.code && ` · کد ${s.code}`} · {dateFa(s.at)}</div></div>
      <button onClick={() => exportPdf(store, s)} className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12px] font-semibold hover:bg-stone-50 cursor-pointer">PDF</button>
      <button onClick={() => confirm('تاییدیه حذف شود؟') && dispatch({ t: 'removeSign', storeId: store.id, id: s.id })} className="px-1 text-[12px] text-stone-300 hover:text-rose-600 cursor-pointer">✕</button>
    </li>)}</ul>
    {!list.length && <p className="py-3 text-center text-[13px] text-stone-400">هنوز تاییدیه‌ای ثبت نشده</p>}
    {open && <SignFlow store={store} dispatch={dispatch} initRole={role ?? 'manager'} onClose={() => { setOpen(false); onRole(null); }} />}
  </section>;
}
