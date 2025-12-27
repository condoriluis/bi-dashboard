# BI Dashboard - Backend

Backend para la aplicación de Dashboard de Inteligencia de Negocios, desarrollado con **FastAPI** y **DuckDB**.

## Tecnologías
*   **Python 3.10**
*   **FastAPI**: Framework web moderno y rápido.
*   **DuckDB**: Base de datos OLAP embebida para análisis de datos rápidos.
*   **Pydantic**: Validación de datos.
*   **Pandas**: Manipulación de datos.

## Cómo Ejecutar

### Opción 1: Docker (Recomendado)
Desde la raíz del proyecto (donde está el `docker-compose.yml`):
```bash
docker-compose up --build
```
El backend estará disponible en: [http://localhost:3001](http://localhost:3001)

### Opción 2: Localmente
1.  Instalar dependencias:
    ```bash
    pip install -r requirements.txt
    ```
2.  Ejecutar servidor:
    ```bash
    uvicorn main:app --reload --port 8000
    ```


## Configuración
El backend utiliza variables de entorno para su configuración. Puedes crear un archivo `.env` en este directorio basado en `.env.example`:

*   `DUCKDB_PATH`: Ruta al archivo de base de datos (por defecto `bi_analytics.duckdb`).
*   `SECRET_KEY`: Clave secreta para seguridad (JWT, etc.). ¡Cambiar en producción!

## Credenciales por Defecto (Development)
El sistema crea automáticamente un usuario administrador al iniciar:

*   **Email:** `admin@dashboard.com`
*   **Password:** `admin`

## Documentación API
Una vez ejecutando, puedes ver la documentación interactiva (Swagger UI) en:
*   `/docs` (ej. http://localhost:3001/docs)

## Gestión de Usuarios
El proyecto incluye scripts utilitarios para gestión administrativa:

### Eliminar Usuario
Para borrar un usuario de la base de datos DuckDB persistente:
```bash
docker-compose exec backend python delete_user.py "usuario@email.com"
```
