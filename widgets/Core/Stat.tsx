
import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { WidgetDefinition, WidgetProps } from '../types';

const StatComponent: React.FC<WidgetProps> = ({ title, value, trend, showIcon, data }) => {
  
  // Calculate value from data if available
  let displayValue = value;
  if (data) {
      if (Array.isArray(data)) {
          displayValue = data.length.toString(); // Default to count
      } else if (typeof data === 'object') {
          // If query returned a single object (e.g. aggregation result in future)
          displayValue = Object.values(data)[0] as string;
      }
  }

  return (
    <Card className="h-full w-full flex flex-col justify-between shadow-none border-0 bg-transparent pointer-events-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title || 'Stat'}</CardTitle>
            {showIcon !== false && <TrendingUp className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{displayValue || '0'}</div>
            <p className="text-xs text-muted-foreground">
                {trend || (data ? 'Total Records' : '+0% from last month')}
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
          name: 'title', 
          label: 'Title', 
          type: 'string', 
          defaultValue: 'Total Sales', 
          group: 'General',
          setter: { component: 'text' }
      },
      { 
          name: 'value', 
          label: 'Value', 
          type: 'string', 
          defaultValue: '$0.00', 
          group: 'Data',
          setter: { component: 'text' }
      },
      { 
          name: 'trend', 
          label: 'Trend', 
          type: 'string', 
          defaultValue: '+0%', 
          group: 'Data',
          setter: { component: 'text' }
      },
      {
          name: 'showIcon',
          label: 'Show Icon',
          type: 'boolean',
          defaultValue: true,
          group: 'Style',
          setter: { component: 'switch' }
      }
    ],
    data: {
        hasDataSource: true,
        dataType: 'object'
    },
    events: [
        { name: 'click', label: 'On Click' }
    ]
  },
  component: StatComponent
};
