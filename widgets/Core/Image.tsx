
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { WidgetDefinition, WidgetProps } from '../types';

const ImageComponent: React.FC<WidgetProps> = ({ src, alt, objectFit, borderRadius }) => {
  return (
    <div className="w-full h-full overflow-hidden bg-muted/20 flex items-center justify-center" style={{ borderRadius: `${borderRadius || 0}px` }}>
      {src ? (
        <img 
            src={src} 
            alt={alt || 'Image'}
            className="w-full h-full pointer-events-none block"
            style={{ objectFit: objectFit || 'cover' }}
        />
      ) : (
        <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
            <ImageIcon size={24} className="mb-2 opacity-50" />
            <span className="text-[10px]">Set Image Source</span>
        </div>
      )}
    </div>
  );
};

export const ImageWidget: WidgetDefinition = {
  manifest: {
    type: 'image',
    name: 'Image',
    icon: ImageIcon,
    category: 'Media',
    defaultSize: { w: 4, h: 4 },
    properties: [
      {
        name: 'src',
        label: 'Image URL',
        type: 'string',
        defaultValue: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
        group: 'Basic',
        setter: { component: 'text' }
      },
      {
        name: 'alt',
        label: 'Alt Text',
        type: 'string',
        defaultValue: 'Product Image',
        group: 'Basic',
        setter: { component: 'text' }
      },
      {
          name: 'w',
          label: 'Width',
          type: 'number',
          target: 'root',
          defaultValue: 4,
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
        name: 'objectFit',
        label: 'Fit',
        type: 'string',
        defaultValue: 'cover',
        group: 'Style',
        setter: {
          component: 'select',
          props: {
            options: [
              { label: 'Cover', value: 'cover' },
              { label: 'Contain', value: 'contain' },
              { label: 'Fill', value: 'fill' }
            ]
          }
        }
      },
      {
        name: 'borderRadius',
        label: 'Radius',
        type: 'number',
        defaultValue: 8,
        group: 'Style',
        setter: { component: 'number' }
      }
    ]
  },
  component: ImageComponent
};
