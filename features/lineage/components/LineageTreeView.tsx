import React from 'react';
import { PersonRecord } from '../types';
import { GenealogyCanvas } from '../canvas/GenealogyCanvas';

interface LineageTreeViewProps {
  persons: PersonRecord[];
  selectedPersonId: string | null;
  editingPersonId?: string | null;
  branchTitle?: string;
  clanSurname?: string;
  onSelectPerson: (id: string | null) => void;
  onAddChild: (fatherId: string, gender?: 'male' | 'female') => void;
  onAddSibling?: (refPersonId: string, gender?: 'male' | 'female') => void;
  onAddSpouse: (personId: string) => void;
  onDeletePerson: (id: string) => void;
  onAddPersonDirectly?: (
    person: Partial<PersonRecord>,
    position?: { x: number; y: number }
  ) => void;
  onUpdatePersonFather?: (childId: string, fatherId: string | null) => void;
  onCommitInlineName?: (
    personId: string,
    name: string,
    openDrawer: boolean
  ) => void;
  onCancelInlineName?: (personId: string) => void;
  maxGenerationFilter?: number;
}

export const LineageTreeView: React.FC<LineageTreeViewProps> = ({
  persons,
  selectedPersonId,
  editingPersonId = null,
  branchTitle,
  clanSurname = '',
  onSelectPerson,
  onAddChild,
  onAddSibling,
  onAddSpouse,
  onDeletePerson,
  onAddPersonDirectly,
  onUpdatePersonFather,
  onCommitInlineName,
  onCancelInlineName,
  maxGenerationFilter = 20,
}) => {
  return (
    <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden bg-background">
      <GenealogyCanvas
        persons={persons}
        selectedPersonId={selectedPersonId}
        editingPersonId={editingPersonId}
        branchTitle={branchTitle}
        clanSurname={clanSurname}
        onSelectPerson={onSelectPerson}
        onAddChild={onAddChild}
        onAddSibling={onAddSibling}
        onAddSpouse={onAddSpouse}
        onDeletePerson={onDeletePerson}
        onAddPersonDirectly={onAddPersonDirectly}
        onUpdatePersonFather={onUpdatePersonFather}
        onCommitInlineName={onCommitInlineName}
        onCancelInlineName={onCancelInlineName}
        maxGenerationFilter={maxGenerationFilter}
      />
    </div>
  );
};

export default LineageTreeView;
