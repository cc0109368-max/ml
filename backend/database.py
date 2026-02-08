"""Database configuration and models for Habit Tracker"""
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Date, DateTime, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, date

DATABASE_URL = "sqlite:///./habit_tracker.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Habit(Base):
    """Habit model - represents a trackable habit"""
    __tablename__ = "habits"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    goal = Column(Integer, default=30)  # Monthly goal
    color = Column(String(50), default="#00ff00")  # Green by default
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to tracking records
    tracking_records = relationship("HabitTracking", back_populates="habit", cascade="all, delete-orphan")


class HabitTracking(Base):
    """Daily tracking record for each habit"""
    __tablename__ = "habit_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    date = Column(Date, nullable=False)
    completed = Column(Boolean, default=False)
    failed = Column(Boolean, default=False)  # True if day passed without completion
    streak_count = Column(Integer, default=0)
    
    # Relationship back to habit
    habit = relationship("Habit", back_populates="tracking_records")


class DailyProgress(Base):
    """Daily overall progress summary"""
    __tablename__ = "daily_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True)
    total_habits = Column(Integer, default=0)
    completed_habits = Column(Integer, default=0)
    failed_habits = Column(Integer, default=0)
    completion_percentage = Column(Float, default=0.0)


class NotificationLog(Base):
    """Log of sent notifications"""
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=True)
    notification_type = Column(String(50), nullable=False)  # email, system
    message = Column(String(1000), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)


class Settings(Base):
    """Application settings"""
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(500), nullable=False)


class MoneyMarketProgress(Base):
    """Track Money Market learning progress"""
    __tablename__ = "money_market_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    concept_name = Column(String(255), nullable=False)
    completed = Column(Boolean, default=False)
    notes = Column(String(2000), nullable=True)
    time_spent_minutes = Column(Integer, default=0)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
