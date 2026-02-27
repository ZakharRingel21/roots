import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { relationshipsApi } from '../../api/client';
import type { Person, Relationship, RelationshipType } from '../../types';
import Avatar from '../ui/Avatar';
import ConfirmDialog from '../ui/ConfirmDialog';
import AddRelativeModal from './AddRelativeModal';

interface Props {
  person: Person;
  isEditor: boolean;
}

const RELATION_LABELS: Record<RelationshipType, string> = {
  parent: 'Родители',
  child: 'Дети',
  spouse: 'Супруги',
  sibling: 'Братья и сёстры',
};

const RELATION_ORDER: RelationshipType[] = ['parent', 'child', 'spouse', 'sibling'];

interface RelationshipWithPerson extends Relationship {
  related?: Person;
}

export default function RelativesList({ person, isEditor }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; treeId: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: relationships = [], isLoading } = useQuery<RelationshipWithPerson[]>({
    queryKey: ['persons', person.id, 'relationships'],
    queryFn: async () => {
      const res = await fetch(`/api/persons/${person.id}/relationships`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; treeId: string }) => relationshipsApi.delete(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['persons', person.id, 'relationships'] });
      queryClient.invalidateQueries({ queryKey: ['trees', variables.treeId, 'nodes'] });
      setDeleteTarget(null);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div>;
  }

  const grouped = RELATION_ORDER.reduce<Record<RelationshipType, RelationshipWithPerson[]>>(
    (acc, type) => {
      acc[type] = relationships.filter((r) => r.relationship_type === type);
      return acc;
    },
    { parent: [], child: [], spouse: [], sibling: [] }
  );

  return (
    <div className="space-y-6">
      {relationships.length === 0 && (
        <div className="text-center py-12 text-slate-400">Родственники не добавлены</div>
      )}

      {RELATION_ORDER.map((type) => {
        const items = grouped[type];
        if (items.length === 0) return null;
        return (
          <div key={type}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {RELATION_LABELS[type]}
            </h3>
            <div className="space-y-2">
              {items.map((rel) => (
                <RelativeCard
                  key={rel.id}
                  rel={rel}
                  isEditor={isEditor}
                  onNavigate={(id) => navigate(`/persons/${id}`)}
                  onDelete={() => setDeleteTarget({ id: rel.id, treeId: rel.tree_id })}
                />
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAddModal(true)} className="btn-secondary w-full">
        + Добавить родственника
      </button>

      {showAddModal && (
        <AddRelativeModal
          treeId={person.tree_id}
          personId={person.id}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['persons', person.id, 'relationships'] });
            queryClient.invalidateQueries({ queryKey: ['trees', person.tree_id, 'nodes'] });
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Удалить связь?"
        message="Родственная связь будет удалена. Сами записи о людях не удаляются."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface RelativeCardProps {
  rel: RelationshipWithPerson;
  isEditor: boolean;
  onNavigate: (id: string) => void;
  onDelete: () => void;
}

function RelativeCard({ rel, isEditor, onNavigate, onDelete }: RelativeCardProps) {
  const related = rel.related;
  const name = related
    ? [related.last_name, related.first_name, related.patronymic].filter(Boolean).join(' ')
    : rel.related_person_id;

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors">
      <button onClick={() => onNavigate(rel.related_person_id)} className="flex-shrink-0">
        <Avatar url={related?.avatar_thumb_url || null} size="md" />
      </button>
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onNavigate(rel.related_person_id)}
          className="text-sm font-medium text-slate-900 hover:text-indigo-600 truncate block text-left"
        >
          {name}
        </button>
        {related?.birth_date && (
          <p className="text-xs text-slate-400">
            {new Date(related.birth_date).getFullYear()}
            {related.death_date && ` — ${new Date(related.death_date).getFullYear()}`}
          </p>
        )}
      </div>
      {isEditor && (
        <button onClick={onDelete} className="text-slate-300 hover:text-red-500 flex-shrink-0 transition-colors" title="Удалить связь">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
