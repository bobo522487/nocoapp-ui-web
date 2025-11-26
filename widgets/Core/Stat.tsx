import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { WidgetDefinition } from '../types';

const StatComponent: React.FC<any> = ({ title, value, trend }) => {
  return (
    <Card className="h-full w-full flex flex-col justify-between shadow-none border-0 bg-transparent pointer-events-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title || 'Stat'}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{value || '0'}</div>
            <p className="text-xs text-muted-foreground">
                {trend || '+0%'} from last month
            </p>
        </CardContent>
    </Card>
  );
};

export const StatWidget: WidgetDefinition = {
  manifest: {
    type: 'stat',
    name: 'Stat Card',
    icon: TrendingUp,
    category: 'Data',
    defaultSize: { w: 3, h: 3 },
    properties: [
      {
        group: 'General',
        fields: [
          { name: 'title', label: 'Title', type: 'text', defaultValue: 'Total Sales' },
          { name: 'value', label: 'Value', type: 'text', defaultValue: '$0.00' },
          { name: 'trend', label: 'Trend', type: 'text', defaultValue: '+0%' }
        ]
      }
    ]
  },
  component: StatComponent
};
