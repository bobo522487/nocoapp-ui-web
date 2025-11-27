
import { SchemaField } from '../types';
import { FileKey, Type, Mail, CheckCircle2, Calendar, DollarSign, Package, ShoppingCart, ArrowUpDown } from 'lucide-react';

export const MOCK_DB: Record<string, { schema: SchemaField[], records: any[] }> = {
    'users': {
        schema: [
            { id: 'id', name: 'ID', type: 'serial', width: 60, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'name', name: 'Name', type: 'varchar', width: 200, icon: Type, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '', flex: true },
            { id: 'email', name: 'Email', type: 'varchar', width: 250, icon: Mail, isPrimary: false, isUnique: true, isNullable: true, defaultValue: 'null', flex: true },
            { id: 'role', name: 'Role', type: 'varchar', width: 140, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Viewer' },
            { id: 'status', name: 'Status', type: 'varchar', width: 120, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Active' },
            { id: 'created', name: 'Created At', type: 'date with time', width: 180, icon: Calendar, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'now()', timeZone: 'UTC' },
        ],
        records: [
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', created: '2023-10-01' },
            { id: 2, name: 'Jane Smith', email: 'jane@company.com', role: 'Editor', status: 'Active', created: '2023-10-02' },
            { id: 3, name: 'Alice Johnson', email: 'alice@test.co', role: 'Viewer', status: 'Inactive', created: '2023-10-05' },
            { id: 4, name: 'Robert Brown', email: 'bob@domain.net', role: 'Editor', status: 'Active', created: '2023-10-10' },
            { id: 5, name: 'Charlie Davis', email: 'charlie@demo.org', role: 'Viewer', status: 'Active', created: '2023-10-12' },
            { id: 6, name: 'Diana Evans', email: 'diana@corp.com', role: 'Admin', status: 'Inactive', created: '2023-10-15' },
        ]
    },
    'orders': {
        schema: [
            { id: 'id', name: 'Order ID', type: 'serial', width: 80, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'customer', name: 'Customer', type: 'varchar', width: 200, icon: Type, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '', flex: true },
            { id: 'amount', name: 'Amount', type: 'float', width: 120, icon: DollarSign, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0.00' },
            { id: 'status', name: 'Status', type: 'varchar', width: 120, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Pending' },
            { id: 'date', name: 'Order Date', type: 'date with time', width: 160, icon: Calendar, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'now()', timeZone: 'Asia/Shanghai' },
        ],
        records: [
            { id: 1001, customer: 'John Doe', amount: 120.50, status: 'Completed', date: '2023-11-01' },
            { id: 1002, customer: 'Jane Smith', amount: 85.00, status: 'Processing', date: '2023-11-02' },
            { id: 1003, customer: 'Alice Johnson', amount: 240.00, status: 'Pending', date: '2023-11-03' },
            { id: 1004, customer: 'Robert Brown', amount: 45.99, status: 'Completed', date: '2023-11-04' },
        ]
    },
    'products': {
        schema: [
            { id: 'id', name: 'SKU', type: 'serial', width: 80, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'name', name: 'Product Name', type: 'varchar', width: 250, icon: Package, isPrimary: false, isUnique: true, isNullable: false, defaultValue: '', flex: true },
            { id: 'category', name: 'Category', type: 'varchar', width: 150, icon: CheckCircle2, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'General' },
            { id: 'price', name: 'Price', type: 'float', width: 100, icon: DollarSign, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0.00' },
            { id: 'stock', name: 'Stock', type: 'int', width: 100, icon: ShoppingCart, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0' },
        ],
        records: [
            { id: 501, name: 'Wireless Mouse', category: 'Electronics', price: 29.99, stock: 150 },
            { id: 502, name: 'Mechanical Keyboard', category: 'Electronics', price: 89.99, stock: 45 },
            { id: 503, name: 'Desk Chair', category: 'Furniture', price: 199.99, stock: 12 },
            { id: 504, name: 'Monitor 27"', category: 'Electronics', price: 249.50, stock: 30 },
        ]
    },
    'inventory_logs': {
        schema: [
            { id: 'id', name: 'Log ID', type: 'serial', width: 80, icon: FileKey, isPrimary: true, isUnique: true, isNullable: false, defaultValue: 'auto-inc' },
            { id: 'product', name: 'Product SKU', type: 'varchar', width: 150, icon: Package, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '' },
            { id: 'change', name: 'Quantity Change', type: 'int', width: 150, icon: ArrowUpDown, isPrimary: false, isUnique: false, isNullable: false, defaultValue: '0' },
            { id: 'reason', name: 'Reason', type: 'varchar', width: 150, icon: Type, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'Restock', flex: true },
            { id: 'timestamp', name: 'Timestamp', type: 'date with time', width: 180, icon: Calendar, isPrimary: false, isUnique: false, isNullable: false, defaultValue: 'now()', timeZone: 'America/New_York' },
        ],
        records: [
            { id: 1, product: 'SKU-501', change: 50, reason: 'Restock', timestamp: '2023-11-01 10:00 AM' },
            { id: 2, product: 'SKU-503', change: -2, reason: 'Sale', timestamp: '2023-11-01 11:30 AM' },
            { id: 3, product: 'SKU-502', change: -5, reason: 'Damage', timestamp: '2023-11-02 09:15 AM' },
        ]
    }
};
