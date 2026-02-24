import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personsApi, photosApi } from '../../api/client';
import type { Photo } from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  personId: string;
  isEditor: boolean;
}

export default function PhotoGallery({ personId, isEditor }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [editingCaption, setEditingCaption] = useState<{ id: string; value: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['persons', personId, 'photos'],
    queryFn: () => personsApi.getPhotos(personId),
  });

  const deleteMutation = useMutation({
    mutationFn: photosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons', personId, 'photos'] });
      if (lightbox && lightbox.id === deleteTarget) setLightbox(null);
      setDeleteTarget(null);
    },
  });

  const updateCaptionMutation = useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string }) =>
      photosApi.update(id, { caption }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons', personId, 'photos'] });
      setEditingCaption(null);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length) {
      alert(`Файл слишком большой. Максимум 5 МБ. Превышают лимит: ${oversized.map((f) => f.name).join(', ')}`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        await personsApi.uploadPhoto(personId, file);
      }
      queryClient.invalidateQueries({ queryKey: ['persons', personId, 'photos'] });
    } catch {
      alert('Не удалось загрузить фото');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div>
      {isEditor && (
        <div className="mb-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? 'Загрузка...' : '+ Добавить фото'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleUpload} />
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Фотографий пока нет</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden bg-slate-100 aspect-square">
              <img
                src={photo.file_url}
                alt={photo.caption || ''}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(photo)}
              />
              {isEditor && (
                <button
                  onClick={() => setDeleteTarget(photo.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full p-1 transition-opacity"
                  title="Удалить"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.file_url} alt={lightbox.caption || ''} className="w-full rounded-lg max-h-[80vh] object-contain" />

            {/* Caption */}
            <div className="mt-2 text-center">
              {isEditor && editingCaption?.id === lightbox.id ? (
                <div className="flex gap-2 justify-center">
                  <input
                    className="bg-white/10 text-white border border-white/30 rounded px-2 py-1 text-sm w-64"
                    value={editingCaption.value}
                    maxLength={200}
                    onChange={(e) => setEditingCaption({ id: lightbox.id, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateCaptionMutation.mutate({ id: lightbox.id, caption: editingCaption.value });
                      if (e.key === 'Escape') setEditingCaption(null);
                    }}
                    autoFocus
                  />
                  <button className="btn-primary text-sm py-1" onClick={() => updateCaptionMutation.mutate({ id: lightbox.id, caption: editingCaption.value })}>
                    OK
                  </button>
                </div>
              ) : (
                <p
                  className={`text-white/70 text-sm ${isEditor ? 'cursor-pointer hover:text-white' : ''}`}
                  onClick={() => isEditor && setEditingCaption({ id: lightbox.id, value: lightbox.caption || '' })}
                >
                  {lightbox.caption || (isEditor ? 'Добавить подпись...' : '')}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-2">
              {isEditor && (
                <button
                  onClick={() => setDeleteTarget(lightbox.id)}
                  className="bg-red-600 text-white rounded p-1.5 hover:bg-red-700"
                  title="Удалить"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <button onClick={() => setLightbox(null)} className="bg-white/20 text-white rounded p-1.5 hover:bg-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Удалить фото?"
        message="Это действие нельзя отменить."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
