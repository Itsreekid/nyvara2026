'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, ChevronRight, ChevronLeft, RotateCcw, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useLanguage, type Lang } from '@/context/LanguageContext';
import styles from './FindYourFit.module.css';

// ─── Multilingual Data ────────────────────────────────────────────────────────

const FACE_SHAPES = [
  {
    id: 'round',
    emoji: '⚪',
    label: { fr: 'Rond', ar: 'وجه دائري' },
    sub: { fr: 'Angles doux, largeur et longueur égales', ar: 'زوايا ناعمة، العرض قد الطول' },
    frames: { fr: ['Rectangulaire', 'Carrée', 'Demi-monture'], ar: ['مستطيل', 'مربع كلاسيكي', 'نصف إطار'] },
    why: { fr: 'Les montures angulaires ajoutent de la définition et allongent votre visage.', ar: 'الإطارات الزاوية (كيف المربع أو المستطيل) تبرز ملامح الوجه الدائري وتعطيه توازن مزيان.' },
  },
  {
    id: 'square',
    emoji: '🔲',
    label: { fr: 'Carré', ar: 'وجه مربع' },
    sub: { fr: 'Mâchoire forte, angles marqués', ar: 'فك بارز، زوايا واضحة' },
    frames: { fr: ['Rond', 'Ovale', 'Aviateur'], ar: ['دائري', 'بيضاوي', 'طيار (Aviateur)'] },
    why: { fr: 'Les montures arrondies adoucissent la géométrie forte d\'un visage carré.', ar: 'الإطارات الدائرية والبيضاوية ترطب الزوايا الحادة متع الوجه المربع وتزيدو لمسة ناعمة.' },
  },
  {
    id: 'oval',
    emoji: '🥚',
    label: { fr: 'Ovale', ar: 'وجه بيضاوي' },
    sub: { fr: 'Proportions équilibrées, menton doux', ar: 'متوازن برشا، ذقن ناعم' },
    frames: { fr: ['Carrée', 'Rectangulaire', 'Géométrique'], ar: ['مربع كلاسيكي', 'مربع', 'هندسي'] },
    why: { fr: 'Presque tous les styles conviennent à un visage ovale.', ar: 'تقريباً كل أشكال النظارات تواتي الوجه البيضاوي — الأشكال الهندسية تحافظ على توازنك الطبيعي.' },
  },
  {
    id: 'heart',
    emoji: '❤️',
    label: { fr: 'Cœur', ar: 'وجه على شكل قلب' },
    sub: { fr: 'Front large, menton pointu', ar: 'جبهة عريضة، ذقن جويد' },
    frames: { fr: ['Aviateur', 'Rond', 'Œil-de-chat'], ar: ['طيار (Aviateur)', 'دائري', 'عين القطة'] },
    why: { fr: 'Les montures larges vers le bas équilibrent parfaitement un front large.', ar: 'الإطارات العريضة من اللوطة ولا الجويدة تجبد الانتباه للأسفل، وهكا توازن جبهتك العريضة.' },
  },
] as const;

type FaceShapeId = typeof FACE_SHAPES[number]['id'];

const STYLE_VIBES = [
  {
    id: 'angular',
    emoji: '📐',
    label: { fr: 'GÉOMÉTRIQUE & STRUCTURÉ', ar: 'حادة وزاوية' },
    sub: { fr: 'Ajoute de la définition au visage', ar: 'تبرز وتحدد الوجه' },
  },
  {
    id: 'soft',
    emoji: '☁️',
    label: { fr: 'DOUX & ARRONDI', ar: 'ناعمة ودائرية' },
    sub: { fr: 'Adoucit les traits marqués', ar: 'تخفف من الزوايا الحادة' },
  },
  {
    id: 'all',
    emoji: '✨',
    label: { fr: 'TOUS LES STYLES', ar: 'وريني كل الستايلات' },
    sub: { fr: 'Ouvert à toutes les options', ar: 'منفتح على كل الخيارات' },
  },
] as const;

type StyleVibeId = typeof STYLE_VIBES[number]['id'];

