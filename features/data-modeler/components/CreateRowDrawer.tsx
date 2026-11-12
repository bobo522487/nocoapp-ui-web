import React from 'react';
import RecordDrawer from './RecordDrawer';
import { SchemaField } from '../../../types';

interface CreateRowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (record: Record<string, any>) => void;
  schema: SchemaField[];
}

const CreateRowDrawer: React.FC<CreateRowDrawerProps> = ({
  isOpen,
  onClose,
  onCreate,
  schema
}) => {
  return (
    <RecordDrawer
      isOpen={isOpen}
      onClose={onClose}
      onSave={onCreate}
      schema={schema}
    />
  );
};

export default CreateRowDrawer;
