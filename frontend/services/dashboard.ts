import api from '@/lib/api';
import { WidgetConfig } from '@/lib/utils';

export interface DashboardItem {
    id: string;
    dashboard_id?: string;
    type: string;
    title?: string;
    config: any;
    created_at?: string;
}

export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    items: DashboardItem[];
    created_at: string;
    updated_at: string;
}

export const dashboardService = {
    async list(): Promise<Dashboard[]> {
        const response = await api.get<Dashboard[]>('/dashboards/');
        return response.data;
    },

    async get(id: string): Promise<Dashboard> {
        const response = await api.get<Dashboard>(`/dashboards/${id}`);
        return response.data;
    },

    async create(name: string, description?: string): Promise<Dashboard> {
        const response = await api.post<Dashboard>('/dashboards/', { name, description });
        return response.data;
    },

    async updateLayout(dashboardId: string, items: WidgetConfig[]): Promise<Dashboard> {

        const payloadItems = items.map(item => ({
            id: item.id,
            type: item.type,
            title: item.title,
            config: item
        }));

        const response = await api.put<Dashboard>(`/dashboards/${dashboardId}/layout`, {
            items: payloadItems
        });
        return response.data;
    },

    async update(id: string, name: string, description?: string): Promise<Dashboard> {
        const response = await api.put<Dashboard>(`/dashboards/${id}`, { name, description });
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/dashboards/${id}`);
    }
};
