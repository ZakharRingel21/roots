import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Person } from '../../types';
import { personsApi } from '../../api/client';
import Avatar from '../ui/Avatar';

interface Props {
  person: Person;
  isEditor: boolean;
}

const GENDER_LABELS: Record<string, string> = { male: 'Мужской', female: 'Женский' };
const GENDER_COLORS: Record<string, string> = {
  male: 'bg-blue-50 text-blue-700',
  female: 'bg-pink-50 text-pink-700',
};

export default function PersonHeader({ person, isEditor }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const fullName = [person.last_name, person.first_name, person.patronymic].filter(Boolean).join(' ');

  const lifespan = (() => {
    const birth = person.birth_date ? new Date(person.birth_date).getFullYear() : null;
    const death = person.death_date ? new Date(person.death_date).getFullYear() : null;
    if (!birth && !death) return null;
    if (birth && death) return `${birth} — ${death}`;
    if (birth) return `р. ${birth}`;
    return `ум. ${death}`;
  })();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Файл слишком большой. Максимум 5 МБ.'); return; }
    setUploading(true);
    try {
      await personsApi.uploadPhoto(person.id, file);
      queryClient.invalidateQueries({ queryKey: ['persons', person.id] });
    } catch {
      alert('Не удалось загрузить фото');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => isEditor && fileRef.current?.click()}
              className={`block rounded-full overflow-hidden ${isEditor ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
              title={isEditor ? 'Изменить фото' : undefined}
            >
              <Avatar url={person.avatar_url} size="xl" />
            </button>
            {isEditor && (
              <div className="absolute bottom-1 right-1 bg-indigo-600 rounded-full p-1 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                </svg>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{fullName || '—'}</h1>
              {person.gender && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GENDER_COLORS[person.gender]}`}>
                  {GENDER_LABELS[person.gender]}
                </span>
              )}
            </div>
            {person.maiden_name && (
              <p className="text-sm text-slate-500 mt-0.5">Девичья фамилия: <span className="text-slate-700">{person.maiden_name}</span></p>
            )}
            {lifespan && <p className="text-slate-500 mt-1">{lifespan}</p>}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              {person.birth_place && (
                <span><span className="text-slate-400 mr-1">Место рождения:</span>{person.birth_place}</span>
              )}
              {person.death_place && (
                <span><span className="text-slate-400 mr-1">Место смерти:</span>{person.death_place}</span>
              )}
              {person.residence && (
                <span><span className="text-slate-400 mr-1">Проживание:</span>{person.residence}</span>
              )}
              {person.burial_place && (
                <span><span className="text-slate-400 mr-1">Захоронение:</span>{person.burial_place}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
