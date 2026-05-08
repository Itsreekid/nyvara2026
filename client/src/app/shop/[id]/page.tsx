import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductDetail from './ProductDetail';
import type { Product } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from('products')
    .select('title, description')
    .eq('id', id)
    .single();
  return {
    title: data?.title ? `${data.title} — NYVARA` : 'Produit — NYVARA',
    description: data?.description ?? 'Découvrez notre collection de lunettes de luxe.',
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  const [{ data: product }, { data: galleryData }] = await Promise.all([
    supabase.from('products').select('*, categories(*)').eq('id', id).single(),
    supabase.from('product_images').select('id, image_url, sort_order').eq('product_id', id).order('sort_order'),
  ]);

  if (!product) notFound();

  // Related products — same category, exclude current
  const { data: relatedData } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('category_id', product.category_id ?? '')
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(4);

  const gallery: { id: string; image_url: string }[] = galleryData ?? [];
  const related: Product[] = (relatedData as Product[]) ?? [];

  return <ProductDetail product={product as Product} gallery={gallery} related={related} />;
}
