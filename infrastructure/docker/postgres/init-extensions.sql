-- PostgreSQL Initialization Script for ANIVORA
-- Enables extensions required by search and indexing architecture

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'ANIVORA Database Extensions Initialized: pg_trgm, uuid-ossp';
END $$;
