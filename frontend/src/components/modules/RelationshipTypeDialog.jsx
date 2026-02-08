import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

const relationshipTypes = [
  { value: 'part-of', label: 'Je součástí', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', desc: 'Tento objekt je součástí jiného' },
  { value: 'influences', label: 'Ovlivňuje', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', desc: 'Tento objekt ovlivňuje jiný' },
  { value: 'depends-on', label: 'Závisí na', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', desc: 'Tento objekt závisí na jiném' },
  { value: 'blocks', label: 'Blokuje', color: 'bg-red-500/20 text-red-400 border-red-500/40', desc: 'Tento objekt blokuje jiný' },
  { value: 'relates-to', label: 'Souvisí s', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', desc: 'Obecná souvislost mezi objekty' }
];

const RelationshipTypeDialog = ({ isOpen, onClose, onSelect, fromItem, toItem }) => {
  const [selectedType, setSelectedType] = useState('relates-to');

  const handleConfirm = () => {
    onSelect(selectedType);
    setSelectedType('relates-to');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f1d35] border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-white">Typ vztahu</DialogTitle>
          <DialogDescription className="text-gray-400">
            Jak spolu objekty souvisí?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            {relationshipTypes.map((type) => (
              <div
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedType === type.value
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-cyan-500/20 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`px-2 py-1 rounded border text-xs ${type.color}`}>
                    {type.label}
                  </div>
                </div>
                <p className="text-xs text-gray-400">{type.desc}</p>
              </div>
            ))}
          </div>

          {fromItem && toItem && (
            <div className="p-3 bg-[#0a1628] rounded border border-cyan-500/20">
              <p className="text-xs text-gray-400 mb-2">Propojení:</p>
              <div className="text-sm text-white">
                <span className="font-medium">{fromItem.data.title}</span>
                <span className="text-cyan-400 mx-2">→</span>
                <span className="font-medium">{toItem.data.title}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400"
            >
              Zrušit
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-cyan-500 hover:bg-cyan-400 text-white"
            >
              Vytvořit propojení
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RelationshipTypeDialog;
