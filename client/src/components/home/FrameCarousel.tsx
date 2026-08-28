'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import styles from './FrameCarousel.module.css';

const FRAME_STYLES = (t: any) => [
  {
    id: 'square-classic',
    originalName: 'Carrée',
    name: t('shapes.square'),
    description: t('shapesDesc.square'),
    shape: (
      <svg viewBox="0 0 260 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="10" y="15" width="100" height="70" rx="8" fill="none" stroke="currentColor" strokeWidth="5"/>
        <rect x="150" y="15" width="100" height="70" rx="8" fill="none" stroke="currentColor" strokeWidth="5"/>
        <line x1="110" y1="50" x2="150" y2="50" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="10"  y1="40" x2="0"   y2="25" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="250" y1="40" x2="260" y2="25" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <rect x="15" y="20" width="90" height="60" rx="6" fill="currentColor" opacity="0.06"/>
        <rect x="155" y="20" width="90" height="60" rx="6" fill="currentColor" opacity="0.06"/>
      </svg>
    ),
  },
  {
    id: 'round',
    originalName: 'Rond Classique',
    name: t('shapes.round'),
    description: t('shapesDesc.round'),
    shape: (
      <svg viewBox="0 0 260 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="65"  cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5"/>
        <circle cx="195" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5"/>
        <line x1="110" y1="50" x2="150" y2="50" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="20"  y1="28" x2="8"   y2="15" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="240" y1="28" x2="252" y2="15" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <circle cx="65"  cy="50" r="40" fill="currentColor" opacity="0.06"/>
        <circle cx="195" cy="50" r="40" fill="currentColor" opacity="0.06"/>
      </svg>
    ),
  },
  {
    id: 'aviator',
    originalName: 'Aviateur',
    name: t('shapes.aviator'),
    description: t('shapesDesc.aviator'),
    shape: (
      <svg viewBox="0 0 260 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M20 35 Q20 95 65 95 Q110 95 110 35 Q110 15 65 15 Q20 15 20 35Z" fill="none" stroke="currentColor" strokeWidth="5"/>
        <path d="M150 35 Q150 95 195 95 Q240 95 240 35 Q240 15 195 15 Q150 15 150 35Z" fill="none" stroke="currentColor" strokeWidth="5"/>
        <line x1="110" y1="30" x2="150" y2="30" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="20"  y1="30" x2="8"   y2="18" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="240" y1="30" x2="252" y2="18" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <path d="M25 35 Q25 88 65 88 Q105 88 105 35 Q105 20 65 20 Q25 20 25 35Z" fill="currentColor" opacity="0.06"/>
        <path d="M155 35 Q155 88 195 88 Q235 88 235 35 Q235 20 195 20 Q155 20 155 35Z" fill="currentColor" opacity="0.06"/>
      </svg>
    ),
  },
  {
    id: 'cateye',
    originalName: 'Œil-de-chat',
    name: t('shapes.cateye'),
    description: t('shapesDesc.cateye'),
    shape: (
      <svg viewBox="0 0 260 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M10 60 Q10 25 55 18 Q100 25 100 60 Q100 90 55 90 Q10 90 10 60Z" fill="none" stroke="currentColor" strokeWidth="5"/>
        <path d="M160 60 Q160 25 205 18 Q250 25 250 60 Q250 90 205 90 Q160 90 160 60Z" fill="none" stroke="currentColor" strokeWidth="5"/>
        <line x1="100" y1="58" x2="160" y2="58" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="10"  y1="50" x2="0"   y2="35" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <line x1="250" y1="50" x2="260" y2="35" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
        <path d="M15 60 Q15 28 55 22 Q95 28 95 60 Q95 86 55 86 Q15 86 15 60Z" fill="currentColor" opacity="0.06"/>
        <path d="M165 60 Q165 28 205 22 Q245 28 245 60 Q245 86 205 86 Q165 86 165 60Z" fill="currentColor" opacity="0.06"/>
      </svg>
    ),
  },
];

export default function FrameCarousel() {
  const [current, setCurrent] = useState(0);
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);
  
  const stylesList = FRAME_STYLES(t);

  const prev = () => setCurrent(i => (i - 1 + stylesList.length) % stylesList.length);
  const next = () => setCurrent(i => (i + 1) % stylesList.length);

  const frame = stylesList[current];

  return (
    <section className={styles.section}>
      {/* Background watermark text */}
      <span className={styles.watermark} aria-hidden="true">
        {frame.name.toUpperCase()}
      </span>

      <div className={styles.inner}>
        <div className={styles.textCol}>
          <p className={styles.eyebrow}>{t('slider.eyebrow')}</p>
          <h2 className={styles.headline} style={{ whiteSpace: 'pre-line' }}>{t('slider.title')}</h2>
          <p className={styles.sub} style={{ whiteSpace: 'pre-line' }}>
            {t('slider.sub')}
          </p>
          <button 
            className={styles.cta} 
            onClick={() => {
              // Open modal and pass the suggested frame shape mapping
              // Carrée -> square, Rond Classique -> round, Aviateur -> aviator, Œil-de-chat -> heart (closest match for cat-eye in FindYourFit)
              let faceShape = 'round'; // fallback
              if (frame.originalName === 'Carrée') faceShape = 'square';
              else if (frame.originalName === 'Rond Classique') faceShape = 'round';
              else if (frame.originalName === 'Aviateur') faceShape = 'heart';
              else if (frame.originalName === 'Œil-de-chat') faceShape = 'heart';
              window.dispatchEvent(new CustomEvent('openQuizModal', { detail: { faceShape } }));
            }}
          >
            {t('slider.customizeBtn')}
          </button>
        </div>

        <div className={styles.carouselCol}>
          {/* Navigation */}
          <button className={styles.navBtn} onClick={prev} aria-label="Previous frame">
            <ArrowLeft size={20} />
          </button>

          {/* Frame display */}
          <div className={styles.frameDisplay} key={frame.id}>
            <Link href={`/shop?frame_shape=${encodeURIComponent(frame.originalName)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className={styles.frameSvgWrap} style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } } as React.CSSProperties}>
                {frame.shape}
              </div>
              <p className={styles.frameName} style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                {frame.name}
              </p>
            </Link>
            <p className={styles.frameDesc}>{frame.description}</p>
          </div>

          <button className={styles.navBtn} onClick={next} aria-label="Next frame">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className={styles.dots} role="tablist" aria-label="Frame style selector">
        {stylesList.map((f, i) => (
          <button
            key={f.id}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => setCurrent(i)}
            role="tab"
            aria-selected={i === current}
            aria-label={f.name}
          />
        ))}
      </div>
    </section>
  );
}
