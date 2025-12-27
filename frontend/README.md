# BI Dashboard - Frontend

Frontend moderno y responsivo para la aplicación de Dashboard de Inteligencia de Negocios.

## Tecnologías Principales
*   **Next.js 16** (App Router)
*   **React 19**
*   **TypeScript**
*   **Tailwind CSS v4**: Estilizado utility-first.
*   **Radix UI**: Componentes accesibles sin estilos (Headless UI).
*   **Visualización de Datos**:
    *   **ApexCharts**
    *   **Plotly.js**
*   **React Query**: Gestión de estado asíncrono y caché.
*   **Zod** & **React Hook Form**: Manejo y validación de formularios.

## Cómo Ejecutar

### Opción 1: Docker (Recomendado)
El frontend se ejecuta automáticamente junto con el backend al lanzar el stack completo desde la raíz del proyecto:
```bash
docker-compose up --build
```
Acceso: [http://localhost:3000](http://localhost:3000)

### Opción 2: Localmente (Desarrollo)
1.  Instalar dependencias:
    ```bash
    npm install
    # o
    npm ci
    ```
2.  Ejecutar servidor de desarrollo:
    ```bash
    npm run dev
    ```
    La aplicación estará en `http://localhost:3000`.

## Configuración
La conexión con el backend se configura a través de variables de entorno (ver `.env.example` para crear tu propio `.env`).

*   `NEXT_PUBLIC_API_URL`: URL base de la API (por defecto `http://localhost:8000/api/v1` en local, o `http://localhost:3001` si usas nuestra configuración Docker actual).
