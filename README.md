# Habit Tracker - Discipline System

A professional habit tracking web application with a spreadsheet-style grid layout, daily tracking, streak management, and email notifications for missed habits.

## Features

- **Spreadsheet-Style UI**: PDF/Excel-like grid layout matching the reference design
- **Weekly View**: 5-week monthly view with day-by-day checkboxes
- **Daily Tracking**: Checkbox-based habit completion tracking
- **Automatic Failure Detection**: Missed habits are automatically marked as failed at midnight
- **Email Notifications**: Receive alerts when habits are not completed
- **Streak Tracking**: Track consecutive days of habit completion
- **Money Market Learning**: Dedicated module for learning investment concepts
- **Progress Analytics**: Visual charts and statistics

## Project Structure

```
habit-tracker/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── database.py       # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── scheduler.py      # APScheduler for daily checks
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment variables template
└── frontend/
    ├── index.html        # Main HTML
    ├── styles.css        # CSS styling
    └── app.js            # JavaScript application
```

## Setup Instructions

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment** (recommended):
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # or
   source venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure email notifications** (optional):
   - Copy `.env.example` to `.env`
   - Fill in your SMTP credentials

5. **Run the server**:
   ```bash
   python main.py
   ```
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup

1. **Open frontend in browser**:
   - Simply open `frontend/index.html` in your browser
   - Or use a local server:
   ```bash
   cd frontend
   python -m http.server 3000
   ```
   Then visit http://localhost:3000

## API Endpoints

### Habits
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/{id}` - Update habit
- `DELETE /api/habits/{id}` - Delete habit

### Tracking
- `POST /api/tracking` - Track/update habit completion
- `GET /api/tracking/{habit_id}` - Get tracking records

### Dashboard
- `GET /api/dashboard?year=2026&month=1` - Get full dashboard data

### Money Market
- `GET /api/money-market/concepts` - Get all learning concepts
- `GET /api/money-market/today` - Get today's concept
- `POST /api/money-market/complete` - Mark concept as completed
- `GET /api/money-market/progress` - Get learning progress

## Database Schema

### Tables
- **habits**: Stores habit definitions (name, goal, color)
- **habit_tracking**: Daily tracking records (completed, failed, streak)
- **daily_progress**: Aggregated daily statistics
- **money_market_progress**: Learning module progress
- **notification_logs**: Email notification history
- **settings**: Application settings

## Email Notification Setup

To enable email notifications for failed habits:

1. Edit `.env` file:
   ```
   EMAIL_NOTIFICATIONS_ENABLED=true
   NOTIFICATION_EMAIL=your-email@example.com
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-gmail@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

2. For Gmail, create an "App Password":
   - Go to Google Account > Security
   - Enable 2-Factor Authentication
   - Generate an App Password for "Mail"

## Technology Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite, APScheduler
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js

## Screenshots

The application matches the reference spreadsheet-style design with:
- Dark theme background
- Color-coded weekly headers (purple, cyan, green, orange, pink)
- Green checkbox borders for tracking
- Overall progress panel on the right
- Pink/magenta section headers

## License

MIT License
