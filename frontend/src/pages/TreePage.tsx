import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTreeNodes, useCreatePerson } from '../hooks/useTree';
import { useAuth } from '../hooks/useAuth';
import TreeCanvas from '../components/tree/TreeCanvas';
import AddPersonModal from '../components/tree/AddPersonModal';
import SearchBar from '../components/search/SearchBar';
import Avatar from '../components/ui/Avatar';
import type { FlowNodeData } from '../types';
import type { Node } from '@xyflow/react';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TreePage() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isEditor } = useAuth();

  const { data, isLoading, error } = useTreeNodes(treeId!);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<FlowNodeData>) => {
    setSelectedNode(node);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Не удалось загрузить дерево</p>
          <button onClick={() => navigate('/trees')} className="btn-secondary">
            Назад к деревьям
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/trees')}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Назад"
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
            <h1 className="text-base font-semibold text-slate-900">Roots</h1>
          </div>
          <div className="flex items-center gap-3">
            {(isAdmin || isEditor) && (
              <button onClick={() => setShowAddPerson(true)} className="btn-primary text-sm">
                + Добавить персону
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Администрирование
              </button>
            )}
            <button onClick={logout} className="btn-secondary text-sm">
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <SearchBar treeId={treeId} />
          </div>

          {selectedNode ? (
            <div className="p-4 flex-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Выбранная персона
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  url={selectedNode.data.avatar_thumb_url}
                  name={`${selectedNode.data.first_name} ${selectedNode.data.last_name}`}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedNode.data.first_name} {selectedNode.data.last_name}
                  </p>
                  {selectedNode.data.patronymic && (
                    <p className="text-sm text-slate-500">{selectedNode.data.patronymic}</p>
                  )}
                  {selectedNode.data.birth_date && (
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDate(selectedNode.data.birth_date)}
                    </p>
                  )}
                </div>
              </div>
              <Link
                to={`/persons/${selectedNode.data.id}`}
                className="btn-primary w-full text-center"
              >
                Открыть профиль
              </Link>
            </div>
          ) : (
            <div className="p-4 flex-1 flex items-center justify-center">
              <p className="text-sm text-slate-400 text-center">
                Нажмите на узел дерева, чтобы увидеть информацию о персоне
              </p>
            </div>
          )}
        </aside>

        {/* Tree Canvas */}
        <main className="flex-1 overflow-hidden">
          {data && (
            <TreeCanvas
              nodes={data.nodes}
              edges={data.edges}
              onNodeClick={handleNodeClick}
              treeId={treeId!}
            />
          )}
        </main>
      </div>

      {showAddPerson && (
        <AddPersonModal
          treeId={treeId!}
          onClose={() => setShowAddPerson(false)}
        />
      )}
    </div>
  );
}
