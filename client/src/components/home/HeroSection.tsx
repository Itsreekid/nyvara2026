'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslation } from '@/locales/dictionary';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const { language } = useLanguage();
  const t = (path: string) => getTranslation(language, path);

  return (
    <section className={styles.hero} aria-label="Hero">

      {/* ── Ambient background layers ── */}
      <div className={styles.bgBase} aria-hidden="true" />
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />
      <div className={styles.bgGrid}  aria-hidden="true" />

      {/* ── Main content ── */}
      <div className={styles.inner}>

        {/* Left — editorial text */}
        <div className={styles.textCol}>

          <div className={styles.badge}>
            <Sparkles size={11} />
            <span>{t('hero.badge')}</span>
          </div>

          <h1 className={styles.headline}>
            <span className={styles.headlineTop}>{t('hero.title1')}</span>
            <span className={styles.headlineAccent}>{t('hero.title2')}</span>
          </h1>

          <p className={styles.subline}>
            {t('hero.sub1')}
            <br />
            {t('hero.sub2')}
          </p>

          {/* Stats row */}
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>200+</span>
              <span className={styles.statLabel}>{t('hero.stat1')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>100%</span>
              <span className={styles.statLabel}>{t('hero.stat2')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>48h</span>
              <span className={styles.statLabel}>{t('hero.stat3')}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/shop" className={styles.primaryCta}>
              <span>{t('hero.primaryCta')}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/shop" className={styles.secondaryCta}>
              {t('hero.secondaryCta')}
            </Link>
          </div>
        </div>

        {/* Right — model image */}
        <div className={styles.visual} aria-hidden="false">
          <div className={styles.imageWrap}>

            {/* Floating accent ring */}
            <div className={styles.ringOuter} aria-hidden="true" />
            <div className={styles.ringInner} aria-hidden="true" />

            {/* Gold corner brackets */}
            <div className={styles.cornerTL} aria-hidden="true" />
            <div className={styles.cornerBR} aria-hidden="true" />

            {/* Model photo */}
            <Image
              src="/hero-model.png"
              alt="Modèle portant des lunettes de soleil Nyvara"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 55vw"
              className={styles.modelImg}
            />

            {/* Overlay gradient so image blends beautifully */}
            <div className={styles.imgOverlay} aria-hidden="true" />

            {/* Floating tag */}
            <div className={styles.floatTag}>
              <span className={styles.floatTagDot} />
              <span>{t('hero.tag')}</span>
            </div>

            {/* Year watermark */}
            <div className={styles.yearMark} aria-hidden="true">2026</div>
          </div>
        </div>
      </div>
    </section>
  );
}
