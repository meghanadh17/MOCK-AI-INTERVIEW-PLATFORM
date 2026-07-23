# MockAi - SQL Database Schema & Configuration

This directory contains the schema scripts for the **MockAi** core relational database. The schema structure supports user profiles, session histories, resume scores, adaptive Q&A questions, video frame analysis telemetry metrics, and quizzes.

---

## 🏛 Schema Modules

The schema in [`schema.sql`](file:///e:/MocrAI/database/schema.sql) is organized into logical domain modules:

1. **Users & Auth Domain**:
   - `users`: Core profile metadata (with soft deletion supports via `deleted_at`).
   - `refresh_tokens`: Session lifecycle management and token rotation logs.
2. **Resume Domain**:
   - `resumes`: File paths, ATS calculation grades, and RAG index collections.
   - `resume_sections`: Parse segments mapped to specific document topics.
3. **Mock Interview Session Domain**:
   - `interview_sessions`: General session statuses, difficulty constraints, and metrics.
   - `interview_questions`: Generated prompts, candidate text answers, and AI-powered feedback.
4. **Behavioral Video Interview Domain**:
   - `video_sessions`: Posture scores, gaze detection ratios, and vocabulary pace summaries.
   - `frame_metrics`: Gaze coordinates and emotion probabilities logged per timestamp.
   - `speech_segments`: Transcripts, pauses, energy, and pitch metrics parsed by speech-to-text.
5. **Quiz & Leaderboards Domain**:
   - `quizzes`: Conceptual test headers.
   - `quiz_questions`: Multi-choice items (with option lists stored in JSON format).
   - `quiz_attempts`: Score summaries and responses.
6. **Job Recommendations Domain**:
   - `job_listings`: Requirements, salaries, and semantic descriptions.
   - `saved_jobs` & `job_matches`: Saved list bookmarks and matching parameters.

---

## 🚀 Database Schema Initialization

To import and initialize this schema on your database server (e.g., MySQL or MariaDB), follow these steps:

### 1. Execute SQL Import
Ensure your local or remote database server is running, then run this command from your command-line interface:
```bash
mysql -u your_username -p < schema.sql
```
*Alternatively, you can copy the contents of `schema.sql` and run them directly in your SQL editor (like DBeaver, MySQL Workbench, or phpMyAdmin).*

### 2. Configure Backend Connection String
Once the database is initialized, wire it into the backend by updating your `.env` configuration file inside the [`/backend`](file:///e:/MocrAI/backend) directory:

```env
# Example connection strings:
DATABASE_URL=mysql+aiomysql://your_username:your_password@localhost:3306/mocrai
```
*Note: The platform also supports SQLite databases for local dev environments where MySQL servers are not present.*
