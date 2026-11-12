import React from 'react';
import ColumnDrawer from './ColumnDrawer';
import { SchemaField, DbTable } from '../../../types';

interface EditColumnDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialField: SchemaField | null;
  onSave: (field: SchemaField) => void;
  onDelete: (id: string) => void;
  tables: DbTable[];
  activeTableName: string;
  getTargetColumns: (tableId: string) => { id: string; name: string }[];
}

const EditColumnDrawer: React.FC<EditColumnDrawerProps> = ({
  isOpen,
  onClose,
  initialField,
  onSave,
  onDelete,
  tables,
  activeTableName,
  getTargetColumns
}) => {
  return (
    <ColumnDrawer
      isOpen={isOpen}
      onClose={onClose}
      initialField={initialField}
      onSave={onSave as any}
      onDelete={onDelete}
      tables={tables}
      activeTableName={activeTableName}
      getTargetColumns={getTargetColumns}
    />
  );
};

export default EditColumnDrawer;
