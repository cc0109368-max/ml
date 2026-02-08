/**
 * Habit Tracker Application
 * Main JavaScript file for frontend functionality
 */

// API Configuration
const API_BASE_URL = 'http://localhost:8001/api';

// Application State
let appState = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    habits: [],
    dashboardData: null,
    currentPage: 'tracker'
};

// Month names
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Day names
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ===============================================
// INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Set up year selector
    setupYearSelector();
    
    // Set up month selector
    setupMonthSelector();
    
    // Set up navigation
    setupNavigation();
    
    // Set up modal
    setupModal();
    
    // Load initial data
    await loadDashboardData();
    
    // Initialize chart
    initializeProgressChart();
}

// ===============================================
// NAVIGATION
// ===============================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
    });
    
    // Show selected page
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.remove('hidden');
    }
    
    appState.currentPage = page;
    
    // Load page-specific data
    switch (page) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'tracker':
            loadDashboardData();
            break;
        case 'money-market':
            loadMoneyMarket();
            break;
        case 'progress':
            loadProgressCharts();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ===============================================
// YEAR & MONTH SELECTORS
// ===============================================

function setupYearSelector() {
    const yearSelect = document.getElementById('year-select');
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === appState.currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
    
    yearSelect.addEventListener('change', () => {
        appState.currentYear = parseInt(yearSelect.value);
        updateMonthDisplay();
        loadDashboardData();
    });
}

function setupMonthSelector() {
    const monthSelect = document.getElementById('month-select');
    monthSelect.value = appState.currentMonth;
    
    monthSelect.addEventListener('change', () => {
        appState.currentMonth = parseInt(monthSelect.value);
        updateMonthDisplay();
        loadDashboardData();
    });
    
    updateMonthDisplay();
}

function updateMonthDisplay() {
    const display = document.getElementById('current-month-display');
    display.textContent = `- ${MONTH_NAMES[appState.currentMonth - 1]} -`;
}

// ===============================================
// DATA LOADING
// ===============================================

async function loadDashboardData() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/dashboard?year=${appState.currentYear}&month=${appState.currentMonth}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        appState.dashboardData = await response.json();
        
        renderWeeksHeader(appState.dashboardData);
        renderHabitsGrid(appState.dashboardData);
        renderOverviewStats(appState.dashboardData);
        renderOverallProgressPanel(appState.dashboardData);
        updateProgressChart(appState.dashboardData);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Try to render with mock data if API is not available
        renderMockData();
    }
}

function renderMockData() {
    // Default habits from image
    const mockHabits = [
        { id: 1, name: 'Wake up without snoozing', goal: 30 },
        { id: 2, name: 'read ebooks -60 minutes', goal: 30 },
        { id: 3, name: 'First 41:48 target', goal: 30 },
        { id: 4, name: 'Avoid 5-10 eggs', goal: 30 },
        { id: 5, name: 'No workout/exercise (30 minutes)', goal: 30 },
        { id: 6, name: 'sleep before 11 PM', goal: 30 },
        { id: 7, name: 'Learn 1 web-relevant skill (15 min)', goal: 30 },
        { id: 8, name: 'Write 1 page journal', goal: 30 },
        { id: 9, name: 'Sleep before Midnight', goal: 30 },
        { id: 10, name: 'Money Market – Learn 1 Concept (20 min)', goal: 30 }
    ];
    
    const mockData = generateMockDashboardData(mockHabits);
    
    renderWeeksHeader(mockData);
    renderHabitsGrid(mockData);
    renderOverviewStats(mockData);
    renderOverallProgressPanel(mockData);
}

function generateMockDashboardData(habits) {
    const year = appState.currentYear;
    const month = appState.currentMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Generate weeks
    const weeks = [];
    let weekDays = [];
    let weekNum = 1;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        weekDays.push({
            date: date.toISOString().split('T')[0],
            day: day,
            weekday: DAY_NAMES[dayOfWeek],
            completed: 0,
            total: habits.length,
            percentage: 0
        });
        
        if (dayOfWeek === 6 || day === daysInMonth) {
            weeks.push({
                week_number: weekNum,
                days: [...weekDays],
                completed: 0,
                total: weekDays.length * habits.length,
                percentage: 0
            });
            weekDays = [];
            weekNum++;
        }
    }
    
    // Generate habits with tracking
    const habitsWithTracking = habits.map(habit => {
        const tracking = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = new Date().getDate() === day && 
                           new Date().getMonth() + 1 === month &&
                           new Date().getFullYear() === year;
            const isPast = new Date(year, month - 1, day) < new Date().setHours(0, 0, 0, 0);
            
            tracking.push({
                date: new Date(year, month - 1, day).toISOString().split('T')[0],
                day: day,
                completed: false,
                failed: isPast && !isToday,
                streak_count: 0
            });
        }
        
        return {
            ...habit,
            tracking: tracking,
            month_completed: 0,
            current_streak: 0
        };
    });
    
    return {
        year: year,
        month: month,
        month_name: MONTH_NAMES[month - 1],
        days_in_month: daysInMonth,
        habits: habitsWithTracking,
        weeks: weeks,
        overall: {
            completed: 0,
            goal: habits.length * daysInMonth,
            left: habits.length * daysInMonth,
            percentage: 0
        }
    };
}