const FRAME_SIZES = [
  {
    id: 'small',
    emoji: '📏',
    label: { fr: 'Petit / Étroit', ar: 'صغير / ضيق' },
    sub: { fr: '< 130 mm (largeur)', ar: 'أقل من 130 مم (العرض)' },
    sizeKey: { fr: 'Petit', ar: 'صغير (Small)' },
  },
  {
    id: 'medium',
    emoji: '👍',
    label: { fr: 'Moyen / Standard', ar: 'متوسط / قياسي' },
    sub: { fr: '130 mm – 138 mm (largeur)', ar: '130 مم – 138 مم (العرض)' },
    sizeKey: { fr: 'Moyen', ar: 'متوسط (Medium)' },
  },
  {
    id: 'large',
    emoji: '😎',
    label: { fr: 'Grand / Large', ar: 'كبير / عريض' },
    sub: { fr: '> 138 mm (largeur)', ar: 'أكثر من 138 مم (العرض)' },
    sizeKey: { fr: 'Large', ar: 'كبير (Large)' },
  },
] as const;

type FrameSizeId = typeof FRAME_SIZES[number]['id'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRecommendation(faceId: FaceShapeId, _styleId: StyleVibeId, sizeId: FrameSizeId) {
  const face = FACE_SHAPES.find(f => f.id === faceId)!;
  const size = FRAME_SIZES.find(s => s.id === sizeId)!;
  return {
    frames: face.frames,
    sizeLabel: size.sizeKey,
    why: face.why,
    shapeParam: face.frames.fr[0], // Use first French frame as the URL param match for simplicity
    sizeParam: sizeId,
  };
}

// ─── UI Text Translations ───────────────────────────────────────────────────

const UI_TEXT = {
  header: { fr: 'Étape', ar: 'الخطوة' },
  of: { fr: 'sur', ar: 'من' },
  resultTitle: { fr: '✨ Votre Recommandation', ar: '✨ نظارتك المثالية' },
  badge: { fr: 'Montures Recommandées', ar: 'الإطارات المنصوح بيها' },
  sizeLabel: { fr: 'Taille :', ar: 'الحجم:' },
  browse: { fr: 'Voir les montures', ar: 'شوف النظارات اللي تناسبك' },
  retake: { fr: 'Recommencer', ar: 'عاود الكويز' },
  back: { fr: 'Retour', ar: 'رجوع' },
  next: { fr: 'Suivant', ar: 'التالي' },
  seeFit: { fr: 'Voir le résultat', ar: 'اكتشف نظارتي' },
  
  step1Title: { fr: 'Choisissez votre langue', ar: 'اختار اللغة المتاعك' },
  step1Sub: { fr: 'Français ou Arabe Tunisien', ar: 'الفرنسية أو الدارجة التونسية' },
  
  step2Title: { fr: 'Pour qui cherchez-vous ?', ar: 'شكون باش يلبس النظارة؟' },
  step2Sub: { fr: 'Sélectionnez votre genre pour des recommandations adaptées.', ar: 'اختار باش نعطيوك النظارات اللي تواتيك.' },
  
  step3Title: { fr: 'Quelle est la forme de votre visage ?', ar: 'شنوا شكل وجهك؟' },
  step3Sub: { fr: 'Choisissez la forme qui vous correspond le mieux.', ar: 'اختار الشكل الأقرب لملامحك.' },
  
  step4Title: { fr: 'Quel style préférez-vous ?', ar: 'شنوا الستايل اللي تحبو؟' },
  step4Sub: { fr: 'Cela nous aide à affiner notre sélection.', ar: 'هذا يعاونا باش نختارو الإطارات اللي تواتيك أكثر.' },
  
  step5Title: { fr: 'Quelle est votre taille de monture ?', ar: 'شنوا حجم النظارة المفضل عندك؟' },
  step5Sub: { fr: 'Vérifiez les chiffres à l\'intérieur de vos lunettes.', ar: 'ثبت في الأرقام المكتوبة داخل نظارتك القديمة.' },
  step5Tip: { 
    fr: '💡 Astuce : Vérifiez les 3 chiffres (ex: 52-18-140). Le premier est la largeur du verre.',
    ar: '💡 ملاحظة: ثبت في الأرقام المكتوبة داخل نظارتك — مثال 52-18-140. الرقم اللول هو عرض العدسة.'
  },
};

// ─── Main Component ─────────────────────────────────────────────────────────

interface FindYourFitProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_STEPS = 4;

export default function FindYourFit({ isOpen, onClose }: FindYourFitProps) {
  const { language: l } = useLanguage();
  const [step,      setStep]      = useState(1);
  const [gender,    setGender]    = useState<'homme' | 'femme' | null>(null);
  const [faceShape, setFaceShape] = useState<FaceShapeId | null>(null);
  const [styleVibe, setStyleVibe] = useState<StyleVibeId | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSizeId | null>(null);
  const [showResult, setShowResult] = useState(false);

  const t = (key: keyof typeof UI_TEXT) => UI_TEXT[key][l];

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKey]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1); setGender(null);
        setFaceShape(null); setStyleVibe(null); setFrameSize(null); setShowResult(false);
      }, 300);
    }
  }, [isOpen]);

  // Handle direct open with pre-selected face shape (from FrameCarousel)
  useEffect(() => {
    const handleOpenQuiz = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.faceShape) {
        setFaceShape(customEvent.detail.faceShape);
        setStep(1); // Start at step 1 so they can choose gender
      }
    };
    window.addEventListener('openQuizModal', handleOpenQuiz);
    return () => window.removeEventListener('openQuizModal', handleOpenQuiz);
  }, []);

  if (!isOpen) return null;

  const progress = showResult ? 100 : (step / TOTAL_STEPS) * 100;

  const canNext =
    (step === 1 && gender !== null) ||
    (step === 2 && faceShape !== null) ||
    (step === 3 && styleVibe !== null) ||
    (step === 4 && frameSize !== null);

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else setShowResult(true);
  };

  const handleBack = () => {
    if (showResult) { setShowResult(false); setStep(4); }
    else if (step > 1) setStep(s => s - 1);
  };

  const handleRetake = () => {
    setStep(1); setGender(null);
    setFaceShape(null); setStyleVibe(null); setFrameSize(null); setShowResult(false);
  };

  const rec = faceShape && styleVibe && frameSize
    ? getRecommendation(faceShape, styleVibe, frameSize)
    : null;

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <span className={styles.stepLabel}>
            {showResult ? t('resultTitle') : `${t('header')} ${step} ${t('of')} ${TOTAL_STEPS}`}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* ══════════════════════════════════════
            RESULTS
        ══════════════════════════════════════ */}
        {showResult && rec ? (
          <div className={styles.results} key="results">
            <div className={styles.resultsBadge}>
              <Sparkles size={12} />
              {t('badge')}
            </div>
            <h2 className={styles.resultsTitle}>
              {rec.frames[l].join(l === 'fr' ? ' & ' : ' و ')}
            </h2>
            <span className={styles.resultsSize}>{t('sizeLabel')} {rec.sizeLabel[l]}</span>
            <p className={styles.resultsDesc}>{rec.why[l]}</p>

            <div className={styles.resultsCtas}>
              <Link
                href={`/shop?gender=${gender}&frame_shape=${encodeURIComponent(rec.shapeParam)}`}
                className={styles.primaryCta}
                onClick={onClose}
              >
                {t('browse')}
                <ArrowRight size={16} />
              </Link>
              <button className={styles.secondaryCta} onClick={handleRetake}>
                <RotateCcw size={14} />
                {t('retake')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════
                STEP 1 — Gender
            ══════════════════════════════════════ */}
            {step === 1 && (
              <div className={styles.body} key="step1">
                <h2 className={styles.stepTitle}>{t('step2Title')}</h2>
                <p className={styles.stepSub}>{t('step2Sub')}</p>
                <div className={styles.grid}>
                  <button
                    className={`${styles.card} ${gender === 'homme' ? styles.cardSelected : ''}`}
                    onClick={() => { setGender('homme'); setStep(2); }}
                  >
                    {gender === 'homme' && <span className={styles.checkMark}><Check size={11} /></span>}
                    <span className={styles.cardIcon}>👨</span>
                    <span className={styles.cardLabel}>{l === 'fr' ? 'Homme' : 'للرجال'}</span>
                  </button>
                  <button
                    className={`${styles.card} ${gender === 'femme' ? styles.cardSelected : ''}`}
                    onClick={() => { setGender('femme'); setStep(2); }}
                  >
                    {gender === 'femme' && <span className={styles.checkMark}><Check size={11} /></span>}
                    <span className={styles.cardIcon}>👩</span>
                    <span className={styles.cardLabel}>{l === 'fr' ? 'Femme' : 'للنساء'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 2 — Face Shape
            ══════════════════════════════════════ */}
            {step === 2 && (
              <div className={styles.body} key="step2">
                <h2 className={styles.stepTitle}>{t('step3Title')}</h2>
                <p className={styles.stepSub}>{t('step3Sub')}</p>
                <div className={styles.grid}>
                  {FACE_SHAPES.map(s => (
                    <button
                      key={s.id}
                      className={`${styles.card} ${faceShape === s.id ? styles.cardSelected : ''}`}
                      onClick={() => setFaceShape(s.id)}
                    >
                      {faceShape === s.id && (
                        <span className={styles.checkMark}><Check size={11} /></span>
                      )}
                      <span className={styles.cardIcon}>{s.emoji}</span>
                      <span className={styles.cardLabel}>{s.label[l]}</span>
                      <span className={styles.cardSub}>{s.sub[l]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 3 — Style Vibe
            ══════════════════════════════════════ */}
            {step === 3 && (
              <div className={styles.body} key="step3">
                <h2 className={styles.stepTitle}>{t('step4Title')}</h2>
                <p className={styles.stepSub}>{t('step4Sub')}</p>
                <div className={styles.grid}>
                  {STYLE_VIBES.map(v => (
                    <button
                      key={v.id}
                      className={`${styles.card} ${styleVibe === v.id ? styles.cardSelected : ''}`}
                      onClick={() => setStyleVibe(v.id)}
                    >
                      {styleVibe === v.id && (
                        <span className={styles.checkMark}><Check size={11} /></span>
                      )}
                      <span className={styles.cardIcon}>{v.emoji}</span>
                      <span className={styles.cardLabel}>{v.label[l]}</span>
                      <span className={styles.cardSub}>{v.sub[l]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                STEP 4 — Frame Size
            ══════════════════════════════════════ */}
            {step === 4 && (
              <div className={styles.body} key="step4">
                <h2 className={styles.stepTitle}>{t('step5Title')}</h2>
                <p className={styles.stepSub}>{t('step5Sub')}</p>
                <div className={`${styles.grid} ${styles.grid3}`}>
                  {FRAME_SIZES.map(sz => (
                    <button
                      key={sz.id}
                      className={`${styles.card} ${frameSize === sz.id ? styles.cardSelected : ''}`}
                      onClick={() => setFrameSize(sz.id)}
                    >
                      {frameSize === sz.id && (
                        <span className={styles.checkMark}><Check size={11} /></span>
                      )}
                      <span className={styles.cardIcon}>{sz.emoji}</span>
                      <span className={styles.cardLabel}>{sz.label[l]}</span>
                      <span className={styles.cardSub}>{sz.sub[l]}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.tip}>
                  {t('step5Tip')}
                </div>
              </div>
            )}

            {/* ── Footer: Back / Next ── */}
            <div className={styles.footer}>
              {step > 1 ? (
                <button className={styles.backBtn} onClick={handleBack}>
                  <ChevronLeft size={16} />
                  {t('back')}
                </button>
              ) : <span />}

              <button className={styles.nextBtn} onClick={handleNext} disabled={!canNext}>
                {step === TOTAL_STEPS ? (
                  <>{t('seeFit')} <Sparkles size={15} /></>
                ) : (
                  <>{t('next')} <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── External Trigger Components ────────────────────────────────────────────

interface FitButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export function FindYourFitButton({ onClick, className, label = 'Quiz Morphologie' }: FitButtonProps) {
  return (
    <button className={`${styles.triggerBtn} ${className || ''}`} onClick={onClick}>
      <Sparkles size={16} />
      <span>{label}</span>
    </button>
  );
}

export function FindYourFitMobileButton({ onClick, label = 'Quiz IA' }: { onClick: () => void, label?: string }) {
  return (
    <button className={styles.mobileTriggerBtn} onClick={onClick}>
      <Sparkles size={18} className={styles.mobileTriggerIcon} />
      <span>{label}</span>
    </button>
  );
}
