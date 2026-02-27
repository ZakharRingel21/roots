import React, { useState, FormEvent } from 'react';
import Modal from '../ui/Modal';
import { treesApi, relationshipsApi } from '../../api/client';
import type { Gender, RelationshipType } from '../../types';

interface Props {
  treeId: string;
  personId: string;
  onClose: () => void;
  onSaved: () => void;
}

const RELATION_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: 'parent', label: 'Родитель' },
  { value: 'child', label: 'Ребёнок' },
  { value: 'spouse', label: 'Супруг(а)' },
  { value: 'sibling', label: 'Брат / Сестра' },
];

export default function AddRelativeModal({ treeId, personId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    last_name: '',
    first_name: '',
    patronymic: '',
    maiden_name: '',
    birth_date: '',
    gender: '' as Gender | '',
    relationship_type: 'child' as RelationshipType,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Имя и фамилия обязательны');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const newPerson = await treesApi.createPerson(treeId, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        patronymic: form.patronymic.trim() || undefined,
        maiden_name: form.maiden_name.trim() || undefined,
        birth_date: form.birth_date || undefined,
        gender: (form.gender as Gender) || undefined,
      });
      await relationshipsApi.create({
        person_id: personId,
        related_person_id: newPerson.id,
        relationship_type: form.relationship_type,
        tree_id: treeId,
      });
      onSaved();
      onClose();
    } catch {
      setError('Не удалось добавить родственника');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Добавить родственника"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Отмена</button>
          <button onClick={handleSave} className="btn-primary" disabled={loading}>
            {loading ? 'Сохранение...' : 'Добавить'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
        )}

        <div>
          <label className="label" htmlFor="rel-rel-type">Кем приходится текущему человеку</label>
          <select id="rel-rel-type" className="input" value={form.relationship_type}
            onChange={(e) => handleChange('relationship_type', e.target.value)}>
            {RELATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <hr className="border-slate-100" />

        <div>
          <label className="label" htmlFor="rel-last-name">Фамилия <span className="text-red-500">*</span></label>
          <input id="rel-last-name" type="text" className="input" placeholder="Иванов"
            value={form.last_name} onChange={(e) => handleChange('last_name', e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="rel-first-name">Имя <span className="text-red-500">*</span></label>
          <input id="rel-first-name" type="text" className="input" placeholder="Иван"
            value={form.first_name} onChange={(e) => handleChange('first_name', e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="rel-patronymic">Отчество</label>
          <input id="rel-patronymic" type="text" className="input" placeholder="Иванович"
            value={form.patronymic} onChange={(e) => handleChange('patronymic', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="rel-gender">Пол</label>
          <select id="rel-gender" className="input" value={form.gender}
            onChange={(e) => handleChange('gender', e.target.value)}>
            <option value="">— не указан —</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>
        {form.gender === 'female' && (
          <div>
            <label className="label" htmlFor="rel-maiden-name">Девичья фамилия</label>
            <input id="rel-maiden-name" type="text" className="input" placeholder="Петрова"
              value={form.maiden_name} onChange={(e) => handleChange('maiden_name', e.target.value)} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="rel-birth-date">Дата рождения</label>
          <input id="rel-birth-date" type="date" className="input" value={form.birth_date}
            onChange={(e) => handleChange('birth_date', e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
