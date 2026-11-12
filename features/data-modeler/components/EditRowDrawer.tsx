import React from 'react';
import RecordDrawer from './RecordDrawer';
import { SchemaField } from '../../../types';

interface EditRowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Record<string, any> | null;
  onSave: (record: Record<string, any>) => void;
  schema: SchemaField[];
}

const EditRowDrawer: React.FC<EditRowDrawerProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  schema
}) => {
  return (
    <RecordDrawer
      isOpen={isOpen}
      onClose={onClose}
      initialRecord={initialData}
      onSave={onSave}
      schema={schema}
    />
  );
};

export default EditRowDrawer;
