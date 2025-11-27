
import { WidgetDefinition, WidgetRegistry } from './types';
import { ButtonWidget } from './Core/Button';
import { InputWidget } from './Core/Input';
import { TextWidget } from './Core/Text';
import { TableWidget } from './Core/Table';
import { ChartWidget } from './Core/Chart';
import { StatWidget } from './Core/Stat';

class RegistryImpl implements WidgetRegistry {
  private widgets: Map<string, WidgetDefinition> = new Map();

  register(def: WidgetDefinition) {
    this.widgets.set(def.manifest.type, def);
  }

  get(type: string) {
    return this.widgets.get(type);
  }

  getAll() {
    return Array.from(this.widgets.values());
  }

  getByCategory(category: string) {
    return this.getAll().filter(w => w.manifest.category === category);
  }

  getCategories() {
    const categories = new Set(this.getAll().map(w => w.manifest.category));
    return Array.from(categories).sort((a, b) => {
       const order = ['Commonly used', 'Data', 'Layout', 'Forms'];
       const idxA = order.indexOf(a);
       const idxB = order.indexOf(b);
       
       if (idxA !== -1 && idxB !== -1) return idxA - idxB;
       if (idxA !== -1) return -1;
       if (idxB !== -1) return 1;
       
       return a.localeCompare(b);
    });
  }
}

export const registry = new RegistryImpl();

// Register Core Widgets
registry.register(ButtonWidget);
registry.register(InputWidget);
registry.register(TextWidget);
registry.register(TableWidget);
registry.register(ChartWidget);
registry.register(StatWidget);
