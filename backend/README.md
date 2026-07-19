# backend

A project created with FastAPI CLI.

## Quick Start

### Start the development server

```bash
uv run fastapi dev
```

Visit http://localhost:8000

## Environment

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update the values as needed.
3. Settings are validated when FastAPI starts — missing required values fail at startup.

### Deploy to FastAPI Cloud

Sign up and log in at https://fastapicloud.com, then deploy with:

```bash
uv run fastapi deploy
```

## Project Structure

- `app/main.py` - Creates the FastAPI application and includes the top-level router
- `app/api/router.py` - Top-level API router that aggregates the route modules
- `app/api/routes/root.py` - Root route (`GET /`)
- `app/core/config.py` - Application settings loaded from the environment / `.env`
- `pyproject.toml` - Project dependencies and the FastAPI entrypoint (`app.main:app`)

## Learn More

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [FastAPI Cloud](https://fastapicloud.com)
