'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Loader2 } from 'lucide-react';
<<<<<<< HEAD
import { uploadImageToR2 } from '@/lib/r2-upload';
=======
>>>>>>> a87fb02a84b1924bceb700243511fa91618d07e0
import styles from './ImageUpload.module.css';
import { compressToWebP } from '@/lib/compressImage';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploading: (isUploading: boolean) => void;
  folder?: 'products' | 'gallery' | 'colors';
}

// Two-phase upload progress label
type UploadPhase = 'idle' | 'compressing' | 'uploading';

export default function ImageUpload({
  value,
  onChange,
  onUploading,
  folder = 'products',
}: ImageUploadProps) {
  const [isDragging, setIsDragging]   = useState(false);
  const [phase, setPhase]             = useState<UploadPhase>('idle');
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const isUploading = phase !== 'idle';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide.');
      return;
    }

    onUploading(true);

    try {
<<<<<<< HEAD
      const publicUrl = await uploadImageToR2(file);
      onChange(publicUrl);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Upload error:', error);
=======
      // ── Phase 1: Client-side compression (browser CPU, zero server cost) ──
      setPhase('compressing');
      const webpBlob = await compressToWebP(file);

      // ── Phase 2: Get a Pre-Signed URL from the serverless function (~15 ms) ──
      setPhase('uploading');
      const presignRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'image.webp',
          contentType: 'image/webp',
          folder,
        }),
      });

      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({ error: 'Réponse invalide du serveur' }));
        throw new Error(body.error ?? "Erreur lors de la génération de l'URL de téléchargement.");
      }

      const { uploadUrl, publicUrl }: { uploadUrl: string; publicUrl: string } =
        await presignRes.json();

      // ── Phase 3: PUT the WebP blob directly to Cloudflare R2 ──
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          // CacheControl header must be set via the presigned command, not the PUT request.
        },
        body: webpBlob,
      });

      if (!putRes.ok) {
        throw new Error(`R2 PUT échoué — statut ${putRes.status}`);
      }

      // ── Done: pass permanent CDN URL back to the form ──
      onChange(publicUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[ImageUpload] Upload error:', message);
>>>>>>> a87fb02a84b1924bceb700243511fa91618d07e0
      alert("Erreur lors du téléchargement de l'image : " + message);
    } finally {
      setPhase('idle');
      onUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // ── Preview mode — image already set ──────────────────────────────────────
  if (value) {
    return (
      <div className={styles.previewContainer}>
        <Image
          src={value}
          alt="Aperçu"
          width={200}
          height={200}
          className={styles.previewImage}
          unoptimized
        />
        <button
          type="button"
          className={styles.removeBtn}
          onClick={handleRemove}
          title="Supprimer l'image"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  // ── Upload dropzone ────────────────────────────────────────────────────────
  return (
    <div
      className={`${styles.uploadContainer} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.disabled : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className={styles.hiddenInput}
      />

      {isUploading ? (
        <div className={styles.loadingOverlay}>
          <Loader2 size={32} className={styles.spinner} />
          <span>
            {phase === 'compressing'
              ? 'Compression en cours...'
              : 'Envoi vers Cloudflare R2...'}
          </span>
        </div>
      ) : (
        <>
          <UploadCloud size={40} className={styles.icon} />
          <h3 className={styles.title}>Glissez une image ici</h3>
          <p className={styles.subtitle}>ou cliquez pour parcourir (JPG, PNG, WebP)</p>
        </>
      )}
    </div>
  );
}
