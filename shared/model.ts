export interface Stage { id: string; title: string }
export interface Note { id: string; text: string; at: number }
export type SignRole = 'manager' | 'cashier';
export interface Sign { id: string; role: SignRole; signer: string; text: string; sig: string; owner: string; ownerSig: string; at: number; code?: string }
export interface Store {
  id: string; name: string; owner: string; createdAt: number;
  stages: Stage[]; done: Record<string, number>; notes: Note[]; signs?: Sign[];
}
export interface State { version: number; template: Stage[]; stores: Store[] }

export type Op =
  | { t: 'addStore'; id: string; name: string; owner: string; at: number }
  | { t: 'editStore'; id: string; name: string; owner: string }
  | { t: 'removeStore'; id: string }
  | { t: 'toggle'; storeId: string; stageId: string; at: number }
  | { t: 'addNote'; storeId: string; id: string; text: string; at: number }
  | { t: 'removeNote'; storeId: string; id: string }
  | { t: 'addSign'; storeId: string; sign: Sign }
  | { t: 'removeSign'; storeId: string; id: string }
  | { t: 'addStage'; storeId: string | null; id: string; title: string }
  | { t: 'removeStage'; storeId: string | null; stageId: string }
  | { t: 'renameStage'; storeId: string | null; stageId: string; title: string };

const DEFAULTS = [
  'نصب درسان‌دسک و تنظیم رمز ثابت', 'نصب صندوق اوانی', 'نصب PC POS و تنظیم پوز',
  'تنظیم فیش پرینتر', 'آموزش صندوق‌داران و تأیید دوسویه', 'انجام چند فروش تستی',
  'ورود کالاها از اکسل مالی', 'گرفتن فیدبک مشکلات', 'حل مشکلات مطرح‌شده',
  'تأییدیه مدیر و امضای دوسویه',
];
export const initialState = (): State => ({
  version: 0, stores: [],
  template: DEFAULTS.map((title, i) => ({ id: 's' + (i + 1), title })),
});

export const signRoleFor = (g: Stage): SignRole | null =>
  /مدیر/.test(g.title) && /تأیید|تایید/.test(g.title) ? 'manager' : /تأیید|تایید/.test(g.title) ? 'cashier' : null;
export const isLocked = (x: Store, g: Stage) => { const r = signRoleFor(g); return !!r && !(x.signs ?? []).some((v) => v.role === r); };

export function apply(s: State, op: Op): State {
  const st = structuredClone(s) as State;
  const find = (id: string) => st.stores.find((x) => x.id === id);
  const targets = (id: string | null) => (id ? [find(id)].filter(Boolean) as Store[] : st.stores);
  switch (op.t) {
    case 'addStore':
      st.stores.push({ id: op.id, name: op.name, owner: op.owner, createdAt: op.at,
        stages: structuredClone(st.template), done: {}, notes: [] });
      break;
    case 'editStore': { const x = find(op.id); if (x) { x.name = op.name; x.owner = op.owner; } break; }
    case 'removeStore': st.stores = st.stores.filter((x) => x.id !== op.id); break;
    case 'toggle': {
      const x = find(op.storeId); if (!x) break;
      if (x.done[op.stageId]) delete x.done[op.stageId];
      else { const g = x.stages.find((y) => y.id === op.stageId); if (g && isLocked(x, g)) break; x.done[op.stageId] = op.at; }
      break;
    }
    case 'addNote': find(op.storeId)?.notes.unshift({ id: op.id, text: op.text, at: op.at }); break;
    case 'removeNote': { const x = find(op.storeId); if (x) x.notes = x.notes.filter((n) => n.id !== op.id); break; }
    case 'addSign': { const x = find(op.storeId); if (x) { (x.signs ??= []).unshift(op.sign); x.stages.forEach((g) => { if (signRoleFor(g) === op.sign.role && !x.done[g.id]) x.done[g.id] = op.sign.at; }); } break; }
    case 'removeSign': { const x = find(op.storeId); if (x) { x.signs = (x.signs ?? []).filter((g) => g.id !== op.id); x.stages.forEach((g) => { if (isLocked(x, g)) delete x.done[g.id]; }); } break; }
    case 'addStage':
      if (!op.storeId) st.template.push({ id: op.id, title: op.title });
      targets(op.storeId).forEach((x) => x.stages.push({ id: op.id, title: op.title }));
      break;
    case 'removeStage':
      if (!op.storeId) st.template = st.template.filter((g) => g.id !== op.stageId);
      targets(op.storeId).forEach((x) => { x.stages = x.stages.filter((g) => g.id !== op.stageId); delete x.done[op.stageId]; });
      break;
    case 'renameStage': {
      const ren = (arr: Stage[]) => arr.forEach((g) => { if (g.id === op.stageId) g.title = op.title; });
      if (!op.storeId) ren(st.template);
      targets(op.storeId).forEach((x) => ren(x.stages));
      break;
    }
  }
  st.version = s.version + 1;
  return st;
}

export const progress = (x: Store) => {
  const total = x.stages.length;
  const done = x.stages.filter((g) => x.done[g.id]).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
};
