
import React from 'react';
import { Table as TableIcon, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { WidgetDefinition, WidgetProps } from '../types';

const TableComponent: React.FC<WidgetProps> = ({ title, showHeader, data, _query }) => {
  // Determine which columns to show
  const columns = _query?.definition?.select || [];
  const rows = Array.isArray(data) ? data : [];
  
  // Fallback to all keys if no columns selected, or first 3
  const displayColumns = columns.length > 0 
    ? columns 
    : (rows.length > 0 ? Object.keys(rows[0]).slice(0, 3) : []);

  // Use mock data if no real data bound
  const hasData = rows.length > 0;
  const displayRows = hasData ? rows : [1, 2, 3];

  return (
    <Card className="h-full w-full flex flex-col shadow-none border-0 bg-transparent pointer-events-none">
        {showHeader !== false && (
            <CardHeader className="p-4 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-base truncate mr-2">{title || 'Table'}</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><ArrowUpRight size={14}/></Button>
            </CardHeader>
        )}
        <CardContent className="p-0 flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
             <div className="min-w-full inline-block align-middle">
                 {hasData ? (
                     <table className="min-w-full divide-y divide-border">
                         <thead className="bg-muted/30">
                             <tr>
                                 {displayColumns.map((col: string) => (
                                     <th key={col} scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                         {col}
                                     </th>
                                 ))}
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-border">
                             {rows.map((row: any, i: number) => (
                                 <tr key={row.id || i}>
                                     {displayColumns.map((col: string) => (
                                         <td key={`${i}-${col}`} className="px-4 py-2 whitespace-nowrap text-xs text-foreground">
                                             {String(row[col])}
                                         </td>
                                     ))}
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 ) : (
                     <div className="space-y-4 px-4 pt-2">
                        {displayRows.map(i => (
                            <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">ID</div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-muted-foreground">Sample Data</span>
                                        <span className="text-xs text-muted-foreground opacity-70">Connect data source</span>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-muted-foreground">--</div>
                            </div>
                        ))}
                     </div>
                 )}
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
    category: 'Data',
    defaultSize: { w: 6, h: 6 },
    properties: [
      { 
          name: 'title', 
          label: 'Title', 
          type: 'string', 
          defaultValue: 'Recent Transactions', 
          group: 'Basic',
          setter: { component: 'text' }
      },
      {
          name: 'w',
          label: 'Width',
          type: 'number',
          target: 'root',
          defaultValue: 6,
          group: 'Basic',
          setter: {
              component: 'buttonGroup',
              props: {
                  options: [
                      { label: '1/4', value: 3 },
                      { label: '1/3', value: 4 },
                      { label: '1/2', value: 6 },
                      { label: '2/3', value: 8 },
                      { label: '3/4', value: 9 },
                      { label: 'Full', value: 12 },
                  ]
              }
          }
      },
      {
          name: 'showHeader',
          label: 'Show Header',
          type: 'boolean',
          defaultValue: true,
          group: 'Style',
          setter: { component: 'switch' }
      }
    ],
    data: {
        hasDataSource: true,
        dataType: 'array'
    },
    events: [
        { name: 'rowClick', label: 'Row Click' },
        { name: 'pageChange', label: 'Page Change' }
    ]
  },
  component: TableComponent
};
