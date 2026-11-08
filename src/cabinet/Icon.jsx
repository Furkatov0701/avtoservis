import { useId } from 'react';

export function Icon({ name, size = 26, className = '' }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    back: <path d="m14 6-6 6 6 6M8 12h13" />,
    search: <><circle cx="10.5" cy="10.5" r="6.3" /><path d="m15.5 15.5 5 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    home: <path d="m4 10 8-7 8 7v10H4z" />,
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 21c0-5 3-8 8-8s8 3 8 8z" fill="var(--color-active)" /></>,
    people: <><circle cx="10" cy="7" r="3.4" /><path d="M3 20c0-4 2-7 7-7s7 3 7 7z" fill="var(--color-active)" /><path d="M17 4a4 4 0 0 1 0 7m2 3c2 1 3 3 3 6" /></>,
    layers: <><path d="m3 8 9-5 9 5-9 5z" fill="var(--color-cream)" /><path d="m3 12 9 5 9-5m-18 4 9 5 9-5" /></>,
    settings: <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="m4 16 11-11 4 4L8 20l-5 1z" fill="var(--color-cream)" /><path d="m13 7 4 4m-2-6 2-2 4 4-2 2" /></>,
    logout: <><path d="M10 4H4v16h6m-1-8h12m-4-4 4 4-4 4" /></>,
    phone: <path d="m6 3 4 4-2 3a17 17 0 0 0 6 6l3-2 4 4-2 3C10 21 3 14 3 5z" />,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="m3 3 18 18M10 5c7-1 12 7 12 7l-3 4M6 6c-3 2-4 6-4 6s4 7 10 7l4-1" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" fill="var(--color-cream)" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" fill="var(--color-cream)" /><path d="M3 10h18M7 3v5m10-5v5M7 14h2m6 0h2m-10 3h2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="m12 3 10 18H2z" fill="var(--color-cream)" /><path d="M12 9v5m0 3v.2" /></>,
    refresh: <><path d="M20 9a8 8 0 1 0-1 9M20 3v6h-6" /></>,
  };
  if (['car', 'tires', 'oil', 'tint', 'antifreeze'].includes(name)) return <ServiceIcon name={name} size={size} className={className} />;
  return <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" {...shared}>{paths[name] || paths.layers}</svg>;
}

function ServiceIcon({ name, size, className }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" className={`service-svg ${className}`} aria-hidden="true" fill="none" stroke="#235347" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round">
    {name === 'car' && <><path d="m13 27 5-14c2-5 26-5 28 0l5 14" fill="#d2dfd8" /><path d="M9 44v10m46-10v10" stroke="#334155" strokeWidth="8" /><rect x="6" y="25" width="52" height="25" rx="9" fill="#29464b" stroke="#29464b" /><path d="M17 24h30l-4-10H21z" fill="#dce7df" strokeWidth="2" /><circle cx="17" cy="36" r="5" fill="#ecd2a2" stroke="none" /><circle cx="47" cy="36" r="5" fill="#ecd2a2" stroke="none" /><path d="M27 39h10" stroke="#fff" strokeWidth="3" /></>}
    {name === 'tires' && <><circle cx="32" cy="32" r="26" fill="#e5d5be" /><circle cx="32" cy="32" r="21" fill="#f7f6ef" /><circle cx="32" cy="32" r="16" strokeWidth="2" /><circle cx="32" cy="32" r="4" fill="#c8a99d" /><path d="M32 16v12m0 8v12M16 32h12m8 0h12m-27-11 8 8m6 6 8 8m0-22-8 8m-6 6-8 8" strokeWidth="2.3" /></>}
    {name === 'oil' && <><path d="M13 24h27l6-7 10 2-12 18v10H17l-4-6z" fill="#f2e6d6" /><path d="M18 24v-8h13v8m-21 0H5v-9h10m30 12 10-3M13 33h27" /><path d="M56 35s-6 8-6 11a6 6 0 0 0 12 0c0-3-6-11-6-11Z" fill="#c8a99d" strokeWidth="2.4" /></>}
    {name === 'tint' && <><path d="M5 51 23 14h36v37z" fill="#d6dfd3" /><path d="M12 47 27 19h11L22 47z" fill="#f2e6d6" stroke="none" /><path d="m28 47 16-28h8L36 47z" fill="#fbf7f1" stroke="none" /><path d="M40 15v35" strokeWidth="2" /><path d="M6 51h53" /></>}
    {name === 'antifreeze' && <><path d="M26 7v42M8 17l36 22M8 39l36-22M19 11l7 6 7-6m-14 34 7-6 7 6M8 24l8-2 1-8m26 18-8 2-1 8M9 32l8 2-1 8m26-18-8-2-1-8" strokeWidth="2.7" /><path d="M50 34s-9 12-9 17a9 9 0 0 0 18 0c0-5-9-17-9-17Z" fill="#e2b88b" stroke="#9c6c41" strokeWidth="2.5" /></>}
  </svg>;
}

export function TireArt() {
  const uid = useId().replaceAll(':', '');
  return <svg className="tire-art" viewBox="0 0 200 220" aria-hidden="true"><defs><linearGradient id={`${uid}rubber`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#292f2e" /><stop offset=".5" stopColor="#666960" /><stop offset="1" stopColor="#252b29" /></linearGradient><linearGradient id={`${uid}edge`}><stop stopColor="#c7bcaa" /><stop offset=".5" stopColor="#65675e" /><stop offset="1" stopColor="#282e2b" /></linearGradient></defs><g transform="rotate(18 130 115)"><ellipse cx="136" cy="125" rx="72" ry="126" fill={`url(#${uid}rubber)`} /><ellipse cx="150" cy="125" rx="50" ry="116" fill="#222b28" /><ellipse cx="151" cy="125" rx="36" ry="94" fill={`url(#${uid}edge)`} /><ellipse cx="153" cy="125" rx="25" ry="80" fill="#f2e6d6" />{Array.from({ length: 18 }, (_, i) => <g key={i} transform={`translate(0 ${i * 14 - 14})`} stroke="#151e1b" strokeWidth="2.2" fill="none"><path d="m72 4 19 9 12-3m-35 0 14 9 17-4" /><path d="m105 2 17 8-10 8" /></g>)}<path d="M129 7c-46 45-53 160-24 223M116 4c-49 48-58 157-33 220" stroke="#cfcbc0" strokeOpacity=".45" fill="none" strokeWidth="1.5" /></g></svg>;
}
