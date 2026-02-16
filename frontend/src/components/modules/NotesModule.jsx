import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTrash } from '../../context/TrashContext';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

const NotesModule = () => {
  const { notes, addNote, updateNote, deleteNote } = useWorkspace();
  const { addNoteToTrash } = useTrash();
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: '#0ea5e9' });
  const [editingId, setEditingId] = useState(null);

  const colors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Moje poznámky</h3>
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="bg-cyan-500 hover:bg-cyan-400 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nová
        </Button>
      </div>

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

      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-2">
          {notes.map((note) => (
            <div
              key={note.id}
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
                  onClick={() => deleteNote(note.id)}
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
    </div>
  );
};

export default NotesModule;
