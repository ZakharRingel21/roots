import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { useTreeNodes, useCreateRelationship } from '../../hooks/useTree';
import type { RelationshipType } from '../../types';

interface LinkPersonModalProps {
  treeId: string;
  personId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'parent', label: 'Родитель' },
  { value: 'child', label: 'Ребёнок' },
  { value: 'spouse', label: 'Супруг/а' },
  { value: 'sibling', label: 'Брат/сестра' },
];

export default function LinkPersonModal({ treeId, personId, onClose, onSaved }: LinkPersonModalProps) {
  const { data: treeData } = useTreeNodes(treeId);
  const createRelationship = useCreateRelationship();

  const [relatedPersonId, setRelatedPersonId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('parent');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const otherNodes = useMemo(
    () => treeData?.nodes.filter((n) => n.id !== personId) ?? [],
    [treeData, personId]
  );

  const filteredNodes = useMemo(
    () =>
      search
        ? otherNodes.filter((n) => {
            const name = `${n.data.first_name} ${n.data.last_name}`.toLowerCase();
            return name.includes(search.toLowerCase());
          })
        : otherNodes,
    [otherNodes, search]
  );

  const handleSave = async () => {
    if (!relatedPersonId) {
      setError('Выберите персону');
      return;
    }
    setError('');
    try {
      await createRelationship.mutateAsync({
        person_id: personId,
        related_person_id: relatedPersonId,
        relationship_type: relationshipType,
        tree_id: treeId,
      });
      onSaved?.();
      onClose();
    } catch {
      setError('Не удалось создать связь');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Добавить родственную связь"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={createRelationship.isPending}
          >
            {createRelationship.isPending ? 'Добавление...' : 'Добавить'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="label">Тип связи</label>
          <select
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
            className="input"
          >
            {RELATIONSHIP_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Персона</label>
          <input
            type="text"
            className="input mb-2"
            placeholder="Поиск по имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="border border-slate-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
            {filteredNodes.length === 0 ? (
              <div className="p-3 text-sm text-slate-400 text-center">Персоны не найдены</div>
            ) : (
              filteredNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setRelatedPersonId(node.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors ${
                    relatedPersonId === node.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  <span className="font-medium">
                    {node.data.last_name} {node.data.first_name}
                  </span>
                  {node.data.patronymic && (
                    <span className="text-slate-400">{node.data.patronymic}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
