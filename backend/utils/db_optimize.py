"""
Database Optimization Utilities for Sahatak
Provides caching, query optimization, and performance monitoring
"""

import time
import functools
from flask import current_app
from sqlalchemy import event
from sqlalchemy.engine import Engine
from utils.logging_config import app_logger
from models import db
import hashlib
import json


class QueryCache:
    """Simple in-memory cache for database queries"""
    
    def __init__(self, default_ttl=300):  # 5 minutes default
        self.cache = {}
        self.default_ttl = default_ttl
    
    def _generate_key(self, query_str, params=None):
        """Generate cache key from query and parameters"""
        key_data = {
            'query': query_str,
            'params': params or {}
        }
        key_json = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_json.encode()).hexdigest()
    
    def get(self, query_str, params=None):
        """Get cached result if available and not expired"""
        key = self._generate_key(query_str, params)
        if key in self.cache:
            result, timestamp, ttl = self.cache[key]
            if time.time() - timestamp < ttl:
                app_logger.debug(f"Cache hit: {key[:12]}...")
                return result
            else:
                # Remove expired entry
                del self.cache[key]
        return None
    
    def set(self, query_str, result, params=None, ttl=None):
        """Cache query result"""
        if ttl is None:
            ttl = self.default_ttl
        key = self._generate_key(query_str, params)
        self.cache[key] = (result, time.time(), ttl)
        app_logger.debug(f"Cache set: {key[:12]}... (TTL: {ttl}s)")
    
    def clear(self):
        """Clear all cached entries"""
        self.cache.clear()
        app_logger.info("Query cache cleared")
    
    def clear_pattern(self, pattern):
        """Clear cache entries matching pattern"""
        keys_to_remove = []
        for key in self.cache:
            query_str = list(self.cache[key])[0] if self.cache[key] else ""
            if pattern in str(query_str):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.cache[key]
        
        if keys_to_remove:
            app_logger.debug(f"Cleared {len(keys_to_remove)} cache entries matching '{pattern}'")


# Global cache instance
query_cache = QueryCache()


