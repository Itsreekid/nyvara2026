import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import HeroSection      from '@/components/home/HeroSection';

const FrameCarousel = dynamic(() => import('@/components/home/FrameCarousel'));
const FeaturedProducts = dynamic(() => import('@/components/home/FeaturedProducts'));
const BrandStrip = dynamic(() => import('@/components/home/BrandStrip'));

export const metadata: Metadata = {
  title:       'Nyvara — Luxury Sunglasses Tunisia',
  description: 'Discover Nyvara\'s unique, customizable luxury sunglasses. The way you see the day — create your perfect style.',
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FrameCarousel />
      <FeaturedProducts />
      <BrandStrip />
    </>
  );
}
