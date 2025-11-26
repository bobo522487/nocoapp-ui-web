import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { WidgetDefinition } from '../types';

const ChartComponent: React.FC<any> = ({ title }) => {
  return (
    <Card className="h-full w-full flex flex-col shadow-none border-0 bg-transparent pointer-events-none">
        <CardHeader className="p-4">
            <CardTitle className="text-base">{title || 'Chart'}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1">
             <div className="w-full h-full flex items-end justify-between gap-2 px-2 pb-2">
                {[40, 65, 30, 70, 45, 80, 55, 30, 60, 45, 85, 50].map((h, i) => (
                    <div 
                        key={i} 
                        className="bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm w-full"
                        style={{ height: `${h}%` }}
                    ></div>
                ))}
             </div>
        </CardContent>
    </Card>
  );
};

export const ChartWidget: WidgetDefinition = {
  manifest: {
    type: 'chart',
    name: 'Chart',
    icon: BarChart3,
    category: 'Data',
    defaultSize: { w: 6, h: 6 },
    properties: [
      {
        group: 'General',
        fields: [
          { name: 'title', label: 'Title', type: 'text', defaultValue: 'Revenue Overview' }
        ]
      }
    ]
  },
  component: ChartComponent
};
