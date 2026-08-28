import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductDetail from './ProductDetail';
import type { Product } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchProduct(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchRelated(id: string, categoryId: string) {
  try {
    const res = await fetch(`${API_URL}/api/products/${id}/related`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchProduct(id);
  return {
    title: data?.title ? `${data.title} — NYVARA` : 'Produit — NYVARA',
    description: data?.description ?? 'Découvrez notre collection de lunettes de luxe.',
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  const product = await fetchProduct(id);
  if (!product) notFound();

  // Gallery is now embedded in the product response by the server
  const gallery: { id: string; image_url: string }[] = product.gallery ?? [];
  const related: Product[] = await fetchRelated(id, product.category_id ?? '');

  return <ProductDetail product={product as Product} gallery={gallery} related={related} />;
}
