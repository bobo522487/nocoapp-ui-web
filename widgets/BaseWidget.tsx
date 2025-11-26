import React from 'react';
import { WidgetDefinition } from './types';
import { GridItemData } from '../types';

interface BaseWidgetProps {
  definition: WidgetDefinition;
  item: GridItemData;
}

const BaseWidget: React.FC<BaseWidgetProps> = ({ definition, item }) => {
  const Component = definition.component;

  // We pass the content as flattened props for easier access in the component,
  // but also pass the full item if needed.
  return (
    <div className="w-full h-full relative">
      <Component item={item} {...(item.content || {})} title={item.title} />
    </div>
  );
};

export default BaseWidget;
