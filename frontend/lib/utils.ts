import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface WidgetConfig {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map';
  title: string;
  dataset: string;
  chartType?: 'bar' | 'bar-horizontal' | 'line' | 'area' | 'pie' | 'donut' | 'heatmap' | 'scatter' | 'polarArea' | 'funnel' | 'column' | 'mixed';
  xAxis?: string;
  breakdown?: string;
  yAxis?: string;
  aggregation?: 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'NONE';
  limit?: number;
  colSpan?: 1 | 2 | 3 | 4;
  description?: string;
  color?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  // Map specific
  latAxis?: string;
  lonAxis?: string;
  labelAxis?: string;
  sizeAxis?: string;
  colorColumn?: string;
  tooltipColumns?: string[];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function buildSecureQuery(config: WidgetConfig) {
  const query: any = {
    table: config.dataset,
    columns: [],
    limit: config.limit !== undefined ? config.limit : 100
  };

  // Metric Widget
  if (config.type === 'metric') {
    query.limit = 1;

    if (config.aggregation === 'COUNT') {
      query.columns = [{ function: 'COUNT', column: '*', alias: 'value' }];
    } else if (config.aggregation === 'NONE' || !config.aggregation) {
      query.columns = [config.yAxis || '*'];
      if (config.yAxis) {
        query.columns = [{ column: config.yAxis, alias: 'value' }];
      }
    } else {
      query.columns = [{
        function: config.aggregation,
        column: config.yAxis,
        alias: 'value'
      }];
    }
  }
  // Chart Widget
  else if (config.type === 'chart') {
    const isDirect = config.aggregation === 'NONE';

    if (isDirect) {
      query.columns = [config.xAxis];
      if (config.breakdown) query.columns.push(config.breakdown);

      if (config.yAxis) {
        query.columns.push({ column: config.yAxis, alias: 'value' });
      }

      if (config.orderBy && config.orderBy !== 'default_none') {
        let sortCol = config.orderBy;
        if (sortCol === config.yAxis) sortCol = 'value';

        query.orderBy = [{
          column: sortCol,
          direction: config.orderDirection || 'ASC'
        }];
      }
    }
    // Aggregated Query
    else {
      query.columns = [config.xAxis];
      if (config.breakdown) query.columns.push(config.breakdown);

      if (config.aggregation === 'COUNT') {
        query.columns.push({ function: 'COUNT', column: '*', alias: 'value' });
      } else {
        query.columns.push({
          function: config.aggregation || 'SUM',
          column: config.yAxis || '*',
          alias: 'value'
        });
      }

      query.groupBy = [config.xAxis];
      if (config.breakdown) query.groupBy.push(config.breakdown);

      if (config.orderBy && config.orderBy !== 'default_none') {
        let sortCol = config.orderBy;
        if (sortCol === config.yAxis) sortCol = 'value';

        query.orderBy = [{
          column: sortCol,
          direction: config.orderDirection || 'ASC'
        }];
      }
    }
  }
  // Table Widget
  else if (config.type === 'table') {
    query.columns = ['*'];

    if (config.orderBy && config.orderBy !== 'default_none') {
      query.orderBy = [{
        column: config.orderBy,
        direction: config.orderDirection || 'ASC'
      }];
    }

    query.limit = config.limit !== undefined ? config.limit : 10;
  }
  // Map Widget
  else if (config.type === 'map') {
    query.columns = [];
    if (config.latAxis) query.columns.push({ column: config.latAxis, alias: 'lat' });
    if (config.lonAxis) query.columns.push({ column: config.lonAxis, alias: 'lon' });

    if (config.labelAxis) query.columns.push({ column: config.labelAxis, alias: 'label' });
    else query.columns.push({ column: "'Point'", alias: 'label' });

    if (config.sizeAxis) query.columns.push({ column: config.sizeAxis, alias: 'size' });
    if (config.colorColumn) query.columns.push({ column: config.colorColumn, alias: 'color' });

    if (config.tooltipColumns && config.tooltipColumns.length > 0) {
      config.tooltipColumns.forEach(col => {
        const isUsed = [config.latAxis, config.lonAxis].includes(col);
        if (!isUsed) {
          query.columns.push(col);
        }
      });
    } else if (!config.tooltipColumns) {
      query.columns.push('*');
    }

    query.where = [];

    query.limit = config.limit !== undefined ? config.limit : 1000;
  }

  return query;
}
