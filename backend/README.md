# Smart AI-Based Mock Interview Platform Backend

Enterprise-Grade Backend Service Layer utilizing **Domain-Driven Architecture (DDD)**, Async PostgreSQL transactions, asynchronous task queues, and advanced RAG processing.

---

## 🛠 Tech Stack

* **Language**: Python 3.12
* **Framework**: FastAPI (Async ASGI framework)
* **ORM & Database**: Async SQLAlchemy 2.0 + PostgreSQL 16 / SQLite (local testing)
* **Task Queue**: Celery 5.4 + Redis 7 (broker & result backend)
* **Vector Store**: ChromaDB & FAISS (retrieval indexing)
* **LLM Engine**: MistralAI API (evaluation analytics)

---

## 📂 Folder Architecture

* `app/core/`: Application settings, security hashes, trace logging, and global HTTP exception handlers.
* `app/database/`: Database engines, transaction sessions, and generic Repository patterns.
* `app/domains/`: Self-contained business modules (routers, databases models, schema validators, and services):
  * `auth/`: Security, token issuance, and OTP verification.
  * `resume/`: File parsers and ATS scorers.
  * `interview/`: Adaptive Q&A generator pipelines.
  * `video_interview/`: Gaze and posture tracking capture.
  * `session_review/`: Historical review logs.
  * `quiz/`: Conceptual evaluations.
  * `jobs/`: Semantic job matching indexers.
* `app/ai/`: RAG pipelines, chunkers, rankers, and dense/sparse indexing services.
* `app/tasks/`: Asynchronous Celery background workers.

---

## 🚀 Unified Execution CLI: `start.py`

To simplify developer workflow, we provide a unified startup manager script `start.py` in the backend root. It launches both the **FastAPI Uvicorn web server** and the **Celery worker task queue** concurrently with one command, intercepts their output pipes, injects clean log banners, and applies color-coded logging.

### Prerequisites

Ensure you have created your virtual environment and installed all dependencies:
```bash
python -m venv venv
.\venv\Scripts\activate      # Windows
source venv/bin/activate    # Linux/macOS
pip install -r requirements.txt
```

Ensure a Redis server instance is running on your configured broker port (default `localhost:6379`).

### CLI Usage

```bash
python start.py [options]
```

#### Available CLI Options:

| Command Argument | Default | Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| `--host` | `127.0.0.1` | Any valid IP | Host binding address for Uvicorn |
| `--port` | `8000` | Any valid port | Port binding address for Uvicorn |
| `--reload` | `True` | N/A | Enables code hot-reloading for Uvicorn |
| `--no-reload` | N/A | N/A | Disables code hot-reloading |
| `--loglevel` | `info` | `debug`, `info`, `warning`, `error`, `critical` | Log severity constraint for Celery |
| `--pool` | *Auto-detected* | `solo`, `prefork`, `eventlet` | Celery task worker execution pool type |
| `--mode` | `both` | `both`, `web`, `worker` | Start both systems, only FastAPI web, or only Celery |

#### Examples:

* **Start both Web & worker (recommended for local development)**:
  ```bash
  python start.py
  ```
  *(On Windows systems, this automatically selects `--pool=solo` to prevent multiprocessing lock issues)*

* **Launch Web Server only in production mode (no-reload, custom port)**:
  ```bash
  python start.py --mode web --no-reload --port 8000 --host 0.0.0.0
  ```

* **Launch worker only with custom debugging output**:
  ```bash
  python start.py --mode worker --loglevel debug
  ```

---

## 💾 Database Migrations (Alembic)

Database schema updates are managed using Alembic:

* **Generate a new migration script**:
  ```bash
  alembic revision --autogenerate -m "description of changes"
  ```
* **Apply all pending migrations to the database**:
  ```bash
  alembic upgrade head
  ```

---

## 🧪 Testing Suite

Execute tests inside the local virtual environment:
```bash
pytest --asyncio-mode=auto tests/
```

---

## 🧠 13.2 RAG Architecture Summary

| RAG Component | Implementation | Why This Approach |
| :--- | :--- | :--- |
| **Chunking** | Hierarchical: parent (1024 tok) + child (256 tok) | Precise retrieval + rich context generation |
| **Embedding** | `all-mpnet-base-v2` bi-encoder (768-dim) | Best balance of quality vs. speed |
| **Dense Store** | ChromaDB (persistent) + FAISS (in-memory) | ChromaDB for durability, FAISS for low-latency |
| **Sparse** | BM25 Okapi (rank-bm25) | Catches exact keywords semantic search misses |
| **Fusion** | Reciprocal Rank Fusion (RRF, $k=60$) | Canonical, parameter-free hybrid ranking |
| **Re-ranking** | `ms-marco-MiniLM-L-6-v2` cross-encoder | Dramatically improves top-5 precision |
| **Context Injection** | Parent document expansion + compression | Provides surrounding context, respects token budget |