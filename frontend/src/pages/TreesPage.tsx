import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrees, useCreateTree, useDeleteTree } from '../hooks/useTree';
import { useAuth } from '../hooks/useAuth';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TreesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: trees = [], isLoading } = useTrees();
  const createMutation = useCreateTree();
  const deleteMutation = useDeleteTree();

  const [newTreeName, setNewTreeName] = useState('');
  const [showNewTreeModal, setShowNewTreeModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTreeName.trim()) return;
    try {
      const tree = await createMutation.mutateAsync({ name: newTreeName.trim() });
      setNewTreeName('');
      setShowNewTreeModal(false);
      navigate(`/trees/${tree.id}`);
    } catch {
      alert('Не удалось создать дерево');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    } catch {
      alert('Не удалось удалить дерево');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Roots</h1>
          <div className="flex items-center gap-4">
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Администрирование
              </button>
            )}
            <span className="text-sm text-slate-500">{user?.email}</span>
            <button onClick={logout} className="btn-secondary text-sm">
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">Мои деревья</h2>
          <button
            onClick={() => setShowNewTreeModal(true)}
            className="btn-primary"
          >
            + Новое дерево
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : trees.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg mb-4">У вас пока нет генеалогических деревьев</p>
            <button
              onClick={() => setShowNewTreeModal(true)}
              className="btn-primary"
            >
              Создать первое дерево
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trees.map((tree) => (
              <div
                key={tree.id}
                className="card p-6 cursor-pointer hover:shadow-md transition-shadow relative group"
                onClick={() => navigate(`/trees/${tree.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">{tree.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Создано: {formatDate(tree.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(tree.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-slate-400 hover:text-red-500"
                    aria-label="Удалить"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-4">
                  <div className="inline-flex items-center text-xs text-indigo-600 font-medium">
                    Открыть дерево →
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Tree Modal */}
      <Modal
        isOpen={showNewTreeModal}
        onClose={() => {
          setShowNewTreeModal(false);
          setNewTreeName('');
        }}
        title="Новое генеалогическое дерево"
        footer={
          <>
            <button
              onClick={() => {
                setShowNewTreeModal(false);
                setNewTreeName('');
              }}
              className="btn-secondary"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              className="btn-primary"
              disabled={!newTreeName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </button>
          </>
        }
      >
        <div>
          <label className="label" htmlFor="treeName">Название дерева</label>
          <input
            id="treeName"
            type="text"
            className="input"
            placeholder="Например: Семья Ивановых"
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Удалить дерево?"
        message="Это действие необратимо. Все данные дерева будут удалены."
        confirmLabel="Удалить"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
