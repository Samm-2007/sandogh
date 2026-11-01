import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
createRoot(document.getElementById('root')!).render(<App />);

const vv = window.visualViewport;
const upd = () => { const r = document.documentElement.style; r.setProperty('--vh', (vv?.height ?? innerHeight) + 'px'); r.setProperty('--vt', (vv?.offsetTop ?? 0) + 'px'); };
vv?.addEventListener('resize', upd); vv?.addEventListener('scroll', upd); addEventListener('resize', upd); upd();
document.addEventListener('focusin', (e) => {
  const t = e.target as HTMLElement;
  if (t.matches?.('input,textarea') && t.closest('.vv')) setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
});
