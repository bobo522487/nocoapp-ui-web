import { useAppStore } from '../../store/useAppStore';
import { MOCK_DB } from '../../store/mockData';

export const resolveData = (queryConfig: any) => {
    if (!queryConfig || !queryConfig.definition || !queryConfig.definition.tableId) {
        return null;
    }

    const { tableId, select, limit, orderBy, orderDir } = queryConfig.definition;
    
    // Read from the single source of truth in store, fallback to MOCK_DB
    const storeRecords = useAppStore.getState().records[tableId];
    const rawRecords = storeRecords || MOCK_DB[tableId]?.records;
    
    if (!rawRecords) return [];

    let data = [...rawRecords];

    // Sort
    if (orderBy) {
        data.sort((a, b) => {
            const valA = a[orderBy];
            const valB = b[orderBy];
            if (valA === valB) return 0;
            if (valA < valB) return orderDir === 'desc' ? 1 : -1;
            return orderDir === 'desc' ? -1 : 1;
        });
    }

    // Projection / Filtering if select is provided
    if (select && Array.isArray(select) && select.length > 0) {
        // We preserve full objects or project based on requirements
        // Widgets like TableWidget and ChartWidget use select to render keys
    }

    // Limit
    if (limit && limit > 0) {
        data = data.slice(0, limit);
    }

    return data;
};
