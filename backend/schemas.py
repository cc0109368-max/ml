"""Pydantic schemas for API request/response validation"""
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


# Habit Schemas
class HabitBase(BaseModel):
    name: str
    goal: int = 30
    color: str = "#00ff00"


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[int] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class HabitResponse(HabitBase):
    id: int
    order_index: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Tracking Schemas
class TrackingCreate(BaseModel):
    habit_id: int
    date: date
    completed: bool
    failed: Optional[bool] = None  # Optional: explicitly set failed state


class TrackingUpdate(BaseModel):
    completed: bool


class TrackingResponse(BaseModel):
    id: int
    habit_id: int
    date: date
    completed: bool
    failed: bool
    streak_count: int
    
    class Config:
        from_attributes = True


# Progress Schemas
class DayProgress(BaseModel):
    date: date
    completed: int
    total: int
    percentage: float


class WeekProgress(BaseModel):
    week_number: int
    start_date: date
    end_date: date
    days: List[DayProgress]
    total_completed: int
    total_possible: int
    percentage: float


class MonthProgress(BaseModel):
    year: int
    month: int
    month_name: str
    weeks: List[WeekProgress]
    overall_completed: int
    overall_goal: int
    overall_left: int
    overall_percentage: float


class HabitWithTracking(BaseModel):
    habit: HabitResponse
    tracking: List[TrackingResponse]
    month_completed: int
    month_goal: int
    current_streak: int


class DashboardData(BaseModel):
    habits: List[HabitWithTracking]
    month_progress: MonthProgress
    current_year: int
    current_month: int


# Money Market Schemas
class MoneyMarketConceptBase(BaseModel):
    concept_name: str
    notes: Optional[str] = None
    time_spent_minutes: int = 0


class MoneyMarketConceptCreate(MoneyMarketConceptBase):
    date: date


class MoneyMarketConceptResponse(MoneyMarketConceptBase):
    id: int
    date: date
    completed: bool
    
    class Config:
        from_attributes = True


# Settings Schemas
class SettingUpdate(BaseModel):
    key: str
    value: str


class NotificationSettingsUpdate(BaseModel):
    email_enabled: bool = True
    email_address: Optional[str] = None
    notification_time: str = "00:00"