def cached_query(ttl=300, cache_key=None):
    """Decorator for caching database queries
    
    Args:
        ttl: Time to live in seconds
        cache_key: Custom cache key function
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key:
                key = cache_key(*args, **kwargs)
            else:
                key = f"{func.__name__}_{str(args)}_{str(sorted(kwargs.items()))}"
            
            # Check cache first
            result = query_cache.get(key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            query_cache.set(key, result, ttl=ttl)
            return result
        return wrapper
    return decorator


class QueryOptimizer:
    """Query optimization utilities"""
    
    @staticmethod
    def eager_load_relationships(query, *relationships):
        """Add eager loading for relationships to avoid N+1 queries"""
        from sqlalchemy.orm import joinedload
        for relationship in relationships:
            query = query.options(joinedload(relationship))
        return query
    
    @staticmethod
    def paginate_efficiently(query, page, per_page, max_per_page=100):
        """Efficient pagination with limits"""
        per_page = min(per_page, max_per_page)  # Prevent excessive page sizes
        
        # Use limit/offset for better performance than paginate() for large datasets
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        
        # Get total count efficiently
        total = query.count()
        
        return {
            'items': items,
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page,
            'has_next': page * per_page < total,
            'has_prev': page > 1
        }
    
    @staticmethod
    def bulk_insert(model_class, data_list, batch_size=100):
        """Efficient bulk insert operation"""
        try:
            for i in range(0, len(data_list), batch_size):
                batch = data_list[i:i + batch_size]
                db.session.bulk_insert_mappings(model_class, batch)
            db.session.commit()
            app_logger.info(f"Bulk inserted {len(data_list)} {model_class.__name__} records")
        except Exception as e:
            db.session.rollback()
            app_logger.error(f"Bulk insert failed: {str(e)}")
            raise
    
    @staticmethod
    def bulk_update(model_class, data_list, batch_size=100):
        """Efficient bulk update operation"""
        try:
            for i in range(0, len(data_list), batch_size):
                batch = data_list[i:i + batch_size]
                db.session.bulk_update_mappings(model_class, batch)
            db.session.commit()
            app_logger.info(f"Bulk updated {len(data_list)} {model_class.__name__} records")
        except Exception as e:
            db.session.rollback()
            app_logger.error(f"Bulk update failed: {str(e)}")
            raise


class PerformanceMonitor:
    """Database performance monitoring"""
    
    def __init__(self):
        self.slow_queries = []
        self.query_count = 0
        self.total_time = 0.0
    
    def log_slow_query(self, query, duration, params=None):
        """Log slow queries for analysis"""
        self.slow_queries.append({
            'query': str(query),
            'duration': duration,
            'params': params,
            'timestamp': time.time()
        })
        
        # Keep only last 100 slow queries
        if len(self.slow_queries) > 100:
            self.slow_queries.pop(0)
        
        app_logger.warn(f"Slow query ({duration:.3f}s): {str(query)[:200]}...")
    
    def increment_query_count(self, duration):
        """Track query statistics"""
        self.query_count += 1
        self.total_time += duration
    
    def get_stats(self):
        """Get performance statistics"""
        avg_time = self.total_time / self.query_count if self.query_count > 0 else 0
        return {
            'query_count': self.query_count,
            'total_time': self.total_time,
            'average_time': avg_time,
            'slow_queries_count': len(self.slow_queries),
            'cache_size': len(query_cache.cache)
        }
    
    def reset_stats(self):
        """Reset performance counters"""
        self.query_count = 0
        self.total_time = 0.0
        self.slow_queries.clear()


# Global performance monitor
perf_monitor = PerformanceMonitor()


# SQLAlchemy event listeners for performance monitoring
@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.time()


@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    duration = time.time() - context._query_start_time
    perf_monitor.increment_query_count(duration)
    
    # Log slow queries (>1 second)
    if duration > 1.0:
        perf_monitor.log_slow_query(statement, duration, parameters)


# Cache invalidation helpers
def invalidate_cache_for_model(model_name):
    """Invalidate cache entries for specific model"""
    query_cache.clear_pattern(model_name.lower())


def invalidate_user_cache(user_id):
    """Invalidate cache entries for specific user"""
    query_cache.clear_pattern(f"user_{user_id}")


def invalidate_appointment_cache():
    """Invalidate appointment-related cache"""
    query_cache.clear_pattern("appointment")
    query_cache.clear_pattern("availability")


def invalidate_medical_cache(patient_id):
    """Invalidate medical data cache for patient"""
    query_cache.clear_pattern(f"patient_{patient_id}")
    query_cache.clear_pattern("medical_history")
    query_cache.clear_pattern("prescription")


# Optimized query builders
class OptimizedQueries:
    """Pre-built optimized queries for common operations"""
    
    @staticmethod
    @cached_query(ttl=600)  # Cache for 10 minutes
    def get_doctors_with_profiles():
        """Get all doctors with their user profiles in one query"""
        from models import Doctor, User
        from sqlalchemy.orm import joinedload
        
        return Doctor.query.options(
            joinedload(Doctor.user)
        ).join(User).filter(
            User.is_active == True,
            User.is_verified == True,
            Doctor.is_verified == True
        ).all()
    
    @staticmethod
    @cached_query(ttl=300)  # Cache for 5 minutes
    def get_patient_appointments(patient_id):
        """Get patient appointments with doctor info"""
        from models import Appointment, Doctor, User
        from sqlalchemy.orm import joinedload
        
        return Appointment.query.options(
            joinedload(Appointment.doctor).joinedload(Doctor.user)
        ).filter_by(patient_id=patient_id).order_by(
            Appointment.appointment_date.desc()
        ).all()
    
    @staticmethod
    @cached_query(ttl=300)  # Cache for 5 minutes
    def get_doctor_appointments(doctor_id):
        """Get doctor appointments with patient info (excluding completed ones)"""
        from models import Appointment, Patient, User
        from sqlalchemy.orm import joinedload
        
        return Appointment.query.options(
            joinedload(Appointment.patient).joinedload(Patient.user)
        ).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status != 'completed'  # Exclude completed appointments
        ).order_by(
            Appointment.appointment_date.desc()
        ).all()
    
    @staticmethod
    @cached_query(ttl=1800)  # Cache for 30 minutes
    def get_patient_medical_history(patient_id):
        """Get complete medical history for patient"""
        from models import Patient, MedicalHistoryEntry, Prescription, Diagnosis
        from sqlalchemy.orm import joinedload
        
        return Patient.query.options(
            joinedload(Patient.medical_history_entries),
            joinedload(Patient.prescriptions).joinedload(Prescription.doctor),
            joinedload(Patient.diagnoses).joinedload(Diagnosis.doctor)
        ).get(patient_id)


# Initialize performance monitoring in production
def init_db_optimization(app):
    """Initialize database optimization features"""
    app_logger.info("Database optimization utilities initialized")
    
    # Add cleanup job for cache (could be moved to a background task)
    @app.before_request
    def cleanup_expired_cache():
        # Simple cleanup - in production use a background job
        if len(query_cache.cache) > 1000:  # Basic cleanup trigger
            query_cache.clear()
            app_logger.info("Cache cleared due to size limit")