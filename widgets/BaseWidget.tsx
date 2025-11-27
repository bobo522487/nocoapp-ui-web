
import React, { useMemo } from 'react';
import { WidgetDefinition } from './types';
import { GridItemData } from '../types';
import { resolveData } from './utils/queryEngine';

interface BaseWidgetProps {
  definition: WidgetDefinition;
  item: GridItemData;
}

const BaseWidget: React.FC<BaseWidgetProps> = ({ definition, item }) => {
  const Component = definition.component;

  // Resolve Data if widget has a query
  const resolvedData = useMemo(() => {
      if (item.content && item.content._query) {
          return resolveData(item.content._query);
      }
      return null;
  }, [item.content]);

  // We pass the content as flattened props, plus `data` and `_query` explicitly
  return (
    <div className="w-full h-full relative">
      <Component 
        item={item} 
        {...(item.content || {})} 
        title={item.title} 
        data={resolvedData}
      />
    </div>
  );
};

export default BaseWidget;
