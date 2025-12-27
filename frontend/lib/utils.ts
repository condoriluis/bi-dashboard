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
  chartType?: 'bar' | 'bar-horizontal' | 'line' | 'area' | 'pie' | 'donut';
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
}

export function generateWidgetSQL(config: WidgetConfig): string {
  const { dataset, type, xAxis, yAxis, aggregation, limit, orderBy, orderDirection } = config;

  if (type === 'metric') {
    if (aggregation === 'COUNT') return `SELECT COUNT(*) as value FROM ${dataset}`;
    if (aggregation === 'NONE' && yAxis) return `SELECT ${yAxis} as value FROM ${dataset} LIMIT 1`;
    if (yAxis && aggregation) return `SELECT ${aggregation}(${yAxis}) as value FROM ${dataset}`;
    return `SELECT COUNT(*) as value FROM ${dataset}`;
  }

  if (type === 'map') {
    const { latAxis, lonAxis, labelAxis, sizeAxis, colorColumn } = config;
    if (!latAxis || !lonAxis) return "";

    const cols = [
      '*', // Fetch all columns to ensure tooltip has full context
      `${latAxis} as lat`,
      `${lonAxis} as lon`,
      labelAxis ? `${labelAxis} as label` : `'Point' as label`
    ];

    if (sizeAxis) cols.push(`${sizeAxis} as size`);
    if (colorColumn) cols.push(`${colorColumn} as color`);

    const shouldSort = orderBy && orderBy !== 'default_none';
    const sortClause = shouldSort ? `ORDER BY ${orderBy} ${orderDirection || 'ASC'}` : '';

    return `SELECT ${cols.join(', ')} FROM ${dataset} WHERE ${latAxis} IS NOT NULL AND ${lonAxis} IS NOT NULL ${sortClause} LIMIT ${limit || 1000}`;
  }

  if (type === 'chart') {
    if (xAxis && yAxis) {
      const isDirect = aggregation === 'NONE';
      const agg = aggregation || 'SUM';
      const breakdown = config.breakdown;

      const shouldSort = orderBy && orderBy !== 'default_none';
      let sortClause = '';

      if (shouldSort) {
        let sortCol = orderBy;
        const sortDir = orderDirection || 'ASC';

        if (sortCol === yAxis && !isDirect) sortCol = 'value';
        else if (sortCol === yAxis && isDirect) sortCol = yAxis;

        sortClause = `ORDER BY ${sortCol} ${sortDir}`;
      }

      if (isDirect) {

        const cols = [xAxis, breakdown, `${yAxis} as value`].filter(Boolean).join(', ');
        return `SELECT ${cols} FROM ${dataset} ${sortClause} LIMIT ${limit || 100}`;
      }

      const dims = [xAxis, breakdown].filter(Boolean);
      const groupClause = dims.length > 0 ? `GROUP BY ${dims.join(', ')}` : '';
      const selectDims = dims.join(', ');

      return `SELECT ${selectDims}, ${agg}(${yAxis}) as value FROM ${dataset} ${groupClause} ${sortClause} LIMIT ${limit || 100}`;
    }
    return `SELECT * FROM ${dataset} LIMIT ${limit || 100}`;
  }

  if (type === 'table') {
    const shouldSort = orderBy && orderBy !== 'default_none';
    const sortClause = shouldSort ? `ORDER BY ${orderBy} ${orderDirection || 'ASC'}` : '';
    return `SELECT * FROM ${dataset} ${sortClause} LIMIT ${limit || 10}`;
  }

  return "";
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
