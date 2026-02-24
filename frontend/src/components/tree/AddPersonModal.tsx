import React, { useState, FormEvent } from 'react';
import Modal from '../ui/Modal';
import { useCreatePerson } from '../../hooks/useTree';

interface AddPersonModalProps {
  treeId: string;
  onClose: () => void;
}

export default function AddPersonModal({ treeId, onClose }: AddPersonModalProps) {
  const createMutation = useCreatePerson(treeId);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    birth_date: '',
  });
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
    try {
      await createMutation.mutateAsync({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        patronymic: form.patronymic.trim() || undefined,
        birth_date: form.birth_date || undefined,
      });
      onClose();
    } catch {
      setError('Не удалось добавить персону');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Добавить персону"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Добавление...' : 'Добавить'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="label" htmlFor="add-last-name">
            Фамилия <span className="text-red-500">*</span>
          </label>
          <input
            id="add-last-name"
            type="text"
            className="input"
            placeholder="Иванов"
            value={form.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="add-first-name">
            Имя <span className="text-red-500">*</span>
          </label>
          <input
            id="add-first-name"
            type="text"
            className="input"
            placeholder="Иван"
            value={form.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="add-patronymic">Отчество</label>
          <input
            id="add-patronymic"
            type="text"
            className="input"
            placeholder="Иванович"
            value={form.patronymic}
            onChange={(e) => handleChange('patronymic', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="add-birth-date">Дата рождения</label>
          <input
            id="add-birth-date"
            type="date"
            className="input"
            value={form.birth_date}
            onChange={(e) => handleChange('birth_date', e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
