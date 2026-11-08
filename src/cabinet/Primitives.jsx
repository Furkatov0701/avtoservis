import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';

export function Modal({ open, title, children, onClose, actions }) {
  const ref = useRef(null);
  const headingId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="modal" aria-labelledby={headingId} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => {
    if (e.target === ref.current) {
      const r = ref.current.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
    }
  }}>
    <button className="icon-button modal-close" onClick={onClose} aria-label="Yopish"><Icon name="close" /></button>
    <h2 id={headingId}>{title}</h2><div className="modal-body">{children}</div>
    <div className="modal-actions">{actions || <Button onClick={onClose}>Tushunarli</Button>}</div>
  </dialog>;
}

export function Button({ children, secondary = false, className = '', busy, ...props }) {
  return <button className={`${secondary ? 'button-secondary' : 'button-primary'} ${className}`} {...props} disabled={props.disabled || busy} aria-busy={busy || undefined}>{busy && <span className="spinner small" />} {children}</button>;
}

export function Field({ label, name, error, type = 'text', required = false, ...props }) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return <div className="form-field"><label htmlFor={name}>{label}{required && <span aria-hidden="true"> *</span>}</label><div className="input-wrap"><input id={name} name={name} type={password && visible ? 'text' : type} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...props} />{password && <button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={`${label}: ${visible ? 'yashirish' : 'ko‘rsatish'}`} aria-pressed={visible}><Icon name={visible ? 'eyeOff' : 'eye'} size={20} /></button>}</div>{error && <p className="field-error" id={`${name}-error`}>{error}</p>}</div>;
}

export function StateCard({ kind = 'empty', title, children, action }) {
  return <div className={`state-card ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{kind === 'loading' ? <span className="spinner" /> : <span className="state-icon"><Icon name={kind === 'denied' ? 'lock' : kind === 'error' ? 'alert' : 'search'} size={29} /></span>}<h2>{title}</h2>{children && <p>{children}</p>}{action}</div>;
}

export function ScreenHeading({ children }) { return <h1 className="sr-only">{children}</h1>; }
