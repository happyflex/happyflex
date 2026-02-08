import React from 'react';
import { X, Link as LinkIcon, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

const relationshipTypes = {
  'part-of': { label: 'Je součástí', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  'influences': { label: 'Ovlivňuje', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  'depends-on': { label: 'Závisí na', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  'blocks': { label: 'Blokuje', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  'relates-to': { label: 'Souvisí s', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' }
};

const ItemDetailPanel = ({ item, connections, allItems, currentPath, structure, onClose, onNavigate }) => {
  if (!item) return null;

  // Find all connections related to this item
  const outgoingConnections = connections.filter(conn => conn.from === item.id);
  const incomingConnections = connections.filter(conn => conn.to === item.id);

  // Find where this item is used (in which subprojects it appears)
  const findUsageLocations = () => {
    const locations = [];
    
    const searchNode = (node, path = []) => {
      const nodePath = [...path, node.name];
      
      if (node.items && node.items.some(i => i.id === item.id)) {
        locations.push({
          path: nodePath,
          nodeId: node.id
        });
      }
      
      if (node.children) {
        node.children.forEach(child => searchNode(child, nodePath));
      }
    };
    
    searchNode(structure.root);
    return locations;
  };

  const usageLocations = findUsageLocations();

  // Get related items
  const getRelatedItem = (itemId) => {
    return allItems.find(i => i.id === itemId);
  };

  const getItemTypeLabel = (type) => {
    const labels = {
      note: '📝 Poznámka',
      task: '✅ Úkol',
      contact: '👤 Kontakt',
      milestone: '🎯 Milestone',
      media: '🖼️ Media',
      flow: '🔄 Flow'
    };
    return labels[type] || type;
  };

  return (
    <div className="w-80 bg-[#0f1d35] border-l border-cyan-500/30 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-cyan-500/20 flex items-center justify-between px-4">
        <h3 className="text-sm font-semibold text-white">Detail objektu</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Basic info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getItemTypeLabel(item.type).split(' ')[0]}</span>
              <div>
                <h4 className="text-sm font-semibold text-white">{item.data.title}</h4>
                <p className="text-xs text-gray-500">{getItemTypeLabel(item.type)}</p>
              </div>
            </div>
          </div>

          {/* Usage locations - FÁZE 1 */}
          <div>
            <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Použito v
            </h4>
            <div className="space-y-2">
              {usageLocations.length === 0 ? (
                <p className="text-xs text-gray-500">Pouze v aktuálním umístění</p>
              ) : (
                usageLocations.map((location, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 bg-[#0a1628] rounded border border-cyan-500/20 text-gray-300"
                  >
                    {location.path.join(' / ')}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Related items - FÁZE 1 */}
          <div>
            <h4 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Související s
            </h4>
            
            {outgoingConnections.length === 0 && incomingConnections.length === 0 ? (
              <p className="text-xs text-gray-500">Žádná propojení</p>
            ) : (
              <div className="space-y-3">
                {/* Outgoing */}
                {outgoingConnections.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Odchozí propojení:</p>
                    <div className="space-y-2">
                      {outgoingConnections.map(conn => {
                        const relatedItem = getRelatedItem(conn.to);
                        const relType = relationshipTypes[conn.type] || relationshipTypes['relates-to'];
                        
                        return relatedItem ? (
                          <div
                            key={conn.id}
                            className="p-2 bg-[#0a1628] rounded border border-cyan-500/20"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded border ${relType.color}`}>
                                {relType.label}
                              </span>
                            </div>
                            <p className="text-sm text-white">{relatedItem.data.title}</p>
                            <p className="text-xs text-gray-500">{getItemTypeLabel(relatedItem.type)}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Incoming */}
                {incomingConnections.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Příchozí propojení:</p>
                    <div className="space-y-2">
                      {incomingConnections.map(conn => {
                        const relatedItem = getRelatedItem(conn.from);
                        const relType = relationshipTypes[conn.type] || relationshipTypes['relates-to'];
                        
                        return relatedItem ? (
                          <div
                            key={conn.id}
                            className="p-2 bg-[#0a1628] rounded border border-cyan-500/20"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded border ${relType.color}`}>
                                ← {relType.label}
                              </span>
                            </div>
                            <p className="text-sm text-white">{relatedItem.data.title}</p>
                            <p className="text-xs text-gray-500">{getItemTypeLabel(relatedItem.type)}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div>
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">Informace</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span className="text-gray-400 font-mono">{item.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Typ:</span>
                <span className="text-gray-400">{getItemTypeLabel(item.type)}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ItemDetailPanel;
