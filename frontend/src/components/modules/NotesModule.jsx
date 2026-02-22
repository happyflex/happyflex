import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTrash } from '../../context/TrashContext';
import { useItemActions, ITEM_ACTIONS, ITEM_TYPES } from '../../context/ItemActionContext';
import { useConvertTrace } from '../../context/ConvertTraceContext';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import ModuleHeader from './ModuleHeader';
import ConvertLinkBadge from '../ConvertLinkBadge';
import { toast } from '../../hooks/use-toast';

const NotesModule = () => {
  const { notes, addNote, updateNote, deleteNote, tasks, addTask, setNotes } = useWorkspace();
  const { addNoteToTrash } = useTrash();
  const { register } = useItemActions();
  const { triggerMorphTrace } = useConvertTrace();
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: '#0ea5e9' });
  const [editingId, setEditingId] = useState(null);

  const colors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  // Register item type and handlers in central registry
  useEffect(() => {
    const unregister = register({
      itemType: ITEM_TYPES.NOTE,
      moduleType: 'notes',
      handlers: {
        [ITEM_ACTIONS.DELETE]: (payload) => {
          const note = notes.find(n => n.id === payload.itemId);
          if (note) {
            addNoteToTrash(note);
            deleteNote(note.id);
            toast({ title: 'Poznámka smazána', description: note.title });
          }
        },
        [ITEM_ACTIONS.DUPLICATE]: (payload) => {
          const note = notes.find(n => n.id === payload.itemId);
          if (note) {
            const duplicated = {
              title: `${note.title} (kopie)`,
              content: note.content,
              color: note.color
            };
            addNote(duplicated);
            toast({ title: 'Poznámka duplikována', description: duplicated.title });
          }
        },
        [ITEM_ACTIONS.CONVERT_TO_TASK]: (payload) => {
          const note = notes.find(n => n.id === payload.itemId);
          if (note && addTask) {
            const convertedAt = new Date().toISOString();
            const newTaskId = Date.now().toString();
            
            // Create new task with convert link back to note
            const newTask = {
              id: newTaskId,
              title: note.title || 'Úkol z poznámky',
              description: note.content,
              priority: 'medium',
              dueDate: null,
              completed: false,
              // Convert link metadata
              convertedFromId: note.id,
              convertedFromType: 'note',
              convertedAt
            };
            
            // Update original note with multi-convert array
            const updatedNote = {
              ...note,
              isConverted: true,
              convertedTo: [
                ...(note.convertedTo || []),
                {
                  targetId: newTaskId,
                  targetType: 'task',
                  convertedAt
                }
              ]
            };
            
            // Save updated note
            setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
            
            // Add new task
            addTask(newTask);
            
            // Trigger Morph Trace effect
            triggerMorphTrace({
              originId: note.id,
              originType: 'note',
              targetId: newTaskId,
              targetType: 'task',
              originModuleType: 'notes',
              targetModuleType: 'tasks'
            });
            
            toast({ title: 'Převedeno na úkol', description: note.title });
          }
        },
        [ITEM_ACTIONS.EDIT]: (payload) => {
          setEditingId(payload.itemId);
        }
      }
    });
    
    return unregister;
  }, [notes, addNote, deleteNote, addNoteToTrash, addTask, setNotes, register, triggerMorphTrace]);

  const handleAddNote = () => {
    if (newNote.title.trim() || newNote.content.trim()) {
      addNote(newNote);
      setNewNote({ title: '', content: '', color: '#0ea5e9' });
      setIsAdding(false);
    }
  };

  const handleDeleteNote = (note) => {
    // Add to trash before deleting
    addNoteToTrash(note);
    deleteNote(note.id);
  };

  return (
    <div className="h-full flex flex-col">
      <ModuleHeader
        icon={Edit3}
        title="Poznámky"
        subtitle={`${notes.length} poznámek`}
        iconColor="text-yellow-400"
        actions={
          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nová poznámka
          </Button>
        }
      />

      {isAdding && (
        <div className="mb-4 p-3 bg-[#0a1628] rounded-lg border border-cyan-500/30">
          <Input
            placeholder="Nadpis poznámky..."
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            className="mb-2 bg-[#0f1d35] border-cyan-500/30 text-white"
          />
          <Textarea
            placeholder="Obsah poznámky..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            className="mb-2 bg-[#0f1d35] border-cyan-500/30 text-white min-h-20"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newNote.color === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewNote({ ...newNote, color })}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="text-gray-400">
                Zrušit
              </Button>
              <Button size="sm" onClick={handleAddNote} className="bg-cyan-500 hover:bg-cyan-400 text-white">
                Přidat
              </Button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 && !isAdding ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Edit3 className="h-8 w-8 text-yellow-400/50" />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">Žádné poznámky</h4>
            <p className="text-sm text-gray-400 mb-4">
              Začněte přidáním první poznámky pro vaše myšlenky a nápady.
            </p>
            <Button
              onClick={() => setIsAdding(true)}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
            >
              <Plus className="h-4 w-4 mr-2" />
              Vytvořit první poznámku
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {notes.map((note) => (
              <div
                key={note.id}
                // === ITEM MODE: Data attributes for Mouse Ring detection ===
                data-steward-item="note"
                data-item-id={note.id}
                data-module-type="notes"
                className="group p-4 rounded-lg border transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
                style={{
                  backgroundColor: `${note.color}15`,
                  borderColor: `${note.color}50`
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white">{note.title}</h4>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                    onClick={() => handleDeleteNote(note)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: note.color }}></div>
                  <span className="text-xs text-gray-500">
                    {new Date(note.createdAt).toLocaleDateString('cs-CZ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default NotesModule;
