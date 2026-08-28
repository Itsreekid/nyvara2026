import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductDetail from './ProductDetail';
import type { Product } from '@/types';
import pool from '@/lib/db';

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchProduct(id: string) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              json_build_object('id', c.id, 'name', c.name) AS categories,
              COALESCE(
                json_agg(
                  json_build_object('id', pi.id, 'image_url', pi.image_url, 'sort_order', pi.sort_order)
                  ORDER BY pi.sort_order
                ) FILTER (WHERE pi.id IS NOT NULL),
                '[]'::json
              ) AS gallery
       FROM   products p
       LEFT JOIN categories  c  ON c.id  = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE  p.id = $1
       GROUP BY p.id, c.id`,
      [id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function fetchRelated(id: string, categoryId: string) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, json_build_object('id', c.id, 'name', c.name) AS categories
       FROM   products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE  p.category_id = $1 AND p.id != $2
       ORDER BY p.created_at DESC
       LIMIT 4`,
      [categoryId, id]
    );
    return rows;
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
