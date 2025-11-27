
import { MOCK_DB } from '../../store/mockData';

export const resolveData = (queryConfig: any) => {
    if (!queryConfig || !queryConfig.definition || !queryConfig.definition.tableId) {
        return null;
    }

    const { tableId, select, limit, orderBy, orderDir } = queryConfig.definition;
    const table = MOCK_DB[tableId];
    
    if (!table) return [];

    let data = [...table.records];

    // Sort
    if (orderBy) {
        data.sort((a, b) => {
            const valA = a[orderBy];
            const valB = b[orderBy];
            if (valA === valB) return 0;
            // Handle numbers/strings
            if (valA < valB) return orderDir === 'desc' ? 1 : -1;
            return orderDir === 'desc' ? -1 : 1;
        });
    }

    // Select (Simple Projection)
    // In a real DB we would only fetch these fields. 
    // Here we might just filter keys or return full objects.
    // For simplicity, we return full objects but widgets might use `select` metadata to choose what to display.

    // Limit
    if (limit && limit > 0) {
        data = data.slice(0, limit);
    }

    return data;
};