// ===============================================
// RENDER FUNCTIONS
// ===============================================

function renderWeeksHeader(data) {
    const container = document.getElementById('weeks-header');
    container.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    data.weeks.forEach((week, index) => {
        const weekEl = document.createElement('div');
        weekEl.className = `week-column week-${index + 1}`;
        
        // Check if this week contains today
        const weekContainsToday = week.days.some(day => {
            const dayDate = new Date(appState.currentYear, appState.currentMonth - 1, day.day);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() === today.getTime();
        });
        
        if (weekContainsToday) {
            weekEl.classList.add('current-week');
        }
        
        // Check if week is in the past (last day of week < today)
        const lastDayOfWeek = week.days[week.days.length - 1];
        const lastDayDate = new Date(appState.currentYear, appState.currentMonth - 1, lastDayOfWeek.day);
        lastDayDate.setHours(0, 0, 0, 0);
        const isWeekPast = lastDayDate < today;
        if (isWeekPast) {
            weekEl.classList.add('past-week');
        }
        
        // Check if week is in the future
        const firstDayOfWeek = week.days[0];
        const firstDayDate = new Date(appState.currentYear, appState.currentMonth - 1, firstDayOfWeek.day);
        firstDayDate.setHours(0, 0, 0, 0);
        if (firstDayDate > today) {
            weekEl.classList.add('future-week');
        }
        
        // Week header
        let weekHtml = `<div class="week-header">WEEK ${week.week_number}</div>`;
        
        // Day headers with proper states
        weekHtml += '<div class="week-days">';
        week.days.forEach(day => {
            const dayDate = new Date(appState.currentYear, appState.currentMonth - 1, day.day);
            dayDate.setHours(0, 0, 0, 0);
            
            const isToday = dayDate.getTime() === today.getTime();
            const isPast = dayDate < today;
            const isFuture = dayDate > today;
            
            // Check if all habits are completed for this day
            const allCompleted = checkDayFullyCompleted(data, day.day);
            
            let dayClass = 'day-column';
            if (isToday) {
                dayClass += allCompleted ? ' today-complete' : ' today-active';
            } else if (isPast) {
                if (allCompleted) {
                    dayClass += ' past-complete';
                } else if (weekContainsToday) {
                    // Past day in CURRENT WEEK = WARNING (still editable)
                    dayClass += ' past-warning';
                } else if (isWeekPast) {
                    // Past week = FAILED (locked)
                    dayClass += ' past-failed';
                } else {
                    dayClass += ' past-warning';
                }
            } else if (isFuture) {
                dayClass += ' future-disabled';
            }
            
            const dateStr = `${appState.currentYear}-${String(appState.currentMonth).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
            
            weekHtml += `
                <div class="${dayClass}" data-date="${dateStr}" data-day="${day.day}">
                    <div class="day-name">${day.weekday}</div>
                    <div class="day-number">${day.day}</div>
                </div>
            `;
        });
        weekHtml += '</div>';
        
        weekEl.innerHTML = weekHtml;
        container.appendChild(weekEl);
    });
}

// Check if all habits are completed for a specific day
function checkDayFullyCompleted(data, dayNumber) {
    if (!data || !data.habits || data.habits.length === 0) return false;
    
    return data.habits.every(habit => {
        const tracking = habit.tracking.find(t => t.day === dayNumber);
        return tracking && tracking.completed;
    });
}


function renderHabitsGrid(data) {
    const container = document.getElementById('habits-grid');
    container.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if viewing current month
    const isCurrentMonth = appState.currentYear === today.getFullYear() && 
                           appState.currentMonth === (today.getMonth() + 1);
    
    data.habits.forEach(habit => {
        const rowEl = document.createElement('div');
        rowEl.className = 'habit-row';
        
        if (habit.name.toLowerCase().includes('money market')) {
            rowEl.classList.add('money-market');
        }
        
        // Habit info with edit option
        let rowHtml = `
            <div class="habit-info">
                <div class="habit-name" ${habit.name.toLowerCase().includes('money market') ? 'onclick="navigateToPage(\'money-market\')"' : ''}>${habit.name}</div>
                <div class="habit-goal">${habit.goal}</div>
            </div>
            <div class="habit-checkboxes">
        `;
        
        // Create checkboxes for each week - ALL CLICKABLE
        data.weeks.forEach((week, weekIndex) => {
            rowHtml += `<div class="week-checkboxes week-${weekIndex + 1}-checkboxes">`;
            
            week.days.forEach(day => {
                // Find tracking for this day
                const tracking = habit.tracking.find(t => t.day === day.day);
                
                // Calculate date for visual styling only (NOT for blocking clicks)
                const dayDate = new Date(appState.currentYear, appState.currentMonth - 1, day.day);
                dayDate.setHours(0, 0, 0, 0);
                
                const isToday = isCurrentMonth && dayDate.getTime() === today.getTime();
                const isPast = dayDate < today;
                const isFuture = dayDate > today;
                
                // Determine current state based on tracking data
                // State: 0 = pending (yellow), 1 = completed (green), 2 = failed (red)
                let currentState = 0; // Default: pending/yellow
                if (tracking) {
                    if (tracking.completed) {
                        currentState = 1; // Completed/green
                    } else if (tracking.failed) {
                        currentState = 2; // Failed/red
                    }
                }
                
                // Build checkbox class for visual display
                let checkboxClass = 'day-checkbox clickable';
                
                if (currentState === 1) {
                    checkboxClass += ' completed'; // GREEN
                } else if (currentState === 2) {
                    checkboxClass += ' failed'; // RED
                } else {
                    checkboxClass += ' pending'; // YELLOW
                }
                
                // Add today highlight if applicable
                if (isToday) {
                    checkboxClass += ' today-highlight';
                }
                
                // Create proper date string for data attribute
                const dateStr = `${appState.currentYear}-${String(appState.currentMonth).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
                
                // ALL CELLS ARE CLICKABLE - no date-based restrictions
                rowHtml += `
                    <div class="day-checkbox-container${isToday ? ' today-container' : ''}">
                        <div class="${checkboxClass}" 
                             data-habit-id="${habit.id}" 
                             data-day="${day.day}"
                             data-date="${dateStr}"
                             data-state="${currentState}"
                             onclick="cycleHabitState(this)"></div>
                    </div>
                `;
            });
            
            rowHtml += '</div>';
        });
        
        rowHtml += '</div>';
        rowEl.innerHTML = rowHtml;
        container.appendChild(rowEl);
    });
}

function renderOverviewStats(data) {
    // Render completed stats
    const completedStats = document.getElementById('completed-stats');
    const goalStats = document.getElementById('goal-stats');
    const leftStats = document.getElementById('left-stats');
    
    // Calculate weekly stats
    let html = '';
    data.weeks.forEach(week => {
        week.days.forEach(day => {
            let dayCompleted = 0;
            data.habits.forEach(habit => {
                const tracking = habit.tracking.find(t => t.day === day.day);
                if (tracking?.completed) dayCompleted++;
            });
            html += `<span class="stat-value" style="min-width: 18px; text-align: center; font-size: 0.65rem;">${dayCompleted}</span>`;
        });
    });
    
    if (completedStats) completedStats.innerHTML = html;
    
    // Goals (same for all)
    html = '';
    data.weeks.forEach(week => {
        week.days.forEach(() => {
            html += `<span class="stat-value" style="min-width: 18px; text-align: center; font-size: 0.65rem;">${data.habits.length}</span>`;
        });
    });
    if (goalStats) goalStats.innerHTML = html;
    
    // Left stats
    html = '';
    data.weeks.forEach(week => {
        week.days.forEach(day => {
            let dayCompleted = 0;
            data.habits.forEach(habit => {
                const tracking = habit.tracking.find(t => t.day === day.day);
                if (tracking?.completed) dayCompleted++;
            });
            const left = data.habits.length - dayCompleted;
            html += `<span class="stat-value" style="min-width: 18px; text-align: center; font-size: 0.65rem;">${left}</span>`;
        });
    });
    if (leftStats) leftStats.innerHTML = html;
}

function renderOverallProgressPanel(data) {
    const container = document.getElementById('progress-rows');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calculate progress for each habit
    data.habits.forEach((habit, index) => {
        const completed = habit.month_completed || 0;
        const goal = habit.goal;
        const left = goal - completed;
        const percentage = goal > 0 ? Math.round((completed / goal) * 100) : 0;
        
        const rowEl = document.createElement('div');
        rowEl.className = 'progress-row';
        rowEl.innerHTML = `
            <span class="prog-completed">${completed}</span>
            <span class="prog-left">${left}</span>
            <span class="prog-percent">${percentage}%</span>
            <div class="prog-bar">
                <div class="prog-bar-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        container.appendChild(rowEl);
    });
}

// ===============================================
// HABIT TRACKING - STATE CYCLING
// ===============================================

// State: 0 = pending (yellow), 1 = completed (green), 2 = failed (red)
async function cycleHabitState(element) {
    const habitId = parseInt(element.dataset.habitId);
    const dateStr = element.dataset.date;
    const dayNumber = parseInt(element.dataset.day);
    let currentState = parseInt(element.dataset.state) || 0;
    
    // Cycle to next state: 0 → 1 → 2 → 0 (YELLOW → GREEN → RED → YELLOW)
    const nextState = (currentState + 1) % 3;
    
    // Update UI immediately for responsiveness
    element.classList.remove('pending', 'completed', 'failed');
    element.dataset.state = nextState;
    
    if (nextState === 0) {
        element.classList.add('pending'); // YELLOW
    } else if (nextState === 1) {
        element.classList.add('completed'); // GREEN
    } else {
        element.classList.add('failed'); // RED
    }
    
    // Determine completed and failed status for API
    const isCompleted = (nextState === 1);
    const isFailed = (nextState === 2);
    
    try {
        const response = await fetch(`${API_BASE_URL}/tracking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                habit_id: habitId,
                date: dateStr,
                completed: isCompleted,
                failed: isFailed
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update tracking');
        }
        
        // Update progress display without full reload for speed
        updateDayColumnHeaderSimple(dayNumber);
        
    } catch (error) {
        console.error('Error updating habit:', error);
        // Revert UI on error
        element.classList.remove('pending', 'completed', 'failed');
        element.dataset.state = currentState;
        
        if (currentState === 0) {
            element.classList.add('pending');
        } else if (currentState === 1) {
            element.classList.add('completed');
        } else {
            element.classList.add('failed');
        }
    }
}

// Simple day column header update
function updateDayColumnHeaderSimple(dayNumber) {
    const dayCheckboxes = document.querySelectorAll(`.day-checkbox[data-day="${dayNumber}"]`);
    if (dayCheckboxes.length === 0) return;
    
    const allCompleted = Array.from(dayCheckboxes).every(cb => cb.classList.contains('completed'));
    const dayColumnHeader = document.querySelector(`.day-column[data-day="${dayNumber}"]`);
    
    if (dayColumnHeader) {
        dayColumnHeader.classList.remove('today-active', 'today-complete', 'past-complete', 'past-failed', 'past-warning');
        if (allCompleted) {
            dayColumnHeader.classList.add('past-complete');
        }
    }
}

// Legacy function - kept for compatibility
async function toggleHabit(element) {
    cycleHabitState(element);
}

// Update day column header based on completion status
function updateDayColumnHeader(dayNumber, isToday) {
    // Get all checkboxes for this day
    const dayCheckboxes = document.querySelectorAll(`.day-checkbox[data-day="${dayNumber}"]`);
    
    if (dayCheckboxes.length === 0) return;
    
    // Check if all are completed
    const allCompleted = Array.from(dayCheckboxes).every(cb => cb.classList.contains('completed'));
    
    // Find the day column header
    const dayColumnHeader = document.querySelector(`.day-column[data-day="${dayNumber}"]`);
    
    if (dayColumnHeader) {
        if (isToday) {
            if (allCompleted) {
                dayColumnHeader.classList.remove('today-active');
                dayColumnHeader.classList.add('today-complete');
            } else {
                dayColumnHeader.classList.remove('today-complete');
                dayColumnHeader.classList.add('today-active');
            }
        } else {
            // Past day in current week
            if (allCompleted) {
                dayColumnHeader.classList.remove('past-failed', 'past-warning');
                dayColumnHeader.classList.add('past-complete');
            } else {
                dayColumnHeader.classList.remove('past-complete', 'past-failed');
                dayColumnHeader.classList.add('past-warning');
            }
        }
    }
}

// ===============================================
// PROGRESS CHART
// ===============================================

let progressChart = null;

function initializeProgressChart() {
    const ctx = document.getElementById('progress-chart');
    if (!ctx) return;
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Completion %',
                data: [],
                borderColor: '#00bcd4',
                backgroundColor: 'rgba(0, 188, 212, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#00bcd4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        color: '#a0a0c0',
                        callback: value => value + '%'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0a0c0',
                        maxTicksLimit: 15
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateProgressChart(data) {
    if (!progressChart) return;
    
    const labels = [];
    const values = [];
    
    data.weeks.forEach(week => {
        week.days.forEach(day => {
            labels.push(day.day.toString());
            
            let dayCompleted = 0;
            data.habits.forEach(habit => {
                const tracking = habit.tracking.find(t => t.day === day.day);
                if (tracking?.completed) dayCompleted++;
            });
            
            const percentage = data.habits.length > 0 
                ? Math.round((dayCompleted / data.habits.length) * 100) 
                : 0;
            values.push(percentage);
        });
    });
    
    progressChart.data.labels = labels;
    progressChart.data.datasets[0].data = values;
    progressChart.update();
}

// ===============================================
// MONEY MARKET → RESOURCES MODE
// ===============================================

// Resource links for learning
const RESOURCE_LINKS = [
    { id: 1, name: "Investopedia - Stock Market Basics", url: "https://www.investopedia.com/articles/basics/06/invest1000.asp", category: "Basics" },
    { id: 2, name: "Khan Academy - Finance & Capital Markets", url: "https://www.khanacademy.org/economics-finance-domain/core-finance", category: "Education" },
    { id: 3, name: "Yahoo Finance - Market News", url: "https://finance.yahoo.com/", category: "News" },
    { id: 4, name: "Bloomberg Markets", url: "https://www.bloomberg.com/markets", category: "News" },
    { id: 5, name: "Zerodha Varsity - Trading Modules", url: "https://zerodha.com/varsity/", category: "Trading" },
    { id: 6, name: "Moneycontrol - Indian Markets", url: "https://www.moneycontrol.com/", category: "India" },
    { id: 7, name: "TradingView - Charts & Analysis", url: "https://www.tradingview.com/", category: "Charts" },
    { id: 8, name: "NSE India - Official Exchange", url: "https://www.nseindia.com/", category: "India" },
    { id: 9, name: "Screener.in - Stock Screening", url: "https://www.screener.in/", category: "Research" },
    { id: 10, name: "Economic Times Markets", url: "https://economictimes.indiatimes.com/markets", category: "News" }
];

// Track visited resources (stored in localStorage)
function getVisitedResources() {
    const visited = localStorage.getItem('visitedResources');
    return visited ? JSON.parse(visited) : [];
}

function markResourceVisited(resourceId) {
    const visited = getVisitedResources();
    if (!visited.includes(resourceId)) {
        visited.push(resourceId);
        localStorage.setItem('visitedResources', JSON.stringify(visited));
    }
}

async function loadMoneyMarket() {
    renderResourcesMode();
}

function renderResourcesMode() {
    const conceptCard = document.getElementById('today-concept');
    const visited = getVisitedResources();
    
    conceptCard.innerHTML = `
        <div class="category" style="background: var(--accent-cyan);">📚 Learning Resources</div>
        <h2>Money Market Resources</h2>
        <p class="duration">Click any resource to learn • No time limit • No forced completion</p>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
            Browse these curated resources at your own pace. Resources you visit will be tracked for progress.
        </p>
        <div class="resources-list">
            ${RESOURCE_LINKS.map(resource => `
                <div class="resource-item ${visited.includes(resource.id) ? 'visited' : ''}" data-resource-id="${resource.id}">
                    <span class="resource-category">${resource.category}</span>
                    <a href="${resource.url}" target="_blank" rel="noopener" 
                       onclick="markResourceVisited(${resource.id}); renderResourcesMode();"
                       class="resource-link">
                        ${resource.name}
                        <span class="external-icon">↗</span>
                    </a>
                    ${visited.includes(resource.id) ? '<span class="visited-badge">✓ Visited</span>' : ''}
                </div>
            `).join('')}
        </div>
    `;
    
    // Update progress
    const progressContainer = document.getElementById('concepts-progress');
    const visitedCount = visited.length;
    const totalCount = RESOURCE_LINKS.length;
    const percentage = Math.round((visitedCount / totalCount) * 100);
    
    progressContainer.innerHTML = `
        <h3>📊 Resources Explored</h3>
        <div class="progress-bar-large">
            <div class="fill" style="width: ${percentage}%"></div>
        </div>
        <p style="color: var(--text-secondary);">${visitedCount} / ${totalCount} resources visited (${percentage}%)</p>
        <button class="reset-btn" onclick="resetResourceProgress()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: rgba(255,68,68,0.2); border: 1px solid #ff4444; color: #ff4444; border-radius: 4px; cursor: pointer;">Reset Progress</button>
    `;
    
    // Hide concepts list since we're using resources
    const conceptsList = document.getElementById('concepts-list');
    if (conceptsList) {
        conceptsList.style.display = 'none';
    }
}

function resetResourceProgress() {
    if (confirm('Are you sure you want to reset your resource visit progress?')) {
        localStorage.removeItem('visitedResources');
        renderResourcesMode();
    }
}

// Legacy function - kept for compatibility
function renderMoneyMarketMock() {
    renderResourcesMode();
}

function renderMoneyMarket(today, concepts, progress) {
    const conceptCard = document.getElementById('today-concept');
    const concept = today.concept;
    
    conceptCard.innerHTML = `
        <div class="category">${concept.category}</div>
        <h2>${concept.name}</h2>
        <p class="duration">⏱️ ${concept.duration} minutes</p>
        <textarea class="notes-area" placeholder="Take notes as you learn...">${today.notes || ''}</textarea>
        <button class="complete-btn" ${today.completed ? 'disabled' : ''} onclick="completeConcept('${concept.name}')">
            ${today.completed ? '✓ Completed!' : '✓ Mark as Completed'}
        </button>
    `;
    
    const progressContainer = document.getElementById('concepts-progress');
    progressContainer.innerHTML = `
        <h3>📊 Learning Progress</h3>
        <div class="progress-bar-large">
            <div class="fill" style="width: ${progress.percentage}%"></div>
        </div>
        <p style="color: var(--text-secondary);">${progress.completed_concepts} / ${progress.total_concepts} concepts completed (${progress.percentage}%)</p>
    `;
    
    const conceptsList = document.getElementById('concepts-list');
    conceptsList.innerHTML = concepts.map(c => `
        <div class="concept-item ${progress.recent_completions?.some(r => r.concept === c.name) ? 'completed' : ''}">
            <div class="name">${c.name}</div>
            <div class="meta">${c.category} • ${c.duration} min</div>
        </div>
    `).join('');
}

async function completeConcept(conceptName) {
    try {
        const notes = document.querySelector('.notes-area').value;
        const today = new Date().toISOString().split('T')[0];
        
        await fetch(`${API_BASE_URL}/money-market/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: today,
                concept_name: conceptName,
                notes: notes,
                time_spent_minutes: 20
            })
        });
        
        // Reload
        loadMoneyMarket();
        
    } catch (error) {
        console.error('Error completing concept:', error);
    }
}

// ===============================================
// DASHBOARD STATS
// ===============================================

async function loadDashboardStats() {
    const container = document.getElementById('dashboard-stats');
    
    try {
        const response = await fetch(
            `${API_BASE_URL}/dashboard?year=${appState.currentYear}&month=${appState.currentMonth}`
        );
        const data = await response.json();
        
        // Calculate stats
        const totalHabits = data.habits.length;
        const todayCompleted = data.habits.filter(h => {
            const today = new Date().getDate();
            const tracking = h.tracking.find(t => t.day === today);
            return tracking?.completed;
        }).length;
        
        const maxStreak = Math.max(...data.habits.map(h => h.current_streak || 0), 0);
        const overallPercentage = data.overall.percentage;
        
        container.innerHTML = `
            <div class="stat-card">
                <div class="value">${totalHabits}</div>
                <div class="label">Active Habits</div>
            </div>
            <div class="stat-card">
                <div class="value">${todayCompleted}/${totalHabits}</div>
                <div class="label">Today's Progress</div>
            </div>
            <div class="stat-card">
                <div class="value">${maxStreak}</div>
                <div class="label">Best Streak</div>
            </div>
            <div class="stat-card">
                <div class="value">${overallPercentage}%</div>
                <div class="label">Monthly Completion</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        container.innerHTML = `
            <div class="stat-card">
                <div class="value">10</div>
                <div class="label">Active Habits</div>
            </div>
            <div class="stat-card">
                <div class="value">0/10</div>
                <div class="label">Today's Progress</div>
            </div>
            <div class="stat-card">
                <div class="value">0</div>
                <div class="label">Best Streak</div>
            </div>
            <div class="stat-card">
                <div class="value">0%</div>
                <div class="label">Monthly Completion</div>
            </div>
        `;
    }
}

// ===============================================
// PROGRESS CHARTS
// ===============================================

async function loadProgressCharts() {
    const container = document.getElementById('charts-container');
    
    container.innerHTML = `
        <div class="chart-card">
            <h3>📈 Weekly Trend</h3>
            <canvas id="weekly-chart"></canvas>
        </div>
        <div class="chart-card">
            <h3>🎯 Habit Distribution</h3>
            <canvas id="distribution-chart"></canvas>
        </div>
    `;
    
    // Fetch actual tracking data
    let weeklyData = [0, 0, 0, 0, 0];
    let completedCount = 0;
    let failedCount = 0;
    let remainingCount = 0;
    
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard?year=${appState.currentYear}&month=${appState.currentMonth}`);
        const data = await response.json();
        
        if (data && data.habits && data.weeks) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Calculate WEEKLY TREND: (GREEN cells / total cells) per week
            data.weeks.forEach((week, weekIndex) => {
                let weekCompleted = 0;
                let weekTotal = 0;
                
                week.days.forEach(day => {
                    const dayDate = new Date(appState.currentYear, appState.currentMonth - 1, day.day);
                    dayDate.setHours(0, 0, 0, 0);
                    
                    // Only count days up to today (not future days)
                    if (dayDate <= today) {
                        data.habits.forEach(habit => {
                            const tracking = habit.tracking.find(t => t.day === day.day);
                            weekTotal++;
                            
                            // ONLY count as completed if user actually clicked (GREEN)
                            if (tracking && tracking.completed === true) {
                                weekCompleted++;
                            }
                        });
                    }
                });
                
                // Calculate percentage - ONLY based on actual clicks
                // If no cells exist or no days have passed, percentage is 0
                weeklyData[weekIndex] = weekTotal > 0 
                    ? Math.round((weekCompleted / weekTotal) * 100) 
                    : 0;
            });
            
            // Calculate DISTRIBUTION: Count actual cell states
            data.weeks.forEach(week => {
                week.days.forEach(day => {
                    const dayDate = new Date(appState.currentYear, appState.currentMonth - 1, day.day);
                    dayDate.setHours(0, 0, 0, 0);
                    
                    data.habits.forEach(habit => {
                        const tracking = habit.tracking.find(t => t.day === day.day);
                        
                        if (dayDate > today) {
                            // Future days = Remaining (not counted yet)
                            remainingCount++;
                        } else if (dayDate.getTime() === today.getTime()) {
                            // Today
                            if (tracking && tracking.completed === true) {
                                completedCount++; // GREEN - user clicked
                            } else {
                                remainingCount++; // YELLOW - in progress, not failed
                            }
                        } else {
                            // Past days
                            if (tracking && tracking.completed === true) {
                                completedCount++; // GREEN - user completed
                            } else {
                                failedCount++; // RED - user did NOT click
                            }
                        }
                    });
                });
            });
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
        // Keep all values at 0 if error - NO mock data
    }
    
    // Weekly trend chart - ACTUAL DATA
    const weeklyCtx = document.getElementById('weekly-chart');
    new Chart(weeklyCtx, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [{
                label: 'Completion %',
                data: weeklyData,  // ACTUAL calculated data, not mock
                backgroundColor: [
                    'rgba(92, 107, 192, 0.7)',
                    'rgba(0, 188, 212, 0.7)',
                    'rgba(139, 195, 74, 0.7)',
                    'rgba(255, 152, 0, 0.7)',
                    'rgba(233, 30, 99, 0.7)'
                ],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#a0a0c0',
                        callback: value => value + '%'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0a0c0'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Distribution chart - ACTUAL DATA
    const distCtx = document.getElementById('distribution-chart');
    new Chart(distCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Failed', 'Remaining'],
            datasets: [{
                data: [completedCount, failedCount, remainingCount],  // ACTUAL counts
                backgroundColor: [
                    '#00e676',
                    '#ff4444',
                    '#a0a0c0'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0a0c0'
                    }
                }
            }
        }
    });
}

// ===============================================
// SETTINGS
// ===============================================

async function loadSettings() {
    const habitsList = document.getElementById('habits-manage-list');
    const currentMonthName = MONTH_NAMES[appState.currentMonth - 1];
    
    // Add month indicator above habits list
    const monthIndicator = document.createElement('div');
    monthIndicator.className = 'month-indicator';
    monthIndicator.innerHTML = `
        <p style="color: var(--accent-cyan); font-weight: 600; margin-bottom: 1rem;">
            📅 Managing habits for: <strong>${currentMonthName} ${appState.currentYear}</strong>
        </p>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">
            Changes will apply only to this month. Each month can have different habits.
        </p>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/habits`);
        const habits = await response.json();
        
        habitsList.innerHTML = '';
        habitsList.appendChild(monthIndicator);
        
        if (habits.length === 0) {
            habitsList.innerHTML += `
                <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">
                    No habits configured for ${currentMonthName}. Click "Add New Habit" to get started.
                </p>
            `;
        } else {
            habits.forEach((habit, index) => {
                const habitItem = document.createElement('div');
                habitItem.className = 'habit-manage-item';
                habitItem.innerHTML = `
                    <span class="habit-order">${index + 1}</span>
                    <span class="name">${habit.name}</span>
                    <span class="goal-badge">Goal: ${habit.goal || 30}</span>
                    <div class="actions">
                        <button class="btn btn-secondary btn-small" onclick="editHabit(${habit.id})">✏️ Edit</button>
                        <button class="btn btn-danger btn-small" onclick="deleteHabit(${habit.id})">🗑️ Delete</button>
                    </div>
                `;
                habitsList.appendChild(habitItem);
            });
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
        habitsList.innerHTML = '<p style="color: var(--text-secondary);">Unable to load habits. Make sure the backend is running.</p>';
    }
}

async function deleteHabit(habitId) {
    if (!confirm('Are you sure you want to delete this habit? This will remove it from the current month.')) return;
    
    try {
        await fetch(`${API_BASE_URL}/habits/${habitId}`, {
            method: 'DELETE'
        });
        
        loadSettings();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error deleting habit:', error);
        alert('Error deleting habit. Please try again.');
    }
}

async function editHabit(habitId) {
    const newName = prompt('Enter new habit name:');
    if (!newName || newName.trim() === '') return;
    
    try {
        await fetch(`${API_BASE_URL}/habits/${habitId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newName.trim()
            })
        });
        
        loadSettings();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error editing habit:', error);
        alert('Error editing habit. Please try again.');
    }
}

