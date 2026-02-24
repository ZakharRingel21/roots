import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personsApi, documentsApi } from '../../api/client';
import type { Document } from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  personId: string;
  isEditor: boolean;
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
};

function getExt(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DocumentsList({ personId, isEditor }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['persons', personId, 'documents'],
    queryFn: () => personsApi.getDocuments(personId),
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons', personId, 'documents'] });
      setDeleteTarget(null);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const oversized = files.filter((f) => f.size > 20 * 1024 * 1024);
    if (oversized.length) {
      alert(`Файл слишком большой. Максимум 20 МБ. Превышают лимит: ${oversized.map((f) => f.name).join(', ')}`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        await personsApi.uploadDocument(personId, file);
      }
      queryClient.invalidateQueries({ queryKey: ['persons', personId, 'documents'] });
    } catch {
      alert('Не удалось загрузить документ');
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
            {uploading ? 'Загрузка...' : '+ Добавить документ'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, JPG, PNG — до 20 МБ</p>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Документов пока нет</div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {documents.map((doc) => {
            const ext = getExt(doc.file_name);
            const icon = FILE_ICONS[ext] || '📎';
            return (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-400">{doc.file_type.toUpperCase()} · {formatDate(doc.uploaded_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={doc.file_url}
                    download={doc.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                    title="Скачать"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  {isEditor && (
                    <button
                      onClick={() => setDeleteTarget(doc.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Удалить"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Удалить документ?"
        message="Это действие нельзя отменить."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
