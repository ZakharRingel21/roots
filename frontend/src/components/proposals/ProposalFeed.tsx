import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalsApi } from '../../api/client';
import type { Proposal, ProposalStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  personId?: string;
  treeId?: string;
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'На рассмотрении',
  accepted: 'Принято',
  rejected: 'Отклонено',
  clarification_requested: 'Запрошено уточнение',
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  clarification_requested: 'bg-blue-100 text-blue-800',
};

const FIELD_LABELS: Record<string, string> = {
  first_name: 'Имя',
  last_name: 'Фамилия',
  patronymic: 'Отчество',
  birth_date: 'Дата рождения',
  birth_place: 'Место рождения',
  death_date: 'Дата смерти',
  death_place: 'Место смерти',
  burial_place: 'Место захоронения',
  residence: 'Место проживания',
};

export default function ProposalFeed({ personId, treeId }: Props) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | 'all'>('all');
  const [reviewState, setReviewState] = useState<{ id: string; action: ProposalStatus; comment: string } | null>(null);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals', { personId, treeId }],
    queryFn: () => proposalsApi.list({
      tree_id: treeId,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    }),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: ProposalStatus; comment?: string }) =>
      proposalsApi.patch(id, { status, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setReviewState(null);
    },
  });

  const filtered = proposals.filter((p) => {
    if (personId && p.target_person_id !== personId) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'pending', 'accepted', 'rejected', 'clarification_requested'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {s === 'all' ? 'Все' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Предложений нет</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isAdmin={isAdmin}
              onAccept={() => setReviewState({ id: proposal.id, action: 'accepted', comment: '' })}
              onReject={() => setReviewState({ id: proposal.id, action: 'rejected', comment: '' })}
              onClarify={() => setReviewState({ id: proposal.id, action: 'clarification_requested', comment: '' })}
            />
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewState && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900 mb-3">
              {reviewState.action === 'accepted' && 'Принять предложение'}
              {reviewState.action === 'rejected' && 'Отклонить предложение'}
              {reviewState.action === 'clarification_requested' && 'Запросить уточнение'}
            </h3>
            <textarea
              className="input w-full h-24 resize-none"
              placeholder="Комментарий (необязательно)"
              value={reviewState.comment}
              onChange={(e) => setReviewState((prev) => prev && { ...prev, comment: e.target.value })}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setReviewState(null)}>Отмена</button>
              <button
                className="btn-primary"
                disabled={patchMutation.isPending}
                onClick={() => patchMutation.mutate({
                  id: reviewState.id,
                  status: reviewState.action,
                  comment: reviewState.comment || undefined,
                })}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  isAdmin: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClarify: () => void;
}

function ProposalCard({ proposal, isAdmin, onAccept, onReject, onClarify }: ProposalCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[proposal.status]}`}>
            {STATUS_LABELS[proposal.status]}
          </span>
          <span className="text-sm text-slate-500">
            {new Date(proposal.created_at).toLocaleDateString('ru-RU')}
          </span>
          <span className="text-sm text-slate-600 font-medium">
            {Object.keys(proposal.field_changes).map((k) => FIELD_LABELS[k] || k).join(', ')}
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {/* Diff */}
          <div className="mt-3 space-y-2">
            {Object.entries(proposal.field_changes).map(([field, { before, after }]) => (
              <div key={field} className="text-sm">
                <span className="font-medium text-slate-700">{FIELD_LABELS[field] || field}: </span>
                <span className="bg-red-50 text-red-700 line-through px-1 rounded mr-1">{String(before) || '—'}</span>
                <span className="text-slate-400 mr-1">→</span>
                <span className="bg-green-50 text-green-700 px-1 rounded">{String(after) || '—'}</span>
              </div>
            ))}
          </div>

          {proposal.comment && (
            <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-600">
              <span className="font-medium">Комментарий: </span>{proposal.comment}
            </div>
          )}

          {isAdmin && proposal.status === 'pending' && (
            <div className="mt-3 flex gap-2">
              <button onClick={onAccept} className="btn-primary text-sm py-1.5">Принять</button>
              <button onClick={onReject} className="btn-secondary text-sm py-1.5 text-red-600 border-red-200 hover:bg-red-50">Отклонить</button>
              <button onClick={onClarify} className="btn-secondary text-sm py-1.5">Запросить уточнение</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
