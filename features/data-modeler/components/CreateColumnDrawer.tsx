

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info, ArrowRight, Settings2, X, Database, ShieldCheck, Globe } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { SchemaField, DbTable } from '../../../types';
import Dropdown from '../../../components/common/Dropdown';
import { Type, Hash, ToggleLeft, Calendar, Braces, DollarSign, FileKey } from 'lucide-react';
import ForeignKeyDrawer, { ForeignKeyConfig } from './ForeignKeyDrawer';

interface CreateColumnDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (field: Partial<SchemaField> & { targetTableId?: string, foreignKeyConfig?: ForeignKeyConfig }) => void;
  tables: DbTable[];
  activeTableName: string;
  getTargetColumns: (tableId: string) => { id: string; name: string }[];
}

const DATA_TYPES = [
    { id: 'varchar', label: 'Varchar', icon: Type },
    { id: 'int', label: 'Integer', icon: Hash },
    { id: 'float', label: 'Float', icon: DollarSign },
    { id: 'boolean', label: 'Boolean', icon: ToggleLeft },
    { id: 'date with time', label: 'Date with Time', icon: Calendar },
    { id: 'jsonb', label: 'JSONB', icon: Braces },
    { id: 'serial', label: 'Serial', icon: FileKey },
];

const TIMEZONES = [
    { id: 'UTC', label: 'UTC', offset: 'UTC+00:00' },
    { id: 'America/New_York', label: 'America/New_York', offset: 'UTC-05:00' },
    { id: 'America/Los_Angeles', label: 'America/Los_Angeles', offset: 'UTC-08:00' },
    { id: 'Europe/London', label: 'Europe/London', offset: 'UTC+00:00' },
    { id: 'Europe/Paris', label: 'Europe/Paris', offset: 'UTC+01:00' },
    { id: 'Asia/Tokyo', label: 'Asia/Tokyo', offset: 'UTC+09:00' },
    { id: 'Asia/Shanghai', label: 'Asia/Shanghai', offset: 'UTC+08:00' },
    { id: 'Australia/Sydney', label: 'Australia/Sydney', offset: 'UTC+11:00' },
];

