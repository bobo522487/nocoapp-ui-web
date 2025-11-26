import React from 'react';
import { Table as TableIcon, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { WidgetDefinition } from '../types';

const TableComponent: React.FC<any> = ({ title }) => {
  return (
    <Card className="h-full w-full flex flex-col shadow-none border-0 bg-transparent pointer-events-none">
        <CardHeader className="p-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base">{title || 'Table'}</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6"><ArrowUpRight size={14}/></Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
             <div className="space-y-4 px-4">
                {[1,2,3].map(i => (
                    <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">OM</div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">User Name</span>
                                <span className="text-xs text-muted-foreground">user@email.com</span>
                            </div>
                        </div>
                        <div className="text-sm font-medium">+$1,999.00</div>
                    </div>
                ))}
             </div>
        </CardContent>
    </Card>
  );
};

export const TableWidget: WidgetDefinition = {
  manifest: {
    type: 'table',
    name: 'Table',
    icon: TableIcon,
    category: 'Commonly used',
    defaultSize: { w: 6, h: 8 },
    properties: [
      {
        group: 'General',
        fields: [
          { name: 'title', label: 'Title', type: 'text', defaultValue: 'Recent Transactions' }
        ]
      }
    ]
  },
  component: TableComponent
};
