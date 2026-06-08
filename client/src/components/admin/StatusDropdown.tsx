'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import styles from './StatusDropdown.module.css';

export interface StatusOption {
  value: string;
  label: string;
  bg: string;
  color: string;
}

export const CALL_STATUSES: StatusOption[] = [
  { value: 'pending',    label: 'En attente',  bg: 'rgba(245,200,66,0.18)',   color: '#f5c842' },
  { value: 'attempt_1', label: 'Tentative 1',  bg: 'rgba(255,150,50,0.18)',  color: '#ff9632' },
  { value: 'attempt_2', label: 'Tentative 2',  bg: 'rgba(255,100,20,0.18)',  color: '#ff6414' },
  { value: 'confirmed', label: 'Confirmé ✓',   bg: 'rgba(50,220,100,0.18)',  color: '#32dc64' },
  { value: 'rejected',  label: 'Refusé',       bg: 'rgba(255,80,80,0.18)',   color: '#ff5050' },
  { value: 'packed',    label: 'Emballé',      bg: 'rgba(150,100,255,0.18)', color: '#9664ff' },
  { value: 'delivered', label: 'Livré',        bg: 'rgba(80,220,180,0.18)',  color: '#50dca0' },
  { value: 'returned',  label: 'Retourné',     bg: 'rgba(160,160,160,0.15)', color: '#aaa'    },
];

const DROPDOWN_H = 320; // approx max height of the panel

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

interface Pos {
  top?: number;
  bottom?: number;
  left: number;
}

export default function StatusDropdown({ value, onChange, disabled }: Props) {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState<Pos>({ left: 0 });
  const triggerRef        = useRef<HTMLButtonElement>(null);

  const current = CALL_STATUSES.find(s => s.value === value) ?? CALL_STATUSES[0];

  // ── Calculate portal position ─────────────────────────────────────────────
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect       = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceBelow < DROPDOWN_H) {
      // Not enough room below → open upward
      setPos({ bottom: window.innerHeight - rect.top + 6, left: rect.left });
    } else {
      // Enough room below → open downward
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    calcPos();
    setOpen(o => !o);
  };

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (opt: StatusOption) => {
    setOpen(false);
    if (opt.value !== value) onChange(opt.value);
  };

  // ── Portal dropdown — rendered on document.body, escapes all overflow ─────
  const portal = open && typeof document !== 'undefined' && createPortal(
    <>
      {/* invisible backdrop — catches outside clicks */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
        onClick={() => setOpen(false)}
      />
      {/* panel */}
      <div
        className={styles.dropdown}
        style={{
          position: 'fixed',
          top:    pos.top    !== undefined ? pos.top    : 'auto',
          bottom: pos.bottom !== undefined ? pos.bottom : 'auto',
          left:   pos.left,
          zIndex: 10001,
        }}
      >
        {CALL_STATUSES.map(opt => (
          <button
            key={opt.value}
            className={`${styles.option} ${opt.value === value ? styles.optionActive : ''}`}
            onClick={() => handleSelect(opt)}
          >
            <span
              className={styles.optionBadge}
              style={{ background: opt.bg, color: opt.color }}
            >
              {opt.label}
            </span>
            {opt.value === value && <Check size={13} className={styles.checkIcon} />}
          </button>
        ))}
      </div>
    </>,
    document.body
  );

  return (
    <div className={styles.wrapper}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        style={{ background: current.bg, color: current.color }}
        onClick={handleOpen}
        disabled={disabled}
        title="Changer le statut"
      >
        {current.label}
        <ChevronDown
          size={12}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>
      {portal}
    </div>
  );
}