const CreateColumnDrawer: React.FC<CreateColumnDrawerProps> = ({ 
    isOpen, 
    onClose, 
    onCreate, 
    tables, 
    activeTableName, 
    getTargetColumns 
}) => {
  const [isMounted, setIsMounted] = useState(false);
  
  // Form State
  const [columnName, setColumnName] = useState('');
  const [dataType, setDataType] = useState('varchar');
  const [defaultValue, setDefaultValue] = useState('');
  const [timeZone, setTimeZone] = useState('UTC');
  
  // Constraints
  const [isNotNull, setIsNotNull] = useState(false);
  const [isUnique, setIsUnique] = useState(false);
  const [isForeignKey, setIsForeignKey] = useState(false);

  // Foreign Key State
  const [showFKDrawer, setShowFKDrawer] = useState(false);
  const [fkConfig, setFkConfig] = useState<ForeignKeyConfig | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
        // Reset form on open
        setColumnName('');
        setDataType('varchar');
        setDefaultValue('');
        setTimeZone('UTC');
        setIsForeignKey(false);
        setFkConfig(null);
        setIsNotNull(false);
        setIsUnique(false);
        setShowFKDrawer(false);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const handleCreate = () => {
      if (!columnName.trim()) return;

      onCreate({
          name: columnName,
          type: dataType as any,
          defaultValue: defaultValue,
          isForeignKey: isForeignKey && !!fkConfig,
          isNullable: !isNotNull, // Inverse logic
          isUnique,
          isPrimary: dataType === 'serial', // Auto-set primary for serial for this demo
          targetTableId: fkConfig?.targetTableId,
          foreignKeyConfig: fkConfig || undefined,
          timeZone: dataType === 'date with time' ? timeZone : undefined
      });
      onClose();
  };

  const handleFKSwitch = (checked: boolean) => {
      if (checked) {
          setShowFKDrawer(true);
          // We set the switch to true temporarily, but if user cancels in drawer, we'll revert it
          setIsForeignKey(true); 
      } else {
          setIsForeignKey(false);
          setFkConfig(null);
      }
  };

  const handleFKSave = (config: ForeignKeyConfig) => {
      setFkConfig(config);
      setIsForeignKey(true);
      setShowFKDrawer(false);
  };

  const handleFKDelete = () => {
      setFkConfig(null);
      setIsForeignKey(false);
      setShowFKDrawer(false);
  };

  const handleFKClose = () => {
      setShowFKDrawer(false);
      // If we closed without saving and we don't have a config, revert switch
      if (!fkConfig) {
          setIsForeignKey(false);
      }
  };

  const getFkDetails = () => {
    if (!fkConfig) return null;
    const table = tables.find(t => t.id === fkConfig.targetTableId);
    if (!table) return null;
    const cols = getTargetColumns(table.id);
    const col = cols.find(c => c.id === fkConfig.targetColumnId);
    return { 
        tableName: table.name, 
        colName: col?.name || 'Unknown' 
    };
  };

  const fkDetails = getFkDetails();
  const selectedTypeObj = DATA_TYPES.find(t => t.id === dataType);

  const getTzLabel = (id: string) => {
      const tz = TIMEZONES.find(t => t.id === id);
      if (!tz) return id;
      return `${tz.label} (${tz.offset})`;
  };

  const content = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-[560px] bg-background shadow-2xl transform transition-transform duration-300 z-[70] flex flex-col border-l border-border ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">Create a new column</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X size={18} />
            </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* GENERAL Section */}
            <div className="mb-8">
                 <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                    <Database size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">GENERAL</span>
                 </div>
                 
                 <div className="space-y-4 pl-1">
                    {/* Column Name */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-32">Column Name</span>
                        <div className="flex-1">
                            <Input 
                                value={columnName}
                                onChange={(e) => setColumnName(e.target.value)}
                                placeholder="Enter column name"
                                autoFocus
                                className="bg-muted/50 border-input h-9"
                            />
                        </div>
                    </div>

                    {/* Data Type */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-32">Data Type</span>
                        <div className="flex-1 relative">
                            <Dropdown
                                triggerLabel={selectedTypeObj?.label || 'Select data type'}
                                triggerIcon={selectedTypeObj?.icon}
                                items={DATA_TYPES.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
                                selectedId={dataType}
                                onSelect={(item) => setDataType(item.id)}
                                width={380}
                                className="w-full justify-between border border-input bg-muted/50 rounded-md px-3 py-2 text-sm font-normal hover:bg-accent/50"
                            />
                        </div>
                    </div>

                    {/* Display Time (Timezone) - Only for Date with Time */}
                    {dataType === 'date with time' && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground w-32">Display time</span>
                            <div className="flex-1 relative">
                                <Dropdown
                                    triggerLabel={getTzLabel(timeZone)}
                                    triggerIcon={Globe}
                                    items={TIMEZONES.map(t => ({ id: t.id, label: `${t.label} (${t.offset})` }))}
                                    selectedId={timeZone}
                                    onSelect={(item) => setTimeZone(item.id)}
                                    width={380}
                                    className="w-full justify-between border border-input bg-muted/50 rounded-md px-3 py-2 text-sm font-normal hover:bg-accent/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Default Value */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground w-32">Default Value</span>
                        <div className="flex-1">
                            <Input 
                                value={defaultValue}
                                onChange={(e) => setDefaultValue(e.target.value)}
                                placeholder="Enter default value"
                                className="bg-muted/50 border-input h-9"
                            />
                        </div>
                    </div>
                 </div>
            </div>

            {/* CONSTRAINTS Section */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">CONSTRAINTS</span>
                </div>

                <div className="space-y-5 pl-1">
                    {/* Foreign Key */}
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1 max-w-[350px]">
                             <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">Foreign Key Relation</span>
                                {isForeignKey && !fkConfig && (
                                     <span className="flex items-center text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-sm cursor-pointer hover:underline" onClick={() => setShowFKDrawer(true)}>
                                         <Settings2 size={10} className="mr-1" /> Configure
                                     </span>
                                )}
                             </div>
                             <span className="text-xs text-muted-foreground">Link this column to a record in another table</span>

                             {/* Echo FK Details if configured */}
                             {isForeignKey && fkConfig && fkDetails && (
                                <div className="mt-2 flex items-center gap-2 bg-muted/30 border border-border rounded px-2 py-1.5 w-fit">
                                    <span className="text-xs font-medium text-foreground">{columnName || 'this_column'}</span>
                                    <div className="flex items-center justify-center text-muted-foreground">
                                        <svg width="13" height="13" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                                            <path d="M7.68767 11.1248C7.11708 11.6954 6.42961 11.9807 5.62528 11.9807C4.82094 11.9807 4.13348 11.6954 3.56288 11.1248C2.99229 10.5542 2.70699 9.86671 2.70699 9.06238C2.70699 8.25804 2.99229 7.57058 3.56288 6.99998L4.80032 5.76255C4.91719 5.64568 5.05468 5.58724 5.2128 5.58724C5.37092 5.58724 5.50841 5.64568 5.62528 5.76255C5.74215 5.87942 5.80058 6.01691 5.80058 6.17503C5.80058 6.33314 5.74215 6.47064 5.62528 6.5875L4.38784 7.82494C4.04411 8.16867 3.87224 8.58115 3.87224 9.06238C3.87224 9.5436 4.04411 9.95608 4.38784 10.2998C4.73157 10.6435 5.14405 10.8154 5.62528 10.8154C6.1065 10.8154 6.51898 10.6435 6.86271 10.2998L8.10015 9.06238C8.21702 8.94551 8.35451 8.88707 8.51263 8.88707C8.67075 8.88707 8.80824 8.94551 8.92511 9.06238C9.04198 9.17925 9.10041 9.31674 9.10041 9.47486C9.10041 9.63297 9.04198 9.77047 8.92511 9.88734L7.68767 11.1248ZM6.86271 8.6499C6.74585 8.76677 6.60835 8.8252C6.45024 8.8252C6.29212 8.8252 6.15463 8.76677 6.03776 8.6499C5.92089 8.53303 5.86245 8.39554 5.86245 8.23742C5.86245 8.0793 5.92089 7.94181 6.03776 7.82494L8.51263 5.35007C8.6295 5.2332 8.76699 5.17476 8.92511 5.17476C9.08323 5.17476 9.22072 5.2332 9.33759 5.35007C9.45446 5.46694 9.51289 5.60443 9.51289 5.76255C9.51289 5.92066 9.45446 6.05816 9.33759 6.17503L6.86271 8.6499ZM10.575 8.23742C10.4582 8.35429 10.3207 8.41272 10.1625 8.41272C10.0044 8.41272 9.86694 8.35429 9.75007 8.23742C9.6332 8.12055 9.57476 7.98306 9.57476 7.82494C9.57476 7.66682 9.6332 7.52933 9.75007 7.41246L10.9875 6.17503C11.3312 5.83129 11.5031 5.41881 11.5031 4.93759C11.5031 4.45636 11.3312 4.04388 10.9875 3.70015C10.6438 3.35642 10.2313 3.18455 9.75007 3.18455C9.26884 3.18455 8.85636 3.35642 8.51263 3.70015L7.27519 4.93759C7.15832 5.05446 7.02083 5.11289 6.86271 5.11289C6.7046 5.11289 6.5671 5.05446 6.45024 4.93759C6.33337 4.82072 6.27493 4.68323 6.27493 4.52511C6.27493 4.36699 6.33337 4.2295 6.45024 4.11263L7.68767 2.87519C8.25827 2.3046 8.94573 2.0193 9.75007 2.0193C10.5544 2.0193 11.2419 2.3046 11.8125 2.87519C12.3831 3.44579 12.6684 4.13325 12.6684 4.93759C12.6684 5.74192 12.3831 6.42939 11.8125 6.99998L10.575 8.23742Z" fill="currentColor"></path>
                                        </svg>
                                    </div>
                                    <span className="text-xs font-medium text-foreground">{fkDetails.tableName}.{fkDetails.colName}</span>
                                    <div 
                                        className="ml-2 cursor-pointer flex items-center justify-center text-muted-foreground hover:text-foreground"
                                        onClick={() => setShowFKDrawer(true)}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M9.21613 1.60535C9.80126 1.02022 10.7499 1.02022 11.3351 1.60535L12.3946 2.66483C12.9797 3.24997 12.9797 4.19866 12.3946 4.78379L11.4552 5.72316C11.3814 5.68665 11.3039 5.64716 11.2234 5.60481C10.6819 5.31974 10.0394 4.91965 9.55984 4.4401C9.08029 3.96055 8.6802 3.318 8.39513 2.77652C8.35278 2.69606 8.31328 2.61847 8.27676 2.54472L9.21613 1.60535Z" fill="currentColor"></path>
                                            <path d="M8.87238 5.12757C9.43984 5.69503 10.1615 6.14165 10.7331 6.44529L7.039 10.1394C6.80976 10.3686 6.51235 10.5173 6.19141 10.5632L3.96651 10.881C3.47208 10.9516 3.04829 10.5278 3.11892 10.0334L3.43677 7.80851C3.48261 7.48757 3.63132 7.19016 3.86056 6.96092L7.55464 3.26684C7.85827 3.83839 8.3049 4.56009 8.87238 5.12757Z" fill="currentColor"></path>
                                            <path d="M1.65286 11.8609C1.38439 11.8609 1.16675 12.0786 1.16675 12.3471C1.16675 12.6155 1.38439 12.8332 1.65286 12.8332H12.3473C12.6158 12.8332 12.8334 12.6155 12.8334 12.3471C12.8334 12.0786 12.6158 11.8609 12.3473 11.8609H1.65286Z" fill="currentColor"></path>
                                        </svg>
                                    </div>
                                </div>
                             )}

                        </div>
                        <Switch 
                            checked={isForeignKey}
                            onCheckedChange={handleFKSwitch}
                        />
                    </div>

                    {/* NOT NULL */}
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1 max-w-[350px]">
                             <span className="text-sm font-medium text-muted-foreground">Not Null</span>
                             <span className="text-xs text-muted-foreground">Restrict entry of NULL values in this column</span>
                        </div>
                        <Switch 
                            checked={isNotNull}
                            onCheckedChange={setIsNotNull}
                        />
                    </div>

                    {/* UNIQUE */}
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1 max-w-[350px]">
                             <span className="text-sm font-medium text-muted-foreground">Unique</span>
                             <span className="text-xs text-muted-foreground">Restrict entry of duplicate values</span>
                        </div>
                        <Switch 
                            checked={isUnique}
                            onCheckedChange={setIsUnique}
                        />
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background mt-auto flex justify-between items-center">
             <a href="#" className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                 <Info size={14} />
                 Read documentation
             </a>
             <div className="flex gap-3">
                 <Button variant="ghost" onClick={onClose}>Cancel</Button>
                 <Button 
                    onClick={handleCreate} 
                    disabled={!columnName.trim()}
                    className="gap-2"
                 >
                    Create <ArrowRight size={14} />
                 </Button>
             </div>
        </div>
      </div>

      {/* Nested Foreign Key Drawer */}
      <ForeignKeyDrawer
          isOpen={showFKDrawer}
          onClose={handleFKClose}
          sourceTableName={activeTableName}
          sourceColumnName={columnName}
          tables={tables}
          getTargetColumns={getTargetColumns}
          onSave={handleFKSave}
          onDelete={handleFKDelete}
          baseZIndex={80} // Higher than this drawer (70)
      />
    </>
  );

  return createPortal(content, document.body);
};

export default CreateColumnDrawer;