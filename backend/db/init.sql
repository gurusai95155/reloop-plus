-- Reloop Plus PostgreSQL Database Schema
-- Run this script to initialize your database tables

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resale_items (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_email VARCHAR(255),
    description TEXT NOT NULL,
    category VARCHAR(100),
    condition VARCHAR(50),
    age VARCHAR(50),
    ai_decision VARCHAR(50),
    status VARCHAR(50) DEFAULT 'LISTED',
    final_price NUMERIC,
    buyer_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(50) NOT NULL,
    bidder_id VARCHAR(50) NOT NULL,
    bidder_email VARCHAR(255),
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repair_requests (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_email VARCHAR(255),
    description TEXT NOT NULL,
    category VARCHAR(100),
    condition VARCHAR(50),
    age VARCHAR(50),
    ai_decision VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING',
    worker_id VARCHAR(50),
    worker_email VARCHAR(255),
    worker_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recycle_requests (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_email VARCHAR(255),
    description TEXT NOT NULL,
    category VARCHAR(100),
    condition VARCHAR(50),
    age VARCHAR(50),
    ai_decision VARCHAR(50),
    choice VARCHAR(50) DEFAULT 'RESPONSIBLE',
    status VARCHAR(50) DEFAULT 'PENDING',
    worker_id VARCHAR(50),
    worker_email VARCHAR(255),
    recycling_center VARCHAR(255),
    environmental_impact VARCHAR(255),
    estimated_value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial test user and demo items if empty
INSERT INTO users (email, password, role)
VALUES 
  ('user@example.com', 'password123', 'USER'),
  ('worker@example.com', 'password123', 'WORKER')
ON CONFLICT (email) DO NOTHING;

INSERT INTO resale_items (user_id, user_email, description, category, condition, age, ai_decision, status, final_price, buyer_email)
SELECT '1', 'user@example.com', 'Vintage wooden chair', 'Furniture', 'Good', '5 years', 'RESALE', 'SOLD', 25, 'buyer@example.com'
WHERE NOT EXISTS (SELECT 1 FROM resale_items WHERE description = 'Vintage wooden chair');

INSERT INTO resale_items (user_id, user_email, description, category, condition, age, ai_decision, status)
SELECT '2', 'seller2@example.com', 'Gently used bicycle', 'Sports', 'Like new', '1 year', 'RESALE', 'LISTED'
WHERE NOT EXISTS (SELECT 1 FROM resale_items WHERE description = 'Gently used bicycle');

INSERT INTO resale_items (user_id, user_email, description, category, condition, age, ai_decision, status)
SELECT '3', 'seller3@example.com', 'Coffee maker', 'Electronics', 'Good', '2 years', 'RESALE', 'LISTED'
WHERE NOT EXISTS (SELECT 1 FROM resale_items WHERE description = 'Coffee maker');

INSERT INTO repair_requests (user_id, user_email, description, category, condition, age, ai_decision, status, worker_id, worker_email, worker_notes)
SELECT '1', 'user@example.com', 'Laptop screen repair', 'Electronics', 'Broken screen', '3 years', 'REPAIR', 'COMPLETED', 'w1', 'worker@example.com', 'Screen replaced successfully'
WHERE NOT EXISTS (SELECT 1 FROM repair_requests WHERE description = 'Laptop screen repair');

INSERT INTO recycle_requests (user_id, user_email, description, category, condition, age, ai_decision, choice, status, worker_id, worker_email, recycling_center, environmental_impact)
SELECT '1', 'user@example.com', 'Old printer', 'Electronics', 'Non-working', '8 years', 'RECYCLE', 'RESPONSIBLE', 'COMPLETED', 'w1', 'worker@example.com', 'E-Waste Center', 'Materials recovered'
WHERE NOT EXISTS (SELECT 1 FROM recycle_requests WHERE description = 'Old printer');
