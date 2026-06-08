'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { uploadImageToR2 } from '@/lib/r2-upload';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploading: (isUploading: boolean) => void;
  folder?: 'products' | 'gallery' | 'colors';
}

type UploadPhase = 'idle' | 'uploading';

export default function ImageUpload({
  value,
  onChange,
  onUploading,
  folder = 'products',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setPhase('uploading');

    try {
      const publicUrl = await uploadImageToR2(file, folder);
      onChange(publicUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[ImageUpload] Upload error:', message);
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
          <span>Envoi vers Cloudflare R2...</span>
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
