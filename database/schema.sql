CREATE DATABASE IF NOT EXISTS mocrai;
USE mocrai;

-- =========================================================================
-- 6.1 Users & Auth Domain (OAuth removed)
-- =========================================================================

CREATE TABLE IF NOT EXISTS users (
  id               CHAR(36) PRIMARY KEY,
  email            VARCHAR(320) NOT NULL UNIQUE,
  hashed_password  TEXT,
  full_name        VARCHAR(255),
  avatar_url       TEXT,
  role             VARCHAR(20) NOT NULL DEFAULT 'user',
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret       TEXT,
  preferences      JSON,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP NULL,     -- Soft delete
  CONSTRAINT chk_role CHECK (role IN ('user','admin','moderator'))
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           CHAR(36) PRIMARY KEY,
  user_id      CHAR(36) NOT NULL,
  token_hash   VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 of token
  family_id    CHAR(36) NOT NULL,           -- Token rotation family
  is_revoked   BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at   TIMESTAMP NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent   TEXT,
  ip_address   VARCHAR(45),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_rt_user_id ON refresh_tokens(user_id);

-- =========================================================================
-- 6.2 Resume Domain
-- =========================================================================

CREATE TABLE IF NOT EXISTS resumes (
  id                   CHAR(36) PRIMARY KEY,
  user_id              CHAR(36) NOT NULL,
  file_name            VARCHAR(512) NOT NULL,
  file_path            TEXT NOT NULL,                    -- Storage path
  file_size_bytes      INTEGER,
  parse_status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  parse_strategy       VARCHAR(30),                      -- Which strategy succeeded
  parse_confidence     FLOAT,                           -- 0.0 – 1.0
  ats_score            SMALLINT,                        -- 0 – 100
  parsed_text          TEXT,
  skill_summary        JSON,
  chroma_collection_id VARCHAR(255),                            -- Vector store ref
  word_count           INTEGER,
  page_count           SMALLINT,
  is_primary           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_parse_status CHECK (parse_status IN ('pending','processing','success','failed'))
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_status  ON resumes(parse_status);

CREATE TABLE IF NOT EXISTS resume_sections (
  id           CHAR(36) PRIMARY KEY,
  resume_id    CHAR(36) NOT NULL,
  section_type VARCHAR(60) NOT NULL,   -- 'EXPERIENCE' | 'EDUCATION' | 'SKILLS' | ...
  content      TEXT NOT NULL,
  order_index  SMALLINT NOT NULL,
  word_count   INTEGER,
  chunk_count  SMALLINT,               -- Number of RAG chunks in this section
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE INDEX idx_rs_resume_id ON resume_sections(resume_id);

CREATE TABLE IF NOT EXISTS parsed_entities (
  id           CHAR(36) PRIMARY KEY,
  resume_id    CHAR(36) NOT NULL,
  entity_type  VARCHAR(60) NOT NULL,   -- 'SKILL' | 'ROLE' | 'COMPANY' | etc.
  value        VARCHAR(255) NOT NULL,
  evidence     TEXT NULL,
  proficiency  VARCHAR(50) NULL,       -- 'Beginner' | 'Intermediate' | 'Expert'
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE INDEX idx_pe_resume_id ON parsed_entities(resume_id);

-- =========================================================================
-- 6.3 Interview Domain
-- =========================================================================

CREATE TABLE IF NOT EXISTS interview_sessions (
  id                  CHAR(36) PRIMARY KEY,
  user_id             CHAR(36) NOT NULL,
  resume_id           CHAR(36) NULL,
  title               VARCHAR(255) NOT NULL,
  interview_type      VARCHAR(50)  NOT NULL DEFAULT 'technical',
  job_description     TEXT NULL,
  difficulty          FLOAT       NOT NULL DEFAULT 0.5,
  status              VARCHAR(20) NOT NULL DEFAULT 'created',
  total_questions     SMALLINT    NOT NULL DEFAULT 10,
  answered_count      SMALLINT    NOT NULL DEFAULT 0,
  skipped_count       SMALLINT    NOT NULL DEFAULT 0,
  total_score         FLOAT,              -- 0 – 10, set on completion
  technical_score     FLOAT,              -- Dimension scores
  communication_score FLOAT,
  confidence_score    FLOAT,
  structure_score     FLOAT,
  relevance_score     FLOAT,
  duration_seconds    INTEGER,
  started_at          TIMESTAMP NULL,
  ended_at            TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
  CONSTRAINT chk_difficulty CHECK (difficulty BETWEEN 0 AND 1),
  CONSTRAINT chk_status CHECK (status IN ('created','active','paused','completed','abandoned'))
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id               CHAR(36) PRIMARY KEY,
  interview_id     CHAR(36) NOT NULL,
  question_text    TEXT NOT NULL,
  question_type    VARCHAR(50),
  difficulty       FLOAT,
  expected_keywords JSON,
  ideal_outline    TEXT,
  answer_text      TEXT,
  ai_score         FLOAT,              -- 1 – 10
  ai_feedback      TEXT,
  dimension_scores JSON, -- {technical, comm, conf, struct, rel}
  hints_used       SMALLINT NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  order_index      SMALLINT NOT NULL,
  is_skipped       BOOLEAN NOT NULL DEFAULT FALSE,
  asked_at         TIMESTAMP NULL,
  answered_at      TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_iq_interview_id ON interview_questions(interview_id);

CREATE TABLE IF NOT EXISTS question_bank (
  id                CHAR(36) PRIMARY KEY,
  question_text     TEXT NOT NULL,
  question_type     VARCHAR(50) NOT NULL DEFAULT 'technical',
  role              VARCHAR(100) NOT NULL,
  difficulty        FLOAT NOT NULL DEFAULT 0.5,
  expected_keywords JSON NULL,
  ideal_outline     TEXT NULL,
  rating_sum        FLOAT NOT NULL DEFAULT 0.0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_bank_ratings (
  id          CHAR(36) PRIMARY KEY,
  question_id CHAR(36) NOT NULL,
  user_id     CHAR(36) NOT NULL,
  rating      INTEGER NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_qbr_question ON question_bank_ratings(question_id);
CREATE INDEX idx_qbr_user ON question_bank_ratings(user_id);

-- =========================================================================
-- 6.4 Video Interview Domain
-- =========================================================================

CREATE TABLE IF NOT EXISTS video_sessions (
  id                   CHAR(36) PRIMARY KEY,
  user_id              CHAR(36) NOT NULL,
  resume_id            CHAR(36) NULL,
  interview_session_id CHAR(36) NULL,
  webrtc_room_id       VARCHAR(100) NULL,
  recording_file_path  TEXT,
  recording_duration_s INTEGER,
  frame_count          INTEGER DEFAULT 0,
  status               VARCHAR(20) NOT NULL DEFAULT 'created',
  avg_posture_score    FLOAT,
  avg_eye_contact      FLOAT,
  avg_confidence       FLOAT,
  dominant_emotion     VARCHAR(30),
  avg_wpm              FLOAT,
  filler_word_count    INTEGER,
  silence_ratio        FLOAT,
  clarity_score        FLOAT,
  turn_server_used     BOOLEAN DEFAULT FALSE,
  browser_info         JSON,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
  FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS frame_metrics (
  id                   CHAR(36) PRIMARY KEY,
  video_session_id     CHAR(36) NOT NULL,
  timestamp_ms         INTEGER NOT NULL,
  spine_angle          FLOAT,
  shoulder_tilt        FLOAT,
  head_tilt            FLOAT,
  forward_lean         FLOAT,
  posture_score        FLOAT,
  gaze_x               FLOAT,
  gaze_y               FLOAT,
  eye_contact_score    FLOAT,
  blink_detected       BOOLEAN,
  emotion_label        VARCHAR(20),
  emotion_confidence   FLOAT,
  emotion_scores       JSON,  -- All 7 emotion probabilities
  landmarks_json       JSON,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_session_id) REFERENCES video_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_fm_video_session ON frame_metrics(video_session_id, timestamp_ms);

CREATE TABLE IF NOT EXISTS speech_segments (
  id               CHAR(36) PRIMARY KEY,
  video_session_id CHAR(36) NOT NULL,
  start_ms         INTEGER NOT NULL,
  end_ms           INTEGER NOT NULL,
  transcript_text  TEXT,
  wpm              FLOAT,
  filler_words     JSON,   -- [{word, count, timestamps}]
  pause_count      SMALLINT,
  clarity_score    FLOAT,
  pitch_mean       FLOAT,
  pitch_std        FLOAT,
  energy_mean      FLOAT,
  FOREIGN KEY (video_session_id) REFERENCES video_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_ss_video_session ON speech_segments(video_session_id, start_ms);

-- =========================================================================
-- 6.5 Quiz & Leaderboard Domain
-- =========================================================================

CREATE TABLE IF NOT EXISTS quizzes (
  id             CHAR(36) PRIMARY KEY,
  user_id        CHAR(36) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  topic          VARCHAR(100) NULL,
  difficulty     VARCHAR(20) NOT NULL DEFAULT 'medium',
  total_questions SMALLINT NOT NULL,
  time_limit_s   INTEGER NULL,             -- NULL = unlimited
  is_public      BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved    BOOLEAN NOT NULL DEFAULT FALSE,
  avg_score      FLOAT,
  attempt_count  INTEGER NOT NULL DEFAULT 0,
  rating         FLOAT DEFAULT 4.5,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_quiz_difficulty CHECK (difficulty IN ('easy','medium','hard','expert'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id               CHAR(36) PRIMARY KEY,
  quiz_id          CHAR(36) NOT NULL,
  question_text    TEXT NOT NULL,
  options          JSON NOT NULL,
  correct_answer   VARCHAR(255) NOT NULL,
  explanation      TEXT,
  difficulty       FLOAT,
  topic_tag        VARCHAR(100),
  order_index      SMALLINT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id            CHAR(36) PRIMARY KEY,
  user_id       CHAR(36) NOT NULL,
  quiz_id       CHAR(36) NOT NULL,
  score         FLOAT NOT NULL,           -- 0 – 100
  correct_count SMALLINT NOT NULL,
  time_taken_s  INTEGER NOT NULL,
  answers       JSON NOT NULL,            -- [{question_id, chosen, is_correct, time_ms}]
  status        VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  started_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE INDEX idx_qa_user_quiz   ON quiz_attempts(user_id, quiz_id);

CREATE TABLE IF NOT EXISTS reported_questions (
  id          CHAR(36) PRIMARY KEY,
  quiz_id     CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  user_id     CHAR(36) NOT NULL,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_rq_quiz ON reported_questions(quiz_id);
CREATE INDEX idx_rq_question ON reported_questions(question_id);
CREATE INDEX idx_rq_user ON reported_questions(user_id);
CREATE INDEX idx_qa_score_time  ON quiz_attempts(score DESC, time_taken_s ASC);

-- =========================================================================
-- 6.6 Job Recommendation Domain
-- =========================================================================

CREATE TABLE IF NOT EXISTS job_listings (
  id               CHAR(36) PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  company          VARCHAR(255) NOT NULL,
  description      TEXT NOT NULL,
  requirements     TEXT NULL,
  salary_range     VARCHAR(100) NULL,
  location         VARCHAR(255) NULL,
  skills           JSON NULL,
  experience_level VARCHAR(50) NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  id               CHAR(36) PRIMARY KEY,
  user_id          CHAR(36) NOT NULL,
  job_id           CHAR(36) NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES job_listings(id) ON DELETE CASCADE,
  UNIQUE(user_id, job_id)
);

CREATE TABLE IF NOT EXISTS job_matches (
  id               CHAR(36) PRIMARY KEY,
  resume_id        CHAR(36) NOT NULL,
  job_id           CHAR(36) NOT NULL,
  match_score      FLOAT NOT NULL DEFAULT 0.0,
  skills_overlap   JSON NULL,
  missing_skills   JSON NULL,
  ats_prediction   INTEGER DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES job_listings(id) ON DELETE CASCADE,
  UNIQUE(resume_id, job_id)
);

CREATE INDEX idx_jm_resume ON job_matches(resume_id);

-- =========================================================================
-- 6.7 Session Review Domain
-- =========================================================================

CREATE TABLE IF NOT EXISTS session_reports (
  id                        CHAR(36) PRIMARY KEY,
  user_id                   CHAR(36) NOT NULL,
  session_id                VARCHAR(36) NOT NULL UNIQUE,
  session_type              VARCHAR(20) NOT NULL DEFAULT 'text',
  summary                   TEXT NOT NULL,
  what_went_well            TEXT NULL,
  what_to_improve           TEXT NULL,
  overall_performance_grade FLOAT NOT NULL DEFAULT 0.0,
  technical_score           FLOAT NOT NULL DEFAULT 70.0,
  communication_score       FLOAT NOT NULL DEFAULT 70.0,
  confidence_score          FLOAT NOT NULL DEFAULT 70.0,
  structure_score           FLOAT NOT NULL DEFAULT 70.0,
  relevance_score           FLOAT NOT NULL DEFAULT 70.0,
  study_plan_30d            JSON NULL,
  key_strengths             JSON NULL,
  weaknesses                JSON NULL,
  share_token               CHAR(36) NULL UNIQUE,
  share_expires_at          TIMESTAMP NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sr_user_id ON session_reports(user_id);
CREATE INDEX idx_sr_session_id ON session_reports(session_id);

CREATE TABLE IF NOT EXISTS progress_snapshots (
  id                  CHAR(36) PRIMARY KEY,
  user_id             CHAR(36) NOT NULL,
  snapshot_date       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  avg_score           FLOAT NOT NULL DEFAULT 0.0,
  technical_score     FLOAT NOT NULL DEFAULT 0.0,
  communication_score FLOAT NOT NULL DEFAULT 0.0,
  confidence_score    FLOAT NOT NULL DEFAULT 0.0,
  structure_score     FLOAT NOT NULL DEFAULT 0.0,
  relevance_score     FLOAT NOT NULL DEFAULT 0.0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ps_user ON progress_snapshots(user_id);

-- =========================================================================
-- 6.8 Default Seed Data: 80 India-Based Job Listings
-- =========================================================================

INSERT INTO job_listings (id, title, company, description, requirements, salary_range, location, skills, experience_level) VALUES
('b27e69f8-8bc4-4b51-9878-831cf04cd761', 'Senior Backend Engineer (Python/FastAPI)', 'MockTech Solutions', 'Build robust, scalable API microservices using Python, FastAPI, and PostgreSQL. Design database models and handle background worker loops.', '5+ years experience in Python backend development. Hands-on with async SQLAlchemy, Redis, and Docker.', '₹15,00,000 - ₹22,00,000 LPA', 'Bengaluru, Karnataka (Hybrid)', '["Python", "FastAPI", "SQLAlchemy", "PostgreSQL", "Redis", "Docker"]', 'Senior'),
('e39763cd-6e7e-404d-b89e-9dcd9a22a762', 'Frontend Developer (React & TypeScript)', 'WebCraft Agency', 'Build interactive and responsive customer portals using React, TypeScript, and Tailwind CSS.', '3+ years experience with React, state management stores (Zustand/Redux), and custom layout components.', '₹8,00,000 - ₹12,00,000 LPA', 'Hyderabad, Telangana', '["React", "TypeScript", "Tailwind CSS", "Zustand", "HTML5", "CSS3"]', 'Mid'),
('f45861bc-e86b-4121-9380-6b57944e9763', 'Full Stack Software Engineer', 'StartupLabs', 'Develop customer-facing features on both the React frontend and Node.js backend. Deploy using AWS and monitor health metrics.', 'Experience with React, Node.js/Express, MongoDB, and basic AWS cloud service architectures.', '₹12,00,000 - ₹18,00,000 LPA', 'Remote (India)', '["React", "Node.js", "Express", "MongoDB", "AWS", "TypeScript"]', 'Mid-Senior'),
('a7517de1-c986-46c1-af1b-b92210621764', 'Android Developer (Kotlin & Compose)', 'AppBuilders Inc', 'Design and implement new feature screens using Jetpack Compose and Hilt dependency injection frameworks.', '3+ years building native Android apps with Kotlin. Experience with Retrofit, Room DB, and Android SDK.', '₹10,00,000 - ₹15,00,000 LPA', 'Pune, Maharashtra', '["Kotlin", "Jetpack Compose", "Dagger Hilt", "Room", "Retrofit", "Android SDK"]', 'Mid'),
('d4fe8e9e-642a-4c2e-9c39-625203314765', 'DevOps & Cloud Engineer', 'CloudSphere', 'Manage Kubernetes clusters, orchestrate CI/CD pipelines, and ensure maximum infrastructure reliability on AWS.', 'Solid understanding of Docker, Kubernetes, Terraform, GitHub Actions, and AWS infrastructure.', '₹14,00,000 - ₹20,00,000 LPA', 'Gurugram, Haryana (Hybrid)', '["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "Linux"]', 'Senior'),
('8190eac8-4acc-4d55-9c87-09241ab0f766', 'Data Scientist (Machine Learning)', 'AnalyticsAI Solutions', 'Train bi-encoder embedding structures, build Okapi BM25 rank algorithms, and optimize cross-encoder models.', 'MS/PhD in CS/Data Science. Solid skills in Python, PyTorch, Pandas, Scikit-Learn, and Vector DBs.', '₹16,00,000 - ₹24,00,000 LPA', 'Noida, Uttar Pradesh', '["Python", "PyTorch", "Pandas", "Scikit-Learn", "Machine Learning", "NLP"]', 'Senior'),
('c38782ec-cab9-4939-abd7-708f142fe767', 'QA Automation Engineer', 'QualityFirst Software', 'Create end-to-end automation test suites using Selenium, Cypress, and Python unittest modules.', 'Experience with Cypress, Selenium, Python, and CI/CD test automation pipelines.', '₹7,00,000 - ₹10,00,000 LPA', 'Chennai, Tamil Nadu', '["Cypress", "Selenium", "Python", "CI/CD", "SQL", "Git"]', 'Mid'),
('cc536f9b-6a70-4b19-ba56-656903e98768', 'Technical Product Manager', 'Fintech Innovations', 'Translate user requirements into technical specs, manage sprint cycles, and oversee SDK integrations.', 'Technical background. Experience in Agile product management, SaaS APIs, and wireframing.', '₹18,00,000 - ₹26,00,000 LPA', 'Mumbai, Maharashtra', '["Agile", "Jira", "APIs", "SQL", "Product Roadmap", "System Design"]', 'Senior'),
('ba33026c-d465-447f-bd23-9c52cdc3c769', 'Cybersecurity Analyst & Engineer', 'SafeGate Systems', 'Conduct vulnerability assessments, monitor firewalls, and implement security compliance policies.', 'Strong knowledge of Linux systems, network security protocols, OWASP Top 10, and SIEM tools.', '₹11,00,000 - ₹16,00,000 LPA', 'Bengaluru, Karnataka', '["Linux", "Network Security", "OWASP", "SIEM", "Cryptography", "Python"]', 'Mid'),
('aed27487-d6dd-4513-a7c0-938c96c37770', 'Junior Web Developer (PHP & MySQL)', 'Digital Agency Group', 'Maintain existing web portal layouts, write SQL queries, and configure dashboard widgets.', 'BS in CS or boot camp grad. Proficient in HTML, CSS, JavaScript, PHP, and SQL databases.', '₹4,00,000 - ₹6,00,000 LPA', 'Kochi, Kerala', '["PHP", "MySQL", "HTML5", "CSS3", "JavaScript", "WordPress"]', 'Junior'),
('bd73caa7-e915-46b3-8ed6-3295952c3771', 'Database Administrator (PostgreSQL)', 'DataStore Solutions', 'Monitor database performances, manage read-replicas, and execute database backup configurations.', 'Expert in PostgreSQL DBA configurations, SQL optimization, and Linux database architectures.', '₹12,00,000 - ₹18,00,000 LPA', 'Hyderabad, Telangana', '["PostgreSQL", "SQL Tuning", "Linux", "Backup & Recovery", "Docker"]', 'Senior'),
('e60e07ad-4961-40d3-9d58-a3c673ab0772', 'Backend Engineer (Node.js)', 'SaaSify Platforms', 'Design asynchronous event queues using Node.js, Express, and Redis queues.', '3+ years experience with Node.js, asynchronous APIs, MongoDB, and Redis broker integration.', '₹9,00,000 - ₹13,00,000 LPA', 'Pune, Maharashtra', '["Node.js", "Express", "MongoDB", "Redis", "JavaScript", "Docker"]', 'Mid'),
('ba33026c-d465-447f-bd23-9c52cdc3c773', 'Cloud Solutions Architect', 'CloudConsulting', 'Design hybrid multi-cloud infrastructure solutions incorporating AWS, Azure, and network routing configurations.', 'AWS Certified Solutions Architect. Deep expertise in Terraform, network protocols, and Kubernetes.', '₹22,00,000 - ₹32,00,000 LPA', 'Gurugram, Haryana', '["AWS", "Terraform", "Kubernetes", "Azure", "Networking", "System Design"]', 'Senior'),
('9bcc8361-d5db-4806-aa48-e9f6d0101774', 'iOS App Developer (Swift)', 'AppBuilders Inc', 'Build high-performance native iOS client modules using Swift, SwiftUI, and local persistent data.', '3+ years experience with iOS SDK, Swift, SwiftUI, Combine framework, and local storage CoreData.', '₹10,00,000 - ₹15,00,000 LPA', 'Bengaluru, Karnataka', '["Swift", "SwiftUI", "Combine", "CoreData", "iOS SDK", "APIs"]', 'Mid'),
('ba33026c-d465-447f-bd23-9c52cdc3c775', 'Machine Learning Engineer (NLP Focus)', 'DeepBrain Laboratories', 'Train transformer networks, configure tokenizers, and deployment vector store retrieval indices.', 'Experience with PyTorch, Transformers (Hugging Face), ChromaDB/FAISS, and Python models scaling.', '₹16,00,000 - ₹25,00,000 LPA', 'Bengaluru, Karnataka', '["Python", "PyTorch", "Transformers", "NLP", "Vector Databases", "ChromaDB"]', 'Senior'),
('c34f8f2c-2ffc-4c43-aaba-8c4117392776', 'Site Reliability Engineer (SRE)', 'ScaleGroup Corp', 'Automate system recovery setups, write metrics alerts, and configure dashboard monitor widgets.', 'Proficient in Python/Go scripting, Linux, Terraform, Prometheus, and AWS cloud architectures.', '₹14,00,000 - ₹20,00,000 LPA', 'Remote (India)', '["Linux", "Python", "Go", "Prometheus", "Terraform", "AWS"]', 'Senior'),
('9388e3c3-8c36-45a6-ba34-e47118d58777', 'UI/UX Engineer (React/Tailwind)', 'StudioDesign LLC', 'Implement highly polished interface components, custom transitions, and glassmorphic aesthetics.', 'Solid portfolio in UI/UX design. Excellent skills in HTML/CSS, React, Tailwind CSS, and Figma.', '₹8,00,000 - ₹12,00,000 LPA', 'Mumbai, Maharashtra', '["React", "Tailwind CSS", "Figma", "HTML5", "CSS3", "Framer Motion"]', 'Mid'),
('d034579b-5c93-4349-a26c-c0335a6da778', 'Software Tech Lead (Java/Spring)', 'EnterpriseCorp', 'Lead software engineers team, coordinate architectural updates, and manage Spring Boot modules.', '8+ years experience with Java, Spring Boot, microservice architectures, and SQL tuning.', '₹18,00,000 - ₹28,00,000 LPA', 'Noida, Uttar Pradesh', '["Java", "Spring Boot", "Microservices", "SQL Tuning", "Team Leadership", "Docker"]', 'Principal'),
('ba33026c-d465-447f-bd23-9c52cdc3c779', 'Data Engineer (Scala & Spark)', 'DataStream Analytics', 'Construct ETL pipelines, build data lakes, and configure Apache Spark cluster schedules.', 'Strong Scala or Python scripting. Hands-on with Spark, Hadoop, Kafka, and PostgreSQL datasets.', '₹13,00,000 - ₹18,00,000 LPA', 'Hyderabad, Telangana', '["Scala", "Apache Spark", "Apache Kafka", "PostgreSQL", "ETL Pipelines", "Hadoop"]', 'Senior'),
('ba33026c-d465-447f-bd23-9c52cdc3c780', 'Cloud Security Specialist', 'SecurityOps Corp', 'Enforce IAM configurations, compile AWS security trails, and monitor access credentials rules.', 'Expert in AWS Security controls, IAM policy structures, cloud network auditing, and encryption.', '₹14,00,000 - ₹20,00,000 LPA', 'Bengaluru, Karnataka', '["AWS Security", "IAM Policies", "Cloud Auditing", "KMS Encryption", "Linux", "Python"]', 'Senior'),
('ba33026c-d465-447f-bd23-9c52cdc3c781', 'Software Engineer in Test (SDET)', 'QualityCode Labs', 'Build robust test execution frameworks and integrate automated builds into GitLab runners.', 'Software engineering background. Skilled in Python or Java, Selenium Webdriver, and Docker containers.', '₹10,00,000 - ₹14,00,000 LPA', 'Chennai, Tamil Nadu', '["Python", "Selenium", "GitLab CI", "Docker", "REST API Testing", "SQL"]', 'Mid'),
('ba33026c-d465-447f-bd23-9c52cdc3c782', 'Systems Go Developer (Cloud Native)', 'CoreInfrastructure', 'Develop high-performance system agents using Go, Kubernetes APIs, and gRPC communications.', 'Experience with Go systems programming, Kubernetes custom operators, and gRPC serialization.', '₹15,00,000 - ₹22,00,000 LPA', 'Remote (India)', '["Go", "Kubernetes", "gRPC", "Docker", "Linux Systems", "Protobuf"]', 'Senior'),
('ba33026c-d465-447f-bd23-9c52cdc3c783', 'Embedded Software Engineer', 'MicroTech Automotive', 'Write firmware architectures, verify bootloaders, and interface peripherals using C.', 'Expert in C, microcontrollers (ARM Cortex), RTOS scheduling, and protocol interfaces (I2C, SPI).', '₹11,00,000 - ₹16,00,000 LPA', 'Pune, Maharashtra', '["C", "ARM Cortex", "RTOS", "I2C/SPI Protocols", "Oscilloscopes", "Embedded C"]', 'Senior'),
('ba33026c-d465-447f-bd23-9c52cdc3c784', 'Salesforce Developer & Architect', 'CRM Partners', 'Build Apex controller modules, design visualforce pages, and configure salesforce structures.', 'Certified Salesforce Developer. Expertise in Apex coding, Visualforce, and Lightning Components.', '₹12,00,000 - ₹17,00,000 LPA', 'Bengaluru, Karnataka', '["Salesforce", "Apex Coding", "Lightning Components", "CRM Integration", "SOQL"]', 'Mid-Senior'),
('ba33026c-d465-447f-bd23-9c52cdc3c785', 'Blockchain Web3 Developer', 'Cryptonet Labs', 'Write Solidity smart contracts, deploy ERC-20 tokens, and connect frontend clients using ethers.js.', 'Proficient in Solidity, EVM networks, smart contract security, and web3 node APIs.', '₹16,00,000 - ₹25,00,000 LPA', 'Remote (India)', '["Solidity", "Web3", "Smart Contracts", "Ethers.js", "Ethereum", "TypeScript"]', 'Senior'),
('ba33026c-d465-447f-bd23-9c52cdc3c786', 'Frontend Engineer (Vue.js)', 'RetailShop App', 'Implement user ecommerce dashboard components, integrate REST APIs, and optimize assets.', '3+ years experience with Vue.js, Vuex/Pinia state managers, HTML/CSS, and responsive design.', '₹8,00,000 - ₹12,00,000 LPA', 'Gurugram, Haryana', '["Vue.js", "Pinia", "REST APIs", "Webpack", "CSS3", "JavaScript"]', 'Mid'),
('ba33026c-d465-447f-bd23-9c52cdc3c787', 'Backend Engineer (Ruby on Rails)', 'FlexJobs Inc', 'Maintain scalable relational databases, build background jobs, and expose public SaaS integrations.', 'Experience with Ruby on Rails framework, PostgreSQL databases, and Sidekiq background jobs.', '₹10,00,000 - ₹15,00,000 LPA', 'Remote (India)', '["Ruby", "Ruby on Rails", "PostgreSQL", "Sidekiq", "Redis", "RSpec"]', 'Mid'),
('ba33026c-d465-447f-bd23-9c52cdc3c788', 'IT Systems & Network Administrator', 'Corporate Solutions', 'Support internal routing servers, manage user access permissions, and troubleshoot hardware systems.', 'Solid understanding of Cisco routers, Active Directory, network firewall configurations, and shell scripting.', '₹7,00,000 - ₹10,00,000 LPA', 'Chennai, Tamil Nadu', '["Active Directory", "Cisco Networks", "Firewall Admin", "Linux", "Windows Server"]', 'Mid'),
('ba33026c-d465-447f-bd23-9c52cdc3c789', 'Scrum Master / Agile Consultant', 'AgileOps Consultancy', 'Coach development teams on scrum principles, coordinate standups, and resolve pipeline blocks.', 'Certified Scrum Master (CSM). Expert in Jira metrics, agile scaling, and process improvements.', '₹10,00,000 - ₹14,00,000 LPA', 'Mumbai, Maharashtra', '["Scrum", "Agile Coaching", "Jira", "Sprint Planning", "Facilitation"]', 'Mid'),
('ba33026c-d465-447f-bd23-9c52cdc3c790', 'Principal AI & Deep Learning Researcher', 'InnovateLabs', 'Conduct research on neural network architectures, train custom transformers, and publish papers.', 'PhD in Machine Learning. Extensive background in PyTorch, deep learning structures, and high-performance computing.', '₹25,00,000 - ₹40,00,000 LPA', 'Bengaluru, Karnataka (Hybrid)', '["Deep Learning", "PyTorch", "Transformers", "Neural Networks", "NLP", "Machine Learning"]', 'Principal'),
('c81216bc-e86b-4121-9380-6b57944e9731', 'Software Development Engineer II (SDE-2)', 'TechGiant India', 'Implement scalable features, review team codes, and optimize search algorithms performance.', '3+ years experience in Java/Kotlin or C++ backend systems. Experience in databases scaling.', '₹18,00,000 - ₹28,00,000 LPA', 'Bengaluru, Karnataka', '["Java", "Kotlin", "C++", "System Design", "SQL", "Microservices"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9732', 'Junior Frontend Engineer', 'AppDesign Agency', 'Implement visual dashboards and wireframes using React and vanilla CSS styles.', 'BS in Computer Science. Strong JavaScript/ES6 skills, CSS flexbox/grids, and git practices.', '₹5,00,000 - ₹8,00,000 LPA', 'Noida, Uttar Pradesh', '["JavaScript", "React", "CSS3", "HTML5", "Git", "Webpack"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9733', 'Golang Backend Developer', 'FintechCore', 'Expose secure gRPC APIs, design transactional databases, and write unit integration tests.', 'Solid Go coding practices. Experience with concurrency models, clean architectures, and PostgreSQL.', '₹12,00,000 - ₹18,00,000 LPA', 'Mumbai, Maharashtra', '["Go", "gRPC", "PostgreSQL", "REST APIs", "Docker", "Unit Testing"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9734', 'Data Engineer (Big Data)', 'DataLake Corp', 'Expose streaming pipes using Kafka, process datasets in Spark clusters, and write SQL checks.', '3+ years experience with Spark, Kafka, Hadoop, Python, and SQL database tuning.', '₹14,00,000 - ₹20,00,000 LPA', 'Hyderabad, Telangana', '["Scala", "Python", "Apache Spark", "Apache Kafka", "Hadoop", "SQL"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9735', 'SRE / Infrastructure Specialist', 'CloudOps India', 'Monitor AWS infrastructure, manage Ansible configurations, and troubleshoot pipeline crashes.', 'Kubernetes, Docker, Ansible, Terraform, and cloud platform routing configurations.', '₹16,00,000 - ₹22,00,000 LPA', 'Gurugram, Haryana', '["Docker", "Kubernetes", "AWS", "Ansible", "Terraform", "Prometheus"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9736', 'Android Developer (Kotlin)', 'SmartMobility', 'Build clean native application modules, optimize memory usage, and connect Retrofit clients.', 'Experience with Kotlin, Android Jetpack components, Room cache, and MVVM app structures.', '₹8,00,000 - ₹12,00,000 LPA', 'Pune, Maharashtra', '["Kotlin", "Android SDK", "Room", "Retrofit", "Dagger Hilt", "MVVM"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9737', 'Full Stack React & Rails Engineer', 'AgileLabs', 'Develop scalable SaaS platform features from database migrations to React UI views.', 'Ruby on Rails, React, TypeScript, PostgreSQL, and background worker threads.', '₹12,00,000 - ₹18,00,000 LPA', 'Kochi, Kerala', '["Ruby on Rails", "React", "TypeScript", "PostgreSQL", "CSS3", "Git"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9738', 'QA Automation Lead', 'TestMasters', 'Design standard automation test plans, direct QA engineers, and inspect test pipeline runs.', '5+ years experience. Expert in Cypress/Selenium, Python scripts, test frameworks, and CI/CD.', '₹14,00,000 - ₹18,00,000 LPA', 'Chennai, Tamil Nadu', '["Cypress", "Selenium", "Python", "GitLab CI", "Agile", "Team Lead"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9739', 'Data Scientist / Analyst', 'InsightsAI', 'Expose statistical models, analyze candidate telemetry data, and compile dashboards.', 'Python, Pandas, SQL, Tableau, data mining, and predictive modeling frameworks.', '₹10,00,000 - ₹14,00,000 LPA', 'Bengaluru, Karnataka', '["Python", "Pandas", "SQL", "Tableau", "Data Analysis", "Predictive Modeling"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9740', 'Cloud Security Specialist', 'SecuredCloud', 'Audit IAM configurations, manage SSL certificates, and monitor AWS server access logs.', 'AWS Certified Security. Strong knowledge of firewalls, IAM, encryption, and Linux networking.', '₹15,00,000 - ₹20,00,000 LPA', 'Hyderabad, Telangana', '["AWS Security", "IAM", "Firewalls", "Linux", "Python", "Cryptography"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9741', 'Node.js Backend Developer', 'SaaSBuilder', 'Design asynchronous REST APIs, manage database connections, and write Redis schedules.', '3+ years Node.js coding. Experience with Express, MongoDB, Redis broker queues, and Docker.', '₹9,00,000 - ₹13,00,000 LPA', 'Pune, Maharashtra', '["Node.js", "Express", "MongoDB", "Redis", "Docker", "JavaScript"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9742', 'iOS Developer (SwiftUI)', 'SwiftApps', 'Build elegant native mobile client apps, configure animations, and verify layout frameworks.', 'Swift, SwiftUI, local data persistent structures, iOS APIs, and store submission guides.', '₹9,00,000 - ₹13,00,000 LPA', 'Bengaluru, Karnataka', '["Swift", "SwiftUI", "iOS SDK", "APIs", "Git", "Figma"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9743', 'NLP / AI Researcher', 'IntellectAI', 'Expose transformer fine-tuning models, construct datasets, and optimize RAG indices.', 'PyTorch, Hugging Face Transformers, vector databases, search retrievals, and Python code.', '₹16,00,000 - ₹24,00,000 LPA', 'Bengaluru, Karnataka', '["Python", "PyTorch", "Transformers", "NLP", "ChromaDB", "Vector Search"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9744', 'Systems Administrator (Linux)', 'CoreTech Ops', 'Maintain server performance metrics, configure DNS zones, and execute shell security scripts.', 'Strong Linux systems background. Proficient in Bash, scripting, network setup, and DBA basic tasks.', '₹7,00,000 - ₹10,00,000 LPA', 'Chennai, Tamil Nadu', '["Linux", "Bash Scripting", "Networking", "System Monitoring", "Active Directory"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9745', 'Embedded Firmware Developer', 'IoT Solutions', 'Expose low-level driver codes, monitor CPU scheduling bounds, and write C code modules.', 'ARM Cortex, RTOS, C, UART/SPI interfaces, hardware diagnostics, and debugging tools.', '₹10,00,000 - ₹14,00,000 LPA', 'Pune, Maharashtra', '["C", "ARM Cortex", "RTOS", "UART/SPI", "Embedded C", "Microcontrollers"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9746', 'Salesforce Apex Developer', 'CRMTech', 'Build customized visual dashboards, Apex controllers, and write SOQL data queries.', 'Salesforce Developer Certification. Strong Apex, Lightning Web Components, and database skills.', '₹9,00,000 - ₹13,00,000 LPA', 'Bengaluru, Karnataka', '["Salesforce", "Apex", "LWC", "SOQL", "CRM Integration"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9747', 'Web3 / Solidity Developer', 'CryptoBlock', 'Write secure smart contracts, compile EVM scripts, and build frontend Web3 integrations.', 'Solidity, Truffle/Hardhat frameworks, DApps, smart contracts audit, and JavaScript.', '₹15,00,000 - ₹22,00,000 LPA', 'Remote (India)', '["Solidity", "Smart Contracts", "Solana/Ethereum", "Web3", "Hardhat", "TypeScript"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9748', 'Senior UI/UX React Developer', 'CreativeDesign', 'Polish responsive layout grids, construct custom animations, and handle CSS overrides.', 'Expert in HTML/CSS, React, Tailwind CSS, Framer Motion, and design layouts.', '₹12,00,000 - ₹16,00,000 LPA', 'Mumbai, Maharashtra', '["React", "Tailwind CSS", "Framer Motion", "Figma", "HTML5", "CSS3"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9749', 'Data Engineer (Scala & Spark)', 'BigData Analytics', 'Develop large-scale batch datasets, configure ETL nodes, and run SQL execution metrics.', 'Scala or Python scripting. Spark, Hadoop, Kafka, relational databases, and data warehouse.', '₹13,00,000 - ₹18,00,000 LPA', 'Hyderabad, Telangana', '["Scala", "Apache Spark", "Apache Kafka", "PostgreSQL", "ETL", "Hadoop"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9750', 'Senior Software Engineer (SDE-3)', 'TechGiant India', 'Lead software developer team, design distributed systems, and organize server models.', '6+ years experience. Expert in system architectures, microservices, databases tuning, and coding.', '₹22,00,000 - ₹32,00,000 LPA', 'Bengaluru, Karnataka', '["System Design", "Microservices", "Java/Go", "SQL Tuning", "Team Lead", "Docker"]', 'Senior-Principal'),
('c81216bc-e86b-4121-9380-6b57944e9751', 'Backend Developer (Python/Django)', 'StartupCo', 'Build responsive backend API systems, write database migrations, and configure REST endpoints.', 'Django/Flask, Python, PostgreSQL database management, REST frameworks, and git practices.', '₹7,00,000 - ₹10,00,000 LPA', 'Kochi, Kerala', '["Python", "Django", "PostgreSQL", "REST APIs", "Git", "Docker"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9752', 'Full Stack Developer (MERN Stack)', 'WebApps', 'Implement React dashboard panels and build Express API logic backends with MongoDB.', 'MERN Stack expertise. Excellent JavaScript, React, Node.js, Express, MongoDB, and CSS structures.', '₹8,00,000 - ₹12,00,000 LPA', 'Gurugram, Haryana', '["React", "Node.js", "Express", "MongoDB", "JavaScript", "HTML5"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9753', 'Quality Assurance Analyst', 'QualityOps', 'Review software builds, write manual test scripts, and log defects in tracing trackers.', 'Experience with Jira, basic SQL queries, test documentation, manual regression checking.', '₹5,00,000 - ₹7,00,000 LPA', 'Noida, Uttar Pradesh', '["Manual Testing", "Jira", "SQL Queries", "Test Cases", "Regression Testing"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9754', 'IT Security Specialist', 'InfoSec India', 'Monitor network access channels, audit firewall configs, and execute server diagnostic checks.', 'Strong knowledge of Linux systems, firewalls, network monitoring, security standards, and audits.', '₹10,00,000 - ₹14,00,000 LPA', 'Hyderabad, Telangana', '["Linux", "Network Security", "Firewalls", "Information Security", "Bash Scripting"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9755', 'Junior Android Developer', 'MobileApps', 'Maintain native Android layouts, integrate simple REST endpoints, and debug crash exceptions.', 'Kotlin, Android SDK, Android Studio, basic REST APIs, and version control Git.', '₹5,00,000 - ₹7,00,000 LPA', 'Pune, Maharashtra', '["Kotlin", "Android SDK", "Git", "Android Studio", "REST APIs"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9756', 'Junior React Developer', 'WebCraft', 'Build clean UI panels, align dashboard layout guides, and debug CSS styling issues.', 'JavaScript, HTML5, CSS3, basic React, Git configuration, and UI styling.', '₹5,00,000 - ₹7,00,000 LPA', 'Noida, Uttar Pradesh', '["React", "JavaScript", "HTML5", "CSS3", "Git"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9757', 'Senior Database Developer', 'DataSystems', 'Optimize large database queries, build triggers and store procedures, and monitor indices.', 'PostgreSQL, database architectures, SQL execution profiling, triggers, and migrations.', '₹12,00,000 - ₹16,00,000 LPA', 'Hyderabad, Telangana', '["PostgreSQL", "SQL Tuning", "Store Procedures", "Database Design", "Linux"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9758', 'Cloud Administrator (AWS)', 'CloudHQ', 'Manage EC2 instances, monitor CloudWatch metrics logs, and verify billing limits.', 'AWS management, IAM, EC2, CloudWatch, S3 storage setups, and basic shell scripting.', '₹8,00,000 - ₹11,00,000 LPA', 'Gurugram, Haryana', '["AWS", "EC2", "S3", "CloudWatch", "IAM", "Linux"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9759', 'Golang Systems Engineer', 'SystemCore', 'Write low-latency network agents, configure gRPC interfaces, and monitor buffer loops.', 'Go coding. Strong system scripting, Linux routing, gRPC protocol, and multi-thread handling.', '₹13,00,000 - ₹18,00,000 LPA', 'Remote (India)', '["Go", "Linux Systems", "gRPC", "Networking", "Docker"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9760', 'UI Designer (Figma)', 'DesignAgency', 'Create dashboard layout wireframes, compile asset sheets, and align color specs.', 'Expert in Figma design tools, responsive layout design, color theory, and micro-interactions.', '₹7,00,000 - ₹10,00,000 LPA', 'Mumbai, Maharashtra', '["Figma", "UI Design", "Wireframing", "Vector Illustration", "Responsive Layout"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9761', 'DevOps Automations Lead', 'CloudSystem', 'Automate code build deployments, direct junior DevOps, and manage Kubernetes clusters.', 'Kubernetes, AWS cloud, Terraform scripting, CI/CD pipelines, and infrastructure automations.', '₹16,00,000 - ₹22,00,000 LPA', 'Bengaluru, Karnataka', '["Kubernetes", "AWS", "Terraform", "GitLab CI", "Ansible", "Team Lead"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9762', 'Junior Quality Analyst', 'QualityFirst', 'Execute sanity and regression check scripts on new web builds and report logs.', 'Basic software QA lifecycle, test checklists, issue trackers (Jira), and web browsers.', '₹4,00,000 - ₹6,00,000 LPA', 'Chennai, Tamil Nadu', '["Manual Testing", "Test Cases", "Jira", "Regression Checking", "Browser Testing"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9763', 'Backend Engineer (FastAPI)', 'API Solutions', 'Build asynchronous database endpoints, document API specifications, and write SQLite configurations.', 'Python coding, FastAPI, SQLAlchemy async integrations, SQL migrations, and Git.', '₹8,00,000 - ₹12,00,000 LPA', 'Bengaluru, Karnataka', '["Python", "FastAPI", "SQLAlchemy", "SQLite", "REST APIs", "Git"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9764', 'React Native App Developer', 'AppStudio', 'Develop hybrid mobile applications for iOS and Android networks using React Native.', 'React Native coding, JavaScript/TypeScript, integration of native bridges, and state management.', '₹10,00,000 - ₹14,00,000 LPA', 'Pune, Maharashtra', '["React Native", "TypeScript", "JavaScript", "Redux", "Mobile Apps"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9765', 'Data Scientist (Machine Learning)', 'MachineAI', 'Analyze customer behavioral telemetry profiles, train linear classifiers, and write SQL checks.', 'Python, Pandas, Scikit-Learn, SQL data selection, data visualization frameworks.', '₹12,00,000 - ₹16,00,000 LPA', 'Hyderabad, Telangana', '["Python", "Scikit-Learn", "Pandas", "SQL", "Data Modeling", "Tableau"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9766', 'Data Engineer (Scala & Kafka)', 'PipelineSolutions', 'Build real-time streaming pipeline frameworks, audit Kafka clusters, and verify Postgres dumps.', 'Scala scripting, Apache Spark, Kafka stream configurations, relational database systems.', '₹14,00,000 - ₹20,00,000 LPA', 'Bengaluru, Karnataka', '["Scala", "Apache Spark", "Apache Kafka", "PostgreSQL", "ETL Pipelines"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9767', 'Scrum Master', 'AgileTeams', 'Moderate daily sprint reviews, clear developer blocks, and track velocity charts.', 'Certified Scrum Master (CSM), Jira boards management, Agile workflows, and team facilitation.', '₹9,00,000 - ₹12,00,000 LPA', 'Gurugram, Haryana', '["Scrum", "Jira", "Agile", "Sprint Planning", "Facilitation"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9768', 'Embedded Systems Firmware Lead', 'MicroIoT', 'Write device driver code, monitor clock loops, and configure ARM Cortex hardware architectures.', 'Embedded C, RTOS scheduling, ARM Cortex microcontrollers, diagnostics interfaces, and Team Lead.', '₹15,00,000 - ₹20,00,000 LPA', 'Pune, Maharashtra', '["C", "ARM Cortex", "RTOS", "UART/SPI", "Team Lead", "Embedded C"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9769', 'LWC Salesforce Specialist', 'CloudConsultancy', 'Design custom interfaces, LWC components, and write backend Apex controllers.', 'Salesforce developer certification, Apex backend programming, Lightning Web Components, and SOQL.', '₹10,00,000 - ₹13,00,000 LPA', 'Noida, Uttar Pradesh', '["Salesforce", "Apex", "LWC", "SOQL", "CRM Integration"]', 'Mid-Senior'),
('c81216bc-e86b-4121-9380-6b57944e9770', 'Junior Blockchain Developer', 'Cryptotech', 'Build Solidity contract templates, integrate Web3 components, and test EVM deployers.', 'Solidity scripting, basic Web3 libraries (ethers.js), EVM network operations, and Git.', '₹6,00,000 - ₹9,00,000 LPA', 'Remote (India)', '["Solidity", "Web3", "Hardhat", "TypeScript", "Ethereum"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9771', 'Senior Full Stack Engineer (MERN)', 'SaaSApp Solutions', 'Expose robust Express endpoints and optimize complex MongoDB database queries.', 'Expert in MERN stack development, software architecture, REST APIs, and cloud deployments.', '₹16,00,000 - ₹24,00,000 LPA', 'Bengaluru, Karnataka', '["React", "Node.js", "Express", "MongoDB", "System Design", "Docker"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9772', 'Junior SRE Assistant', 'ScaleTech', 'Analyze cloud watch alerts logs, document recovery setups, and resolve pipeline reports.', 'Basic scripting (Python/Bash), Linux server administration, AWS operations, and git.', '₹5,00,000 - ₹8,00,000 LPA', 'Chennai, Tamil Nadu', '["Linux", "Bash", "AWS", "Python", "System Monitoring"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9773', 'UI Developer (Tailwind/CSS)', 'PixelPerfect Studios', 'Convert visual design files into clean Tailwind HTML/CSS classes and React components.', 'Expert HTML/CSS skills, Tailwind CSS styling, responsive layout grids, and basic JavaScript.', '₹6,00,000 - ₹9,00,000 LPA', 'Kochi, Kerala', '["Tailwind CSS", "HTML5", "CSS3", "JavaScript", "Responsive Design"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9774', 'Senior DevOps Infrastructure Lead', 'EnterpriseCloud', 'Design automated release frameworks, optimize Docker clusters, and direct security tasks.', 'Expert in Kubernetes orchestration, AWS hosting, Terraform scripting, and team lead.', '₹20,00,000 - ₹30,00,000 LPA', 'Hyderabad, Telangana', '["Kubernetes", "AWS", "Terraform", "CI/CD", "Team Lead", "Linux"]', 'Senior-Principal'),
('c81216bc-e86b-4121-9380-6b57944e9775', 'Vue.js Developer', 'AppWeb Agency', 'Build customer-facing interface views, integrate REST endpoints, and debug store models.', 'Vue.js developer, Vuex/Pinia configurations, HTML5, CSS3, JavaScript/ES6, and git systems.', '₹7,00,000 - ₹10,00,000 LPA', 'Pune, Maharashtra', '["Vue.js", "Pinia", "JavaScript", "HTML5", "CSS3", "Git"]', 'Mid'),
('c81216bc-e86b-4121-9380-6b57944e9776', 'Junior QA Automation Engineer', 'CodeTesting', 'Translate manual test plans into Selenium/Python automation check scripts.', 'Python scripting, Selenium WebDriver, basic HTML page structures, and testing lifecycles.', '₹5,00,000 - ₹8,00,000 LPA', 'Kochi, Kerala', '["Selenium", "Python", "HTML5", "REST API Testing", "manual checks"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9777', 'Database Migration Architect', 'MigrationLabs', 'Coordinate database updates, write SQL migration scripts, and audit schemas structures.', 'Expert in PostgreSQL/MySQL, database engines, schema refactoring, and DBA operations.', '₹16,00,000 - ₹24,00,000 LPA', 'Gurugram, Haryana', '["PostgreSQL", "MySQL", "SQL Tuning", "Database Migrations", "Schema Design"]', 'Senior'),
('c81216bc-e86b-4121-9380-6b57944e9778', 'Principal Machine Learning Architect', 'CognitiveComputing', 'Guide AI developers, model custom deep learning architectures, and verify search pipelines.', 'Ph.D. in Computer Science/AI. PyTorch, system design, NLP models, and neural net scaling.', '₹24,00,000 - ₹38,00,000 LPA', 'Bengaluru, Karnataka (Hybrid)', '["PyTorch", "NLP", "Machine Learning", "System Design", "Deep Learning", "Transformers"]', 'Principal'),
('c81216bc-e86b-4121-9380-6b57944e9779', 'Junior Systems Engineer', 'SystemInfrastructure', 'Monitor server health status indicators, assist DBA updates, and write minor scripts.', 'Basic scripting (Bash/Python), Linux system commands, database configurations, and git.', '₹5,00,000 - ₹7,00,000 LPA', 'Noida, Uttar Pradesh', '["Linux", "Bash", "Python", "SQL", "Git"]', 'Junior'),
('c81216bc-e86b-4121-9380-6b57944e9780', 'Senior Full Stack Python Developer', 'CognitiveApps', 'Build FastAPI endpoints, integrate React user panels, and deploy Docker instances.', 'Python backend programming, FastAPI, async SQL database operations, React frontend, and Docker.', '₹15,00,000 - ₹22,00,000 LPA', 'Bengaluru, Karnataka', '["Python", "FastAPI", "React", "SQLAlchemy", "PostgreSQL", "Docker"]', 'Senior');
