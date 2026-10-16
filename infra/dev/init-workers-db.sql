-- ==============================================================================
-- JLPT Online Dev Infrastructure: Isolated Databases for 6 Coding Workers
-- Task: F07 (Multi-worker isolation)
-- ==============================================================================

-- 1. Attempt to enable pg_bigm extension in template1
-- If pg_bigm is installed in the PostgreSQL image/host, all newly created databases
-- will inherit the extension automatically from template1.
-- Note: The standard 'postgres:17-bookworm' image does not bundle pg_bigm by default.
-- For production / custom image with Japanese full-text search, install 'postgresql-17-pg-bigm'.
\connect template1
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_bigm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_bigm extension not available in template1, skipping: %', SQLERRM;
END $$;
\connect postgres

-- 2. Create dedicated database user roles with passwords
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jlpt_w1') THEN
    CREATE USER jlpt_w1 WITH PASSWORD 'jlpt_w1_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jlpt_w2') THEN
    CREATE USER jlpt_w2 WITH PASSWORD 'jlpt_w2_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jlpt_w3') THEN
    CREATE USER jlpt_w3 WITH PASSWORD 'jlpt_w3_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jlpt_w4') THEN
    CREATE USER jlpt_w4 WITH PASSWORD 'jlpt_w4_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jlpt_w5') THEN
    CREATE USER jlpt_w5 WITH PASSWORD 'jlpt_w5_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'jlpt_w6') THEN
    CREATE USER jlpt_w6 WITH PASSWORD 'jlpt_w6_pass';
  END IF;
END $$;

-- 3. Create isolated databases for each worker
SELECT 'CREATE DATABASE jlpt_w1 OWNER jlpt_w1'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jlpt_w1')\gexec

SELECT 'CREATE DATABASE jlpt_w2 OWNER jlpt_w2'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jlpt_w2')\gexec

SELECT 'CREATE DATABASE jlpt_w3 OWNER jlpt_w3'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jlpt_w3')\gexec

SELECT 'CREATE DATABASE jlpt_w4 OWNER jlpt_w4'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jlpt_w4')\gexec

SELECT 'CREATE DATABASE jlpt_w5 OWNER jlpt_w5'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jlpt_w5')\gexec

SELECT 'CREATE DATABASE jlpt_w6 OWNER jlpt_w6'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jlpt_w6')\gexec

-- 4. Cross-database isolation: revoke default public connection, allow only dedicated worker
REVOKE CONNECT ON DATABASE jlpt_w1 FROM PUBLIC;
REVOKE CONNECT ON DATABASE jlpt_w2 FROM PUBLIC;
REVOKE CONNECT ON DATABASE jlpt_w3 FROM PUBLIC;
REVOKE CONNECT ON DATABASE jlpt_w4 FROM PUBLIC;
REVOKE CONNECT ON DATABASE jlpt_w5 FROM PUBLIC;
REVOKE CONNECT ON DATABASE jlpt_w6 FROM PUBLIC;

GRANT CONNECT ON DATABASE jlpt_w1 TO jlpt_w1;
GRANT CONNECT ON DATABASE jlpt_w2 TO jlpt_w2;
GRANT CONNECT ON DATABASE jlpt_w3 TO jlpt_w3;
GRANT CONNECT ON DATABASE jlpt_w4 TO jlpt_w4;
GRANT CONNECT ON DATABASE jlpt_w5 TO jlpt_w5;
GRANT CONNECT ON DATABASE jlpt_w6 TO jlpt_w6;

-- Also grant connect to superuser postgres
GRANT CONNECT ON DATABASE jlpt_w1 TO postgres;
GRANT CONNECT ON DATABASE jlpt_w2 TO postgres;
GRANT CONNECT ON DATABASE jlpt_w3 TO postgres;
GRANT CONNECT ON DATABASE jlpt_w4 TO postgres;
GRANT CONNECT ON DATABASE jlpt_w5 TO postgres;
GRANT CONNECT ON DATABASE jlpt_w6 TO postgres;

-- 5. Attempt pg_bigm on each worker database if not already inherited from template1
\connect jlpt_w1
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_bigm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_bigm not available in jlpt_w1, skipping: %', SQLERRM; END $$;

\connect jlpt_w2
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_bigm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_bigm not available in jlpt_w2, skipping: %', SQLERRM; END $$;

\connect jlpt_w3
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_bigm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_bigm not available in jlpt_w3, skipping: %', SQLERRM; END $$;

\connect jlpt_w4
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_bigm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_bigm not available in jlpt_w4, skipping: %', SQLERRM; END $$;

\connect jlpt_w5
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_bigm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_bigm not available in jlpt_w5, skipping: %', SQLERRM; END $$;

\connect jlpt_w6
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_bigm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_bigm not available in jlpt_w6, skipping: %', SQLERRM; END $$;

\connect postgres
