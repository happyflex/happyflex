import React from 'react';
import { Mail, Phone, Building, User } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ScrollArea } from '../ui/scroll-area';

const ContactsModule = () => {
  const { contacts } = useWorkspace();

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Kontakty</h3>
        <p className="text-xs text-gray-400">{contacts.length} kontaktů</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {contacts.map((contact, index) => (
            <div
              key={contact.id}
              className="group p-4 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {contact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white mb-1">{contact.name}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Building className="h-3 w-3" />
                      <span>{contact.company} • {contact.position}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Mail className="h-3 w-3" />
                      <span>{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ContactsModule;
