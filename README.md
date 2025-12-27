# BI Dashboard Project

Sistema integral de Dashboard de Inteligencia de Negocios compuesto por un frontend en Next.js y un backend en FastAPI con DuckDB.

## Estructura del Proyecto

*   **[frontend/](./frontend/)**: Aplicación web moderna construida con Next.js 16, React 19 y Tailwind CSS.
*   **[backend/](./backend/)**: API RESTful construida con FastAPI y DuckDB para el procesamiento de datos.

## Inicio Rápido con Docker

La forma más sencilla de ejecutar todo el sistema es utilizando Docker Compose desde esta carpeta raíz:

```bash
docker-compose up --build
```

Esto iniciará:
*   **Frontend**: [http://localhost:3000](http://localhost:3000)
*   **Backend API**: [http://localhost:3001](http://localhost:3001)
*   **Backend Docs**: [http://localhost:3001/docs](http://localhost:3001/docs)

Para más detalles, consulta los README específicos de cada carpeta.
