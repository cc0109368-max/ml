"""FastAPI Backend for Habit Tracker Application"""
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Optional
import calendar

from database import init_db, get_db, Habit, HabitTracking, DailyProgress, MoneyMarketProgress, Settings
from schemas import (
    HabitCreate, HabitUpdate, HabitResponse, 
    TrackingCreate, TrackingUpdate, TrackingResponse,
    DashboardData, HabitWithTracking, MonthProgress, WeekProgress, DayProgress,
    MoneyMarketConceptCreate, MoneyMarketConceptResponse,
    SettingUpdate
)
from scheduler import start_scheduler, stop_scheduler

app = FastAPI(
    title="Habit Tracker API",
    description="Backend API for the Discipline-focused Habit Tracker",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database and start scheduler on startup"""
    init_db()
    start_scheduler()
    
    # Create default habits if none exist
    db = next(get_db())
    try:
        habit_count = db.query(Habit).count()
        if habit_count == 0:
            default_habits = [
                {"name": "Wake up without snoozing", "goal": 30, "color": "#00ff00"},
                {"name": "read ebooks -60 minutes", "goal": 30, "color": "#00ff00"},
                {"name": "First 41:48 target", "goal": 30, "color": "#00ff00"},
                {"name": "Avoid 5-10 eggs", "goal": 30, "color": "#00ff00"},
                {"name": "No workout/exercise (30 minutes)", "goal": 30, "color": "#00ff00"},
                {"name": "sleep before 11 PM", "goal": 30, "color": "#00ff00"},
                {"name": "Learn 1 web-relevant skill (15 min)", "goal": 30, "color": "#00ff00"},
                {"name": "Write 1 page journal", "goal": 30, "color": "#00ff00"},
                {"name": "Sleep before Midnight", "goal": 30, "color": "#00ff00"},
                {"name": "Money Market – Learn 1 Concept (20 min)", "goal": 30, "color": "#ffa502"},
            ]
            for i, h in enumerate(default_habits):
                habit = Habit(name=h["name"], goal=h["goal"], color=h["color"], order_index=i)
                db.add(habit)
            db.commit()
    finally:
        db.close()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler on shutdown"""
    stop_scheduler()


# ============== HABIT ENDPOINTS ==============

@app.get("/api/habits", response_model=List[HabitResponse])
async def get_habits(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all habits"""
    query = db.query(Habit)
    if active_only:
        query = query.filter(Habit.is_active == True)
    habits = query.order_by(Habit.order_index).all()
    return habits


@app.post("/api/habits", response_model=HabitResponse)
async def create_habit(
    habit: HabitCreate,
    db: Session = Depends(get_db)
):
    """Create a new habit"""
    max_order = db.query(Habit).count()
    new_habit = Habit(
        name=habit.name,
        goal=habit.goal,
        color=habit.color,
        order_index=max_order
    )
    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)
    return new_habit


@app.put("/api/habits/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: int,
    habit_update: HabitUpdate,
    db: Session = Depends(get_db)
):
    """Update a habit"""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    update_data = habit_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(habit, key, value)
    
    db.commit()
    db.refresh(habit)
    return habit


@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    """Delete a habit"""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    db.delete(habit)
    db.commit()
    return {"message": "Habit deleted successfully"}


# ============== TRACKING ENDPOINTS ==============

@app.post("/api/tracking", response_model=TrackingResponse)
async def track_habit(
    tracking: TrackingCreate,
    db: Session = Depends(get_db)
):
    """Track/update a habit for a specific date"""
    # Check if habit exists
    habit = db.query(Habit).filter(Habit.id == tracking.habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Check if tracking record exists
    existing = db.query(HabitTracking).filter(
        HabitTracking.habit_id == tracking.habit_id,
        HabitTracking.date == tracking.date
    ).first()
    
    # Calculate streak
    yesterday = tracking.date - timedelta(days=1)
    yesterday_tracking = db.query(HabitTracking).filter(
        HabitTracking.habit_id == tracking.habit_id,
        HabitTracking.date == yesterday,
        HabitTracking.completed == True
    ).first()
    
    new_streak = (yesterday_tracking.streak_count + 1) if yesterday_tracking and tracking.completed else (1 if tracking.completed else 0)
    
    # Determine failed status - use explicit value if provided, otherwise derive
    if tracking.failed is not None:
        is_failed = tracking.failed
    else:
        is_failed = not tracking.completed
    
    if existing:
        existing.completed = tracking.completed
        existing.failed = is_failed
        existing.streak_count = new_streak
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_tracking = HabitTracking(
            habit_id=tracking.habit_id,
            date=tracking.date,
            completed=tracking.completed,
            failed=is_failed,
            streak_count=new_streak
        )
        db.add(new_tracking)
        db.commit()
        db.refresh(new_tracking)
        return new_tracking


@app.get("/api/tracking/{habit_id}", response_model=List[TrackingResponse])
async def get_habit_tracking(
    habit_id: int,
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db)
):
    """Get tracking records for a habit"""
    query = db.query(HabitTracking).filter(HabitTracking.habit_id == habit_id)
    
    if year and month:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        query = query.filter(
            HabitTracking.date >= start_date,
            HabitTracking.date <= end_date
        )
    
    return query.order_by(HabitTracking.date).all()


# ============== DASHBOARD & PROGRESS ENDPOINTS ==============

@app.get("/api/dashboard")
async def get_dashboard(
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db)
):
    """Get complete dashboard data for display"""
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # Get all active habits
    habits = db.query(Habit).filter(Habit.is_active == True).order_by(Habit.order_index).all()
    
    # Calculate month boundaries
    _, days_in_month = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, days_in_month)
    
    # Build habits with tracking data
    habits_data = []
    total_completed = 0
    total_possible = 0
    
    for habit in habits:
        tracking_records = db.query(HabitTracking).filter(
            HabitTracking.habit_id == habit.id,
            HabitTracking.date >= start_date,
            HabitTracking.date <= end_date
        ).all()
        
        # Create tracking dict for quick lookup
        tracking_dict = {str(t.date): t for t in tracking_records}
        
        # Build full month tracking
        month_tracking = []
        month_completed = 0
        current_streak = 0
        
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            date_str = str(current_date)
            
            if date_str in tracking_dict:
                tracking = tracking_dict[date_str]
                month_tracking.append({
                    "date": date_str,
                    "day": day,
                    "completed": tracking.completed,
                    "failed": tracking.failed,
                    "streak_count": tracking.streak_count
                })
                if tracking.completed:
                    month_completed += 1
                    if current_date <= date.today():
                        current_streak = tracking.streak_count
            else:
                # No record - check if date is in the past
                is_past = current_date < date.today()
                month_tracking.append({
                    "date": date_str,
                    "day": day,
                    "completed": False,
                    "failed": is_past,
                    "streak_count": 0
                })
        
        total_completed += month_completed
        total_possible += min(date.today().day if year == datetime.now().year and month == datetime.now().month else days_in_month, days_in_month)
        
        habits_data.append({
            "id": habit.id,
            "name": habit.name,
            "goal": habit.goal,
            "color": habit.color,
            "tracking": month_tracking,
            "month_completed": month_completed,
            "current_streak": current_streak
        })
    
    # Build week structure
    weeks = []
    cal = calendar.Calendar(firstweekday=6)  # Sunday start
    month_calendar = cal.monthdatescalendar(year, month)
    
    for week_num, week in enumerate(month_calendar, 1):
        week_days = []
        week_completed = 0
        week_total = 0
        
        for day_date in week:
            if day_date.month == month:
                day_completed = 0
                for habit_data in habits_data:
                    for t in habit_data["tracking"]:
                        if t["day"] == day_date.day and t["completed"]:
                            day_completed += 1
                
                day_total = len(habits)
                week_completed += day_completed
                week_total += day_total
                
                week_days.append({
                    "date": str(day_date),
                    "day": day_date.day,
                    "weekday": day_date.strftime("%a"),
                    "completed": day_completed,
                    "total": day_total,
                    "percentage": round((day_completed / day_total * 100) if day_total > 0 else 0, 1)
                })
        
        if week_days:  # Only add weeks with days in this month
            weeks.append({
                "week_number": week_num,
                "days": week_days,
                "completed": week_completed,
                "total": week_total,
                "percentage": round((week_completed / week_total * 100) if week_total > 0 else 0, 2)
            })
    
    # Overall progress
    overall_percentage = round((total_completed / total_possible * 100) if total_possible > 0 else 0, 2)
    
    return {
        "year": year,
        "month": month,
        "month_name": calendar.month_name[month],
        "days_in_month": days_in_month,
        "habits": habits_data,
        "weeks": weeks,
        "overall": {
            "completed": total_completed,
            "goal": len(habits) * days_in_month,
            "left": (len(habits) * days_in_month) - total_completed,
            "percentage": overall_percentage
        }
    }


# ============== MONEY MARKET ENDPOINTS ==============

# Money Market Concepts for learning
MONEY_MARKET_CONCEPTS = [
    {"id": 1, "name": "What is the Stock Market?", "category": "Basics", "duration": 20},
    {"id": 2, "name": "Understanding Bull vs Bear Markets", "category": "Basics", "duration": 20},
    {"id": 3, "name": "What are Stocks and Shares?", "category": "Basics", "duration": 20},
    {"id": 4, "name": "Market Indices (Nifty, Sensex)", "category": "Basics", "duration": 20},
    {"id": 5, "name": "How Stock Exchanges Work", "category": "Basics", "duration": 20},
    {"id": 6, "name": "Types of Orders (Market, Limit, Stop)", "category": "Trading", "duration": 20},
    {"id": 7, "name": "Bid-Ask Spread Explained", "category": "Trading", "duration": 20},
    {"id": 8, "name": "Understanding Volume", "category": "Trading", "duration": 20},
    {"id": 9, "name": "Candlestick Chart Basics", "category": "Technical", "duration": 20},
    {"id": 10, "name": "Support and Resistance Levels", "category": "Technical", "duration": 20},
    {"id": 11, "name": "Moving Averages (SMA, EMA)", "category": "Technical", "duration": 20},
    {"id": 12, "name": "RSI Indicator", "category": "Technical", "duration": 20},
    {"id": 13, "name": "MACD Indicator", "category": "Technical", "duration": 20},
    {"id": 14, "name": "Fundamental Analysis Basics", "category": "Fundamental", "duration": 20},
    {"id": 15, "name": "P/E Ratio Explained", "category": "Fundamental", "duration": 20},
    {"id": 16, "name": "Understanding EPS", "category": "Fundamental", "duration": 20},
    {"id": 17, "name": "Dividend Investing Basics", "category": "Fundamental", "duration": 20},
    {"id": 18, "name": "Market Capitalization", "category": "Fundamental", "duration": 20},
    {"id": 19, "name": "Risk Management Basics", "category": "Risk", "duration": 20},
    {"id": 20, "name": "Position Sizing", "category": "Risk", "duration": 20},
    {"id": 21, "name": "Stop Loss Strategies", "category": "Risk", "duration": 20},
    {"id": 22, "name": "Portfolio Diversification", "category": "Risk", "duration": 20},
    {"id": 23, "name": "Mutual Funds Basics", "category": "Products", "duration": 20},
    {"id": 24, "name": "ETFs Explained", "category": "Products", "duration": 20},
    {"id": 25, "name": "Bonds and Fixed Income", "category": "Products", "duration": 20},
    {"id": 26, "name": "Options Trading Basics", "category": "Derivatives", "duration": 20},
    {"id": 27, "name": "Futures Contracts", "category": "Derivatives", "duration": 20},
    {"id": 28, "name": "IPO Process", "category": "Corporate", "duration": 20},
    {"id": 29, "name": "Annual Reports Reading", "category": "Corporate", "duration": 20},
    {"id": 30, "name": "Market Psychology", "category": "Psychology", "duration": 20},
]


@app.get("/api/money-market/concepts")
async def get_money_market_concepts():
    """Get all money market learning concepts"""
    return MONEY_MARKET_CONCEPTS


@app.get("/api/money-market/today")
async def get_today_concept(db: Session = Depends(get_db)):
    """Get today's learning concept"""
    today = date.today()
    
    # Check if already learned today
    today_progress = db.query(MoneyMarketProgress).filter(
        MoneyMarketProgress.date == today
    ).first()
    
    if today_progress:
        concept = next((c for c in MONEY_MARKET_CONCEPTS if c["name"] == today_progress.concept_name), None)
        return {
            "concept": concept,
            "completed": today_progress.completed,
            "notes": today_progress.notes,
            "time_spent": today_progress.time_spent_minutes
        }
    
    # Get next concept to learn
    completed_count = db.query(MoneyMarketProgress).filter(
        MoneyMarketProgress.completed == True
    ).count()
    
    next_concept_index = completed_count % len(MONEY_MARKET_CONCEPTS)
    next_concept = MONEY_MARKET_CONCEPTS[next_concept_index]
    
    return {
        "concept": next_concept,
        "completed": False,
        "notes": None,
        "time_spent": 0
    }


@app.post("/api/money-market/complete")
async def complete_concept(
    data: MoneyMarketConceptCreate,
    db: Session = Depends(get_db)
):
    """Mark a concept as completed"""
    existing = db.query(MoneyMarketProgress).filter(
        MoneyMarketProgress.date == data.date
    ).first()
    
    if existing:
        existing.completed = True
        existing.notes = data.notes
        existing.time_spent_minutes = data.time_spent_minutes
    else:
        new_progress = MoneyMarketProgress(
            date=data.date,
            concept_name=data.concept_name,
            completed=True,
            notes=data.notes,
            time_spent_minutes=data.time_spent_minutes
        )
        db.add(new_progress)
    
    db.commit()
    
    return {"message": "Concept completed successfully"}


@app.get("/api/money-market/progress")
async def get_money_market_progress(db: Session = Depends(get_db)):
    """Get overall money market learning progress"""
    total = len(MONEY_MARKET_CONCEPTS)
    completed = db.query(MoneyMarketProgress).filter(
        MoneyMarketProgress.completed == True
    ).count()
    
    recent = db.query(MoneyMarketProgress).filter(
        MoneyMarketProgress.completed == True
    ).order_by(MoneyMarketProgress.date.desc()).limit(10).all()
    
    return {
        "total_concepts": total,
        "completed_concepts": completed,
        "percentage": round((completed / total * 100) if total > 0 else 0, 1),
        "recent_completions": [
            {"date": str(r.date), "concept": r.concept_name}
            for r in recent
        ]
    }


# ============== SETTINGS ENDPOINTS ==============

@app.get("/api/settings")
async def get_settings(db: Session = Depends(get_db)):
    """Get all settings"""
    settings = db.query(Settings).all()
    return {s.key: s.value for s in settings}


@app.put("/api/settings")
async def update_settings(
    setting: SettingUpdate,
    db: Session = Depends(get_db)
):
    """Update a setting"""
    existing = db.query(Settings).filter(Settings.key == setting.key).first()
    
    if existing:
        existing.value = setting.value
    else:
        new_setting = Settings(key=setting.key, value=setting.value)
        db.add(new_setting)
    
    db.commit()
    return {"message": "Setting updated"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Habit Tracker API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
