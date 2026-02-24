import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { usePerson } from '../hooks/useTree';
import { useAuth } from '../hooks/useAuth';

import PersonHeader from '../components/person/PersonHeader';
import PhotoGallery from '../components/person/PhotoGallery';
import DocumentsList from '../components/person/DocumentsList';
import SectionEditor from '../components/person/SectionEditor';
import RelativesList from '../components/person/RelativesList';
import ProposalFeed from '../components/proposals/ProposalFeed';

const TABS = [
  { value: 'info', label: 'Информация' },
  { value: 'photos', label: 'Фотографии' },
  { value: 'documents', label: 'Документы' },
  { value: 'biography', label: 'Биография' },
  { value: 'relatives', label: 'Родственники' },
  { value: 'proposals', label: 'Предложения' },
];

function formatDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateForInput(iso: string | null) {
  if (!iso) return '';
  return iso.substring(0, 10);
}

export default function PersonPage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const { isEditor } = useAuth();

  const { data: person, isLoading } = usePerson(personId!);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Персона не найдена</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Назад
          </button>
        </div>
      </div>
    );
  }

  const visibleTabs = isEditor
    ? TABS
    : TABS.filter((t) => t.value !== 'proposals');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back button */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button
            onClick={() => {
              if (person.tree_id) {
                navigate(`/trees/${person.tree_id}`);
              } else {
                navigate(-1);
              }
            }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            К дереву
          </button>
        </div>
      </div>

      {/* Person Header */}
      <PersonHeader person={person} isEditor={isEditor} />

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <Tabs.Root defaultValue="info">
          <Tabs.List className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="px-4 py-2 text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 whitespace-nowrap transition-colors"
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="info">
            <PersonInfoForm person={person} isEditor={isEditor} />
          </Tabs.Content>

          <Tabs.Content value="photos">
            <PhotoGallery personId={personId!} isEditor={isEditor} />
          </Tabs.Content>

          <Tabs.Content value="documents">
            <DocumentsList personId={personId!} isEditor={isEditor} />
          </Tabs.Content>

          <Tabs.Content value="biography">
            <SectionEditor personId={personId!} isEditor={isEditor} />
          </Tabs.Content>

          <Tabs.Content value="relatives">
            <RelativesList person={person} isEditor={isEditor} />
          </Tabs.Content>

          {isEditor && (
            <Tabs.Content value="proposals">
              <ProposalFeed personId={personId} />
            </Tabs.Content>
          )}
        </Tabs.Root>
      </div>
    </div>
  );
}

// ---- Info Form ----

import { useUpdatePerson } from '../hooks/useTree';
import type { Person } from '../types';

interface PersonInfoFormProps {
  person: Person;
  isEditor: boolean;
}

function PersonInfoForm({ person, isEditor }: PersonInfoFormProps) {
  const updateMutation = useUpdatePerson(person.id);
  const [form, setForm] = useState({
    first_name: person.first_name,
    last_name: person.last_name,
    patronymic: person.patronymic || '',
    birth_date: formatDateForInput(person.birth_date),
    birth_place: person.birth_place || '',
    death_date: formatDateForInput(person.death_date),
    death_place: person.death_place || '',
    burial_place: person.burial_place || '',
    residence: person.residence || '',
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        patronymic: form.patronymic || undefined,
        birth_date: form.birth_date || undefined,
        birth_place: form.birth_place || undefined,
        death_date: form.death_date || undefined,
        death_place: form.death_place || undefined,
        burial_place: form.burial_place || undefined,
        residence: form.residence || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Не удалось сохранить изменения');
    }
  };

  const fields = [
    { label: 'Имя', field: 'first_name', type: 'text', required: true },
    { label: 'Фамилия', field: 'last_name', type: 'text', required: true },
    { label: 'Отчество', field: 'patronymic', type: 'text' },
    { label: 'Дата рождения', field: 'birth_date', type: 'date' },
    { label: 'Место рождения', field: 'birth_place', type: 'text' },
    { label: 'Дата смерти', field: 'death_date', type: 'date' },
    { label: 'Место смерти', field: 'death_place', type: 'text' },
    { label: 'Место захоронения', field: 'burial_place', type: 'text' },
    { label: 'Место проживания', field: 'residence', type: 'text' },
  ];

  return (
    <div className="card p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ label, field, type }) => (
          <div key={field}>
            <label className="label">{label}</label>
            {isEditor ? (
              <input
                type={type}
                className="input"
                value={form[field as keyof typeof form]}
                onChange={(e) => handleChange(field, e.target.value)}
              />
            ) : (
              <p className="text-sm text-slate-900 py-2">
                {type === 'date'
                  ? formatDate(form[field as keyof typeof form])
                  : form[field as keyof typeof form] || '—'}
              </p>
            )}
          </div>
        ))}
      </div>

      {isEditor && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
          {saved && <span className="text-sm text-green-600">Сохранено!</span>}
        </div>
      )}
    </div>
  );
}
