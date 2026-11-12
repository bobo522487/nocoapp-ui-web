import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
        setName('');
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
          onCreate(name);
          onClose();
      }
  };

  const content = (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] bg-background rounded-lg shadow-2xl z-[70] flex flex-col overflow-hidden border border-border transform transition-all duration-200 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
            <h3 className="text-sm font-semibold">Create Workspace</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 rounded-full">
                <X size={14} />
            </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input 
                    id="workspace-name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. My Workspace"
                    autoFocus
                    className="h-10"
                />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} size="sm">Cancel</Button>
                <Button type="submit" size="sm" disabled={!name.trim()}>Create</Button>
            </div>
        </form>
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default CreateWorkspaceDialog;