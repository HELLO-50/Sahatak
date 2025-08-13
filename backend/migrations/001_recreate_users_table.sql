-- Migration: Recreate users table with full_name instead of first_name/last_name
-- Author: Database Migration for Sahatak
-- Date: 2025-01-13
-- Description: Drop and recreate users table with full_name field (safe since no records exist)

-- Step 1: Drop existing tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notification_queue;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS platform_metrics;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS users;

-- Step 2: Recreate users table with full_name
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    user_type ENUM('patient', 'doctor', 'admin') NOT NULL,
    language_preference ENUM('ar', 'en') NOT NULL DEFAULT 'ar',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    
    INDEX idx_users_email (email),
    INDEX idx_users_full_name (full_name),
    INDEX idx_users_user_type (user_type)
);

-- Step 3: Recreate all other tables (they will be empty but structure preserved)
-- You'll need to run your Flask app with db.create_all() after this migration
-- OR manually recreate the other tables if needed