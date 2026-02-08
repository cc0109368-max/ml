"""APScheduler for daily reset and failure notifications"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, Habit, HabitTracking, DailyProgress, NotificationLog
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

scheduler = AsyncIOScheduler()


async def check_and_mark_failures():
    """
    Check for incomplete habits from yesterday and mark them as failed.
    Called at 00:00 daily.
    """
    db = SessionLocal()
    try:
        yesterday = date.today() - timedelta(days=1)
        
        # Get all active habits
        habits = db.query(Habit).filter(Habit.is_active == True).all()
        
        failed_habits = []
        
        for habit in habits:
            # Check if there's a tracking record for yesterday
            tracking = db.query(HabitTracking).filter(
                HabitTracking.habit_id == habit.id,
                HabitTracking.date == yesterday
            ).first()
            
            if tracking:
                if not tracking.completed:
                    # Mark as failed
                    tracking.failed = True
                    tracking.streak_count = 0
                    failed_habits.append(habit)
            else:
                # No record exists - create one and mark as failed
                new_tracking = HabitTracking(
                    habit_id=habit.id,
                    date=yesterday,
                    completed=False,
                    failed=True,
                    streak_count=0
                )
                db.add(new_tracking)
                failed_habits.append(habit)
        
        # Update daily progress
        total_habits = len(habits)
        completed = total_habits - len(failed_habits)
        
        daily_progress = db.query(DailyProgress).filter(
            DailyProgress.date == yesterday
        ).first()
        
        if daily_progress:
            daily_progress.failed_habits = len(failed_habits)
            daily_progress.completed_habits = completed
            daily_progress.completion_percentage = (completed / total_habits * 100) if total_habits > 0 else 0
        else:
            daily_progress = DailyProgress(
                date=yesterday,
                total_habits=total_habits,
                completed_habits=completed,
                failed_habits=len(failed_habits),
                completion_percentage=(completed / total_habits * 100) if total_habits > 0 else 0
            )
            db.add(daily_progress)
        
        db.commit()
        
        # Send failure notification if any habits failed
        if failed_habits:
            await send_failure_notification(failed_habits, yesterday, db)
            
        print(f"[{datetime.now()}] Daily check completed. Failed habits: {len(failed_habits)}")
        
    except Exception as e:
        print(f"Error in daily check: {e}")
        db.rollback()
    finally:
        db.close()


async def send_failure_notification(failed_habits: list, failure_date: date, db: Session):
    """Send email notification for failed habits"""
    try:
        # Get email settings
        email_enabled = os.getenv("EMAIL_NOTIFICATIONS_ENABLED", "false").lower() == "true"
        
        if not email_enabled:
            print("Email notifications disabled")
            return
            
        recipient_email = os.getenv("NOTIFICATION_EMAIL", "")
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        
        if not recipient_email or not smtp_username:
            print("Email configuration incomplete")
            return
        
        # Build message
        habit_names = ", ".join([h.name for h in failed_habits])
        
        subject = f"⚠️ HABIT FAILURE ALERT - {failure_date.strftime('%Y-%m-%d')}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #1a1a2e; color: #eee; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #16213e; padding: 30px; border-radius: 10px;">
                <h1 style="color: #ff4757; margin-bottom: 20px;">🚨 Habit Failure Alert</h1>
                <p style="font-size: 16px; color: #a0a0a0;">Date: {failure_date.strftime('%A, %B %d, %Y')}</p>
                <h2 style="color: #ffa502; margin-top: 30px;">Failed Habits ({len(failed_habits)}):</h2>
                <ul style="list-style: none; padding: 0;">
        """
        
        for habit in failed_habits:
            body += f'<li style="padding: 10px; margin: 5px 0; background: #2d3436; border-left: 4px solid #ff4757; border-radius: 4px;">❌ {habit.name}</li>'
        
        body += """
                </ul>
                <div style="margin-top: 30px; padding: 20px; background: #2d3436; border-radius: 8px;">
                    <p style="color: #ff6b6b; font-weight: bold; margin: 0;">STREAK BROKEN!</p>
                    <p style="color: #a0a0a0; margin-top: 10px;">Your discipline requires immediate attention. No excuses.</p>
                </div>
                <p style="margin-top: 30px; font-size: 14px; color: #666;">— Habit Tracker System</p>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_username
        msg["To"] = recipient_email
        
        msg.attach(MIMEText(body, "html"))
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_username, recipient_email, msg.as_string())
        
        # Log notification
        log = NotificationLog(
            notification_type="email",
            message=f"Failed habits notification: {habit_names}",
            success=True
        )
        db.add(log)
        db.commit()
        
        print(f"Failure notification sent for {len(failed_habits)} habits")
        
    except Exception as e:
        print(f"Error sending notification: {e}")
        # Log failed notification
        log = NotificationLog(
            notification_type="email",
            message=f"Failed to send notification: {str(e)}",
            success=False
        )
        db.add(log)
        db.commit()


def start_scheduler():
    """Start the APScheduler with daily tasks"""
    # Daily reset at midnight
    scheduler.add_job(
        check_and_mark_failures,
        CronTrigger(hour=0, minute=0),
        id="daily_failure_check",
        replace_existing=True
    )
    
    scheduler.start()
    print("Scheduler started - Daily checks scheduled at 00:00")


def stop_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
