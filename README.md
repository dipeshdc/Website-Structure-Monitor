# Website Structure Monitoring Tool

Automated monitoring system to detect HTML structure changes using Playwright and BeautifulSoup. Includes logging, validation checks for missing data, and a lightweight testing workflow with pytest.

## Backend (Python + FastAPI)

### Run locally

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --port 8000
```

### Docker

```bash
cd backend
docker build -t structure-monitor-api .
docker run -p 8000:8000 structure-monitor-api
```

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE` to point to the backend if it is not running on `http://localhost:8000`.

## Monitoring workflow

- Create persistent monitors from the dashboard and let the scheduler run checks every minute.
- Use **Check now** for an immediate run.
- Use **Simulate change** to force a test-mode failure, then **Revert** to return to normal.

## Tests

```bash
cd backend
pytest
```
