import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Edit2, GripVertical,
  FileText, Target, Lightbulb, Save, MoreVertical
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { toast } from '../../hooks/use-toast';
import { useItemActions, ITEM_TYPES, ITEM_ACTIONS } from '../../context/ItemActionContext';

// Predefined area colors
const AREA_COLORS = [
  { name: 'Modrá', class: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  { name: 'Zelená', class: 'bg-green-500/20 border-green-500/40 text-green-400' },
  { name: 'Oranžová', class: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
  { name: 'Fialová', class: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
  { name: 'Růžová', class: 'bg-pink-500/20 border-pink-500/40 text-pink-400' },
  { name: 'Žlutá', class: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' },
  { name: 'Červená', class: 'bg-red-500/20 border-red-500/40 text-red-400' },
  { name: 'Tyrkysová', class: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' }
];

const PlanCanvas = ({ goal, plan, onClose, onUpdate }) => {
  const { register } = useItemActions();
  const [editingArea, setEditingArea] = useState(null);
  const [showAddArea, setShowAddArea] = useState(false);
  const [planDescription, setPlanDescription] = useState(plan?.description || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Ref for areas to avoid stale closures
  const areasRef = useRef(plan?.areas || []);
  useEffect(() => {
    areasRef.current = plan?.areas || [];
  }, [plan?.areas]);

  const handleSave = () => {
    onUpdate({ 
      description: planDescription,
      areas: plan.areas 
    });
    setHasUnsavedChanges(false);
    toast({ title: 'Změny uloženy', description: 'Plán byl aktualizován' });
  };

  const addArea = (areaData) => {
    const newArea = {
      id: `area-${Date.now()}`,
      name: areaData.name,
      notes: areaData.notes || '',
      color: areaData.color || AREA_COLORS[0].class
    };
    const updatedAreas = [...(plan.areas || []), newArea];
    onUpdate({ areas: updatedAreas });
    setShowAddArea(false);
    setHasUnsavedChanges(false);
    toast({ title: 'Oblast přidána', description: areaData.name });
  };

  const updateArea = (areaId, updates) => {
    const updatedAreas = plan.areas.map(a => 
      a.id === areaId ? { ...a, ...updates } : a
    );
    onUpdate({ areas: updatedAreas });
    setEditingArea(null);
    setHasUnsavedChanges(false);
  };

  const deleteArea = (areaId) => {
    const updatedAreas = plan.areas.filter(a => a.id !== areaId);
    onUpdate({ areas: updatedAreas });
    setHasUnsavedChanges(false);
    toast({ title: 'Oblast odstraněna' });
  };

  const handleDescriptionChange = (value) => {
    setPlanDescription(value);
    setHasUnsavedChanges(true);
  };

  return (
    <div 
      className="h-full flex flex-col bg-transparent"
      // === SCOPE ROOT CONTRACT: Plan canvas view ===
      data-module-scope-root="true"
      data-module-type="goals"
      data-scope-id={plan?.id}
      data-scope-type="plan"
    >
      {/* Top Bar */}
      <div className="bg-[#0f1d35] rounded-lg border border-cyan-500/30 p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Target className="h-3 w-3" />
                <span>{goal?.name}</span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                {plan?.name}
              </h2>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`${hasUnsavedChanges ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-gray-600'} text-white`}
          >
            <Save className="h-4 w-4 mr-2" />
            {hasUnsavedChanges ? 'Uložit změny' : 'Uloženo'}
          </Button>
        </div>

        {/* Plan Description */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Popis plánu</label>
          <Textarea
            value={planDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Jak tento plán pomůže dosáhnout cíle? Co je klíčové pro úspěch?"
            className="bg-[#0a1628] border-cyan-500/30 text-white min-h-16 text-sm"
          />
        </div>
      </div>

      {/* Canvas Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Lightbulb className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-1">Pracujte strategicky</h4>
                <p className="text-xs text-gray-300">
                  Tento plán slouží k přemýšlení a návrhu strategie. Strukturujte ho do oblastí 
                  (Marketing, Produkt, Prodej...) a přidávejte poznámky. Úkoly a exekuce přijdou později.
                </p>
              </div>
            </div>
          </div>

          {/* Areas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-cyan-400">Oblasti plánu</h3>
              <Button
                size="sm"
                onClick={() => setShowAddArea(true)}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Přidat oblast
              </Button>
            </div>

            {plan?.areas?.length === 0 && !showAddArea ? (
              <div className="text-center py-12 px-4 bg-[#0a1628] rounded-lg border border-cyan-500/20">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400 mb-1">Zatím nemáte žádné oblasti</p>
                <p className="text-xs text-gray-500">Strukturujte plán do oblastí jako Marketing, Produkt, Finance...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plan?.areas?.map((area, index) => (
                  <AreaCard
                    key={area.id}
                    area={area}
                    index={index}
                    isEditing={editingArea === area.id}
                    onEdit={() => setEditingArea(area.id)}
                    onSave={(updates) => updateArea(area.id, updates)}
                    onCancel={() => setEditingArea(null)}
                    onDelete={() => deleteArea(area.id)}
                  />
                ))}

                {showAddArea && (
                  <AddAreaForm
                    onAdd={addArea}
                    onCancel={() => setShowAddArea(false)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Future connections hint */}
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
            <p className="text-xs text-gray-500 text-center">
              💡 Později budete moci propojit tento plán s procesy a lidmi pro realizaci
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// Area Card Component
const AreaCard = ({ area, index, isEditing, onEdit, onSave, onCancel, onDelete }) => {
  const [editData, setEditData] = useState({ name: area.name, notes: area.notes, color: area.color });

  if (isEditing) {
    return (
      <div className="p-4 bg-[#0f1d35] rounded-lg border border-cyan-500/40">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Název oblasti</label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Např. Marketing, Produkt, Finance..."
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Poznámky</label>
            <Textarea
              value={editData.notes}
              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Klíčové body, nápady, rozhodnutí..."
              className="bg-[#0a1628] border-cyan-500/30 text-white min-h-24"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Barva</label>
            <div className="flex gap-2 flex-wrap">
              {AREA_COLORS.map(color => (
                <button
                  key={color.name}
                  onClick={() => setEditData(prev => ({ ...prev, color: color.class }))}
                  className={`w-8 h-8 rounded border-2 transition-all ${color.class} 
                    ${editData.color === color.class ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-400">
              Zrušit
            </Button>
            <Button size="sm" onClick={() => onSave(editData)} className="bg-cyan-500 hover:bg-cyan-400 text-white">
              Uložit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`p-4 rounded-lg border-2 group ${area.color}`}
      // === ITEM MODE: Data attributes for Mouse Ring ===
      data-steward-item="planArea"
      data-item-id={area.id}
      data-module-type="goals"
    >
      <div className="flex items-start gap-3">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="h-5 w-5 text-gray-500" />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] opacity-60">
                #{index + 1}
              </Badge>
              <h4 className="font-semibold">{area.name}</h4>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEdit}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-400"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {area.notes && (
            <p className="text-sm opacity-90 whitespace-pre-wrap">{area.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Add Area Form
const AddAreaForm = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    color: AREA_COLORS[0].class
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Chyba', description: 'Vyplňte název oblasti', variant: 'destructive' });
      return;
    }
    onAdd(formData);
  };

  return (
    <div className="p-4 bg-[#0f1d35] rounded-lg border-2 border-cyan-500/40">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Název oblasti *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Např. Marketing, Produkt, Finance..."
            className="bg-[#0a1628] border-cyan-500/30 text-white"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Poznámky</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Klíčové body, nápady, rozhodnutí..."
            className="bg-[#0a1628] border-cyan-500/30 text-white min-h-24"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Barva</label>
          <div className="flex gap-2 flex-wrap">
            {AREA_COLORS.map(color => (
              <button
                key={color.name}
                onClick={() => setFormData(prev => ({ ...prev, color: color.class }))}
                className={`w-8 h-8 rounded border-2 transition-all ${color.class} 
                  ${formData.color === color.class ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-400">
            Zrušit
          </Button>
          <Button size="sm" onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-white">
            Přidat oblast
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanCanvas;