// ===============================================
// MODAL
// ===============================================

function setupModal() {
    const modal = document.getElementById('add-habit-modal');
    const addBtn = document.getElementById('add-habit-btn');
    const cancelBtn = document.getElementById('cancel-habit-btn');
    const form = document.getElementById('add-habit-form');
    
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('habit-name').value;
            const goal = parseInt(document.getElementById('habit-goal').value);
            
            try {
                await fetch(`${API_BASE_URL}/habits`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        goal: goal,
                        color: '#00ff00'
                    })
                });
                
                modal.classList.add('hidden');
                form.reset();
                loadSettings();
                loadDashboardData();
                
            } catch (error) {
                console.error('Error adding habit:', error);
            }
        });
    }
    
    // Close modal on outside click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// ===============================================
// COUNTDOWN TIMER & WARNING NOTIFICATION
// ===============================================

let countdownInterval = null;
let warningShown = false;
let warningDismissed = false;

function initializeCountdownTimer() {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const diff = midnight - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const timerValue = document.getElementById('timer-value');
    const timerBar = document.getElementById('timer-bar');
    const countdownTimer = document.getElementById('countdown-timer');
    
    if (timerValue) {
        timerValue.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Calculate progress (24 hours = 86400 seconds)
    const totalSecondsInDay = 24 * 60 * 60;
    const remainingSeconds = hours * 3600 + minutes * 60 + seconds;
    const progressPercent = (remainingSeconds / totalSecondsInDay) * 100;
    
    if (timerBar) {
        timerBar.style.width = `${progressPercent}%`;
    }
    
    // Check if less than 10 minutes remaining
    const totalMinutesRemaining = hours * 60 + minutes;
    
    if (totalMinutesRemaining < 10) {
        // Add warning class to timer
        if (countdownTimer) {
            countdownTimer.classList.add('warning');
        }
        
        // Show warning notification (only once per session unless dismissed)
        if (!warningShown && !warningDismissed) {
            showWarningNotification(totalMinutesRemaining, seconds);
            warningShown = true;
        }
        
        // Update warning message
        updateWarningMessage(totalMinutesRemaining, seconds);
    } else {
        if (countdownTimer) {
            countdownTimer.classList.remove('warning');
        }
        warningShown = false;
    }
}

function showWarningNotification(minutes, seconds) {
    const notification = document.getElementById('warning-notification');
    if (notification) {
        notification.classList.remove('hidden');
        
        // Try to play sound (may be blocked by browser)
        try {
            const sound = document.getElementById('warning-sound');
            if (sound) {
                sound.play().catch(() => {});
            }
        } catch (e) {}
    }
}

function updateWarningMessage(minutes, seconds) {
    const messageEl = document.getElementById('warning-message');
    if (messageEl) {
        if (minutes === 0) {
            messageEl.textContent = `Only ${seconds} seconds remaining! Complete your habits NOW!`;
        } else {
            messageEl.textContent = `Only ${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} seconds remaining!`;
        }
    }
}

function dismissWarning() {
    const notification = document.getElementById('warning-notification');
    if (notification) {
        notification.classList.add('hidden');
        warningDismissed = true;
    }
}

// Initialize countdown when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeCountdownTimer();
});
