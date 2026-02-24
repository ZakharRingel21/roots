import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { personsApi, sectionsApi } from '../../api/client';
import type { Section } from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  personId: string;
  isEditor: boolean;
}

export default function SectionEditor({ personId, isEditor }: Props) {
  const queryClient = useQueryClient();
  const [addingTitle, setAddingTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['persons', personId, 'sections'],
    queryFn: () => personsApi.getSections(personId),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      personsApi.createSection(personId, { title, content_html: '', sort_order: sections.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons', personId, 'sections'] });
      setAddingTitle('');
      setIsAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sectionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons', personId, 'sections'] });
      setDeleteTarget(null);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <SectionItem
          key={section.id}
          section={section}
          isEditor={isEditor}
          onDelete={() => setDeleteTarget(section.id)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['persons', personId, 'sections'] })}
        />
      ))}

      {sections.length === 0 && !isAdding && (
        <div className="text-center py-12 text-slate-400">Разделы биографии не добавлены</div>
      )}

      {isEditor && (
        isAdding ? (
          <div className="card p-4">
            <input
              className="input mb-3"
              placeholder="Название раздела (например, Детство)"
              value={addingTitle}
              onChange={(e) => setAddingTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && addingTitle.trim()) createMutation.mutate(addingTitle.trim());
                if (e.key === 'Escape') { setIsAdding(false); setAddingTitle(''); }
              }}
            />
            <div className="flex gap-2">
              <button
                className="btn-primary"
                disabled={!addingTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(addingTitle.trim())}
              >
                Создать
              </button>
              <button className="btn-secondary" onClick={() => { setIsAdding(false); setAddingTitle(''); }}>
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="btn-secondary w-full">
            + Добавить раздел
          </button>
        )
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Удалить раздел?"
        message="Весь текст раздела будет удалён. Это нельзя отменить."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

interface SectionItemProps {
  section: Section;
  isEditor: boolean;
  onDelete: () => void;
  onUpdate: () => void;
}

function SectionItem({ section, isEditor, onDelete, onUpdate }: SectionItemProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [savingTitle, setSavingTitle] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: section.content_html,
    editable: isEditor,
    onBlur: async ({ editor }) => {
      if (!isEditor) return;
      const html = editor.getHTML();
      if (html === section.content_html) return;
      try {
        await sectionsApi.update(section.id, { content_html: html });
        onUpdate();
      } catch {
        // silent fail on blur save
      }
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== section.content_html) {
      editor.commands.setContent(section.content_html);
    }
  }, [section.content_html]);

  const saveTitle = async () => {
    if (!title.trim() || title === section.title) {
      setTitle(section.title);
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await sectionsApi.update(section.id, { title: title.trim() });
      onUpdate();
      setEditingTitle(false);
    } catch {
      alert('Не удалось сохранить заголовок');
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <div className="card p-6">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        {isEditor && editingTitle ? (
          <input
            className="input flex-1 mr-2 text-lg font-semibold"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') { setTitle(section.title); setEditingTitle(false); }
            }}
            disabled={savingTitle}
            autoFocus
          />
        ) : (
          <h3
            className={`text-lg font-semibold text-slate-800 ${isEditor ? 'cursor-pointer hover:text-indigo-600' : ''}`}
            onClick={() => isEditor && setEditingTitle(true)}
          >
            {title}
          </h3>
        )}
        {isEditor && !editingTitle && (
          <button onClick={onDelete} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0" title="Удалить раздел">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Toolbar (only for editors) */}
      {isEditor && editor && (
        <div className="flex gap-1 mb-2 border-b border-slate-100 pb-2">
          {[
            { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Жирный' },
            { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Курсив' },
            { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: 'Заголовок 2' },
            { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), title: 'Заголовок 3' },
            { label: '•', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Маркированный список' },
            { label: '1.', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Нумерованный список' },
          ].map(({ label, action, active, title }) => (
            <button
              key={label}
              onClick={action}
              title={title}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Editor content */}
      <div className={`prose prose-sm max-w-none ${isEditor ? 'min-h-[80px] cursor-text' : ''}`}>
        <EditorContent editor={editor} />
      </div>
      {isEditor && <p className="text-xs text-slate-400 mt-2">Изменения сохраняются автоматически</p>}
    </div>
  );
}
