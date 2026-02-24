import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, invitationsApi } from '../api/client';
import type { UserRole, UserStatus } from '../types';
import ProposalFeed from '../components/proposals/ProposalFeed';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const roleLabelMap: Record<UserRole, string> = {
  admin: 'Администратор',
  editor: 'Редактор',
  user: 'Пользователь',
  guest: 'Гость',
};

const statusLabelMap: Record<UserStatus, string> = {
  active: 'Активен',
  pending: 'Ожидает',
  blocked: 'Заблокирован',
};

const statusColorMap: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
};

// ---- Users Tab ----
function UsersTab() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.listUsers,
  });
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: UserRole; status?: UserStatus } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Роль</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Статус</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Создан</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">{user.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      updateMutation.mutate({
                        id: user.id,
                        data: { role: e.target.value as UserRole },
                      })
                    }
                    className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {(Object.keys(roleLabelMap) as UserRole[]).map((r) => (
                      <option key={r} value={r}>
                        {roleLabelMap[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColorMap[user.status]}`}
                  >
                    {statusLabelMap[user.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.status === 'active' ? (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: user.id,
                            data: { status: 'blocked' },
                          })
                        }
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Заблокировать
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: user.id,
                            data: { status: 'active' },
                          })
                        }
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Активировать
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Invitations Tab ----
function InvitationsTab() {
  const queryClient = useQueryClient();
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: invitationsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: invitationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: invitationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const [expiresHours, setExpiresHours] = useState('24');
  const [maxUses, setMaxUses] = useState('1');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = () => {
    createMutation.mutate({
      expires_hours: parseInt(expiresHours, 10),
      max_uses: parseInt(maxUses, 10),
    });
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Создать приглашение</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="label">Срок действия (часов)</label>
            <input
              type="number"
              min={1}
              max={8760}
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
              className="input w-32"
            />
          </div>
          <div>
            <label className="label">Макс. использований</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="input w-32"
            />
          </div>
          <button
            onClick={handleCreate}
            className="btn-primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {invitations.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Приглашений нет</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Токен</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Использован</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Истекает</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {inv.token.substring(0, 16)}...
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {inv.used_count} / {inv.max_uses}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(inv.expires_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => copyLink(inv.token, inv.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedId === inv.id ? 'Скопировано!' : 'Копировать ссылку'}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(inv.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Отозвать
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---- Main AdminPage ----
export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/trees')}
              className="text-slate-400 hover:text-slate-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-slate-900">Администрирование</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs.Root defaultValue="users">
          <Tabs.List className="flex gap-1 border-b border-slate-200 mb-6">
            {[
              { value: 'users', label: 'Пользователи' },
              { value: 'proposals', label: 'Предложения' },
              { value: 'invitations', label: 'Приглашения' },
            ].map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="px-4 py-2 text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 transition-colors"
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="users">
            <UsersTab />
          </Tabs.Content>

          <Tabs.Content value="proposals">
            <ProposalFeed />
          </Tabs.Content>

          <Tabs.Content value="invitations">
            <InvitationsTab />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </div>
  );
}
