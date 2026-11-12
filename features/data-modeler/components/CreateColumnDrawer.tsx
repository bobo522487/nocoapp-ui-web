import React from 'react';
import ColumnDrawer, { ColumnDrawerProps } from './ColumnDrawer';
import { SchemaField, DbTable } from '../../../types';
import { ForeignKeyConfig } from './ForeignKeyDrawer';

interface CreateColumnDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (field: Partial<SchemaField> & { targetTableId?: string; foreignKeyConfig?: ForeignKeyConfig }) => void;
  tables: DbTable[];
  activeTableName: string;
  getTargetColumns: (tableId: string) => { id: string; name: string }[];
}

const CreateColumnDrawer: React.FC<CreateColumnDrawerProps> = ({
  isOpen,
  onClose,
  onCreate,
  tables,
  activeTableName,
  getTargetColumns
}) => {
  return (
    <ColumnDrawer
      isOpen={isOpen}
      onClose={onClose}
      onSave={onCreate as any}
      tables={tables}
      activeTableName={activeTableName}
      getTargetColumns={getTargetColumns}
    />
  );
};

export default CreateColumnDrawer;