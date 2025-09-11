# Admin Dashboard Analytics - Sahatak Telemedicine Platform

## Table of Contents
1. [Overview](#overview)
2. [Chart Implementation](#chart-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend API Integration](#backend-api-integration)
5. [Chart.js Configuration](#chartjs-configuration)
6. [Mobile Responsiveness](#mobile-responsiveness)

---

## Overview

The Sahatak Admin Dashboard features two main analytical charts to provide administrators with key insights into platform usage and performance:

1. **Doctor Specialty Distribution Chart** (Pie Chart)
2. **Appointment Status Distribution Chart** (Doughnut Chart)

These charts are located in the Platform Health & Analytics section of the admin dashboard and use Chart.js for interactive data visualization.

### HTML Structure
```html
<!-- Platform Health & Analytics Section -->
<div class="row mb-4">
    <!-- Doctor Specialty Distribution -->
    <div class="col-lg-6">
        <div class="analytics-card">
            <h6><i class="bi bi-pie-chart me-2"></i>Doctor Specialties</h6>
            <div class="chart-container">
                <canvas id="specialtyDistributionChart"></canvas>
            </div>
        </div>
    </div>
    
    <!-- Appointment Status Distribution -->
    <div class="col-lg-6">
        <div class="analytics-card">
            <h6><i class="bi bi-bar-chart me-2"></i>Appointment Status</h6>
            <div class="chart-container">
                <canvas id="appointmentStatusChart"></canvas>
            </div>
        </div>
    </div>
</div>
```

---

## Chart Implementation

### 1. Doctor Specialty Distribution Chart

**Purpose:** Shows the distribution of doctors across different medical specialties

**Chart Type:** Pie Chart
**Canvas ID:** `specialtyDistributionChart`
**Location:** Left column of analytics section

### 2. Appointment Status Distribution Chart

**Purpose:** Shows the distribution of appointments by their current status (completed, scheduled, cancelled, etc.)

**Chart Type:** Doughnut Chart
**Canvas ID:** `appointmentStatusChart`
**Location:** Right column of analytics section

---

## Frontend Implementation

### JavaScript Implementation

```javascript
// frontend/assets/js/admin.js
class AdminDashboardCharts {
    constructor() {
        this.specialtyChart = null;
        this.appointmentChart = null;
        this.init();
    }
    
    async init() {
        await this.loadSpecialtyDistribution();
        await this.loadAppointmentStatus();
    }
    
    // Doctor Specialty Distribution Chart
    async loadSpecialtyDistribution() {
        try {
            const response = await ApiHelper.makeRequest('/admin/analytics/specialty-distribution');
            if (response.success) {
                this.createSpecialtyChart(response.data);
            }
        } catch (error) {
            console.error('Failed to load specialty distribution:', error);
            this.showChartError('specialtyDistributionChart', 'Failed to load specialty data');
        }
    }
    
    createSpecialtyChart(data) {
        const ctx = document.getElementById('specialtyDistributionChart');
        if (!ctx) return;
        
        this.specialtyChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.specialties, // ['Cardiology', 'Pediatrics', 'Internal Medicine', ...]
                datasets: [{
                    data: data.counts, // [15, 12, 8, ...]
                    backgroundColor: [
                        '#3498db', // Blue
                        '#e74c3c', // Red
                        '#27ae60', // Green
                        '#f39c12', // Orange
                        '#9b59b6', // Purple
                        '#1abc9c', // Teal
                        '#34495e', // Dark Gray
                        '#e67e22', // Dark Orange
                        '#2ecc71', // Emerald
                        '#e91e63'  // Pink
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${label}: ${value} doctors (${percentage}%)`;
                            }
                        }
                    }
                },
                layout: {
                    padding: 10
                }
            }
        });
    }
    
    // Appointment Status Distribution Chart
    async loadAppointmentStatus() {
        try {
            const response = await ApiHelper.makeRequest('/admin/analytics/appointment-status');
            if (response.success) {
                this.createAppointmentChart(response.data);
            }
        } catch (error) {
            console.error('Failed to load appointment status:', error);
            this.showChartError('appointmentStatusChart', 'Failed to load appointment data');
        }
    }
    
    createAppointmentChart(data) {
        const ctx = document.getElementById('appointmentStatusChart');
        if (!ctx) return;
        
        this.appointmentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.statuses, // ['Completed', 'Scheduled', 'Cancelled', 'No-Show']
                datasets: [{
                    data: data.counts, // [156, 89, 23, 12]
                    backgroundColor: [
                        '#27ae60', // Green - Completed
                        '#3498db', // Blue - Scheduled
                        '#e74c3c', // Red - Cancelled
                        '#f39c12'  // Orange - No-Show
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%', // Creates the doughnut hole
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${label}: ${value} appointments (${percentage}%)`;
                            }
                        }
                    }
                },
                layout: {
                    padding: 10
                }
            }
        });
    }
    
    // Error handling for charts
    showChartError(canvasId, message) {
        const container = document.getElementById(canvasId).parentElement;
        container.innerHTML = `
            <div class="chart-error text-center p-4">
                <i class="bi bi-exclamation-triangle text-warning fs-1"></i>
                <p class="mt-2 text-muted">${message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
            </div>
        `;
    }
    
    // Refresh charts data
    async refreshCharts() {
        await this.loadSpecialtyDistribution();
        await this.loadAppointmentStatus();
    }
}

// Initialize charts when admin dashboard is loaded
let adminCharts = null;
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('specialtyDistributionChart')) {
        adminCharts = new AdminDashboardCharts();
    }
});
```

---

## Backend API Integration

### API Endpoints

```python
# backend/routes/admin.py
@app.route('/admin/analytics/specialty-distribution', methods=['GET'])
@api_login_required
@admin_required
def get_specialty_distribution():
    """Get distribution of doctors by specialty."""
    try:
        # Query to get doctor count by specialty
        specialty_data = db.session.query(
            User.specialty,
            func.count(User.id).label('count')
        ).filter(
            User.user_type == 'doctor',
            User.is_active == True,
            User.specialty.isnot(None)
        ).group_by(
            User.specialty
        ).order_by(
            desc('count')
        ).all()
        
        # Process data for chart
        specialties = []
        counts = []
        
        for row in specialty_data:
            if row.specialty:  # Only include non-empty specialties
                specialties.append(row.specialty)
                counts.append(row.count)
        
        return APIResponse.success(
            data={
                'specialties': specialties,
                'counts': counts,
                'total_doctors': sum(counts)
            },
            message='Specialty distribution data retrieved successfully'
        )
        
    except Exception as e:
        logger.error(f'Failed to get specialty distribution: {str(e)}')
        return APIResponse.internal_error('Failed to retrieve specialty distribution')

@app.route('/admin/analytics/appointment-status', methods=['GET'])
@api_login_required
@admin_required
def get_appointment_status():
    """Get distribution of appointments by status."""
    try:
        # Query to get appointment count by status
        status_data = db.session.query(
            Appointment.status,
            func.count(Appointment.id).label('count')
        ).group_by(
            Appointment.status
        ).order_by(
            desc('count')
        ).all()
        
        # Process data for chart
        statuses = []
        counts = []
        
        # Map status values to display names
        status_display_names = {
            'completed': 'Completed',
            'scheduled': 'Scheduled',
            'cancelled': 'Cancelled',
            'no_show': 'No-Show',
            'in_progress': 'In Progress'
        }
        
        for row in status_data:
            display_name = status_display_names.get(row.status, row.status.title())
            statuses.append(display_name)
            counts.append(row.count)
        
        return APIResponse.success(
            data={
                'statuses': statuses,
                'counts': counts,
                'total_appointments': sum(counts)
            },
            message='Appointment status data retrieved successfully'
        )
        
    except Exception as e:
        logger.error(f'Failed to get appointment status: {str(e)}')
        return APIResponse.internal_error('Failed to retrieve appointment status')
```

### Database Models

The charts rely on the following database models:

```python
# backend/models/user.py
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_type = db.Column(db.String(20), nullable=False)  # 'patient', 'doctor', 'admin'
    specialty = db.Column(db.String(100))  # For doctors only
    is_active = db.Column(db.Boolean, default=True)
    # ... other fields

# backend/models/appointment.py
class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), default='scheduled')  # 'scheduled', 'completed', 'cancelled', 'no_show'
    # ... other fields
```

---

## Chart.js Configuration

### Chart Dependencies

The charts use Chart.js library which is included via CDN:

```html
<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### Chart Configuration Options

```javascript
// Default chart configuration options
const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 10,
                font: {
                    size: 12
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#ffffff',
            borderWidth: 1
        }
    },
    layout: {
        padding: 10
    }
};

// Color palettes for consistent styling
const chartColors = {
    primary: ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6'],
    status: {
        completed: '#27ae60',    // Green
        scheduled: '#3498db',    // Blue
        cancelled: '#e74c3c',    // Red
        no_show: '#f39c12'       // Orange
    }
};
```

---

## Mobile Responsiveness

### CSS Styles

```css
/* frontend/assets/css/components/admin.css */
.analytics-card {
    background: #ffffff;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 1rem;
}

.chart-container {
    position: relative;
    height: 300px;
    margin-top: 1rem;
}

.chart-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .analytics-card {
        padding: 1rem;
    }
    
    .chart-container {
        height: 250px;
    }
    
    .analytics-card h6 {
        font-size: 14px;
    }
}

@media (max-width: 576px) {
    .chart-container {
        height: 200px;
    }
    
    .analytics-card {
        padding: 0.75rem;
    }
}
```

### Responsive JavaScript Handling

```javascript
// Handle chart responsiveness
function handleChartResize() {
    if (adminCharts && adminCharts.specialtyChart) {
        adminCharts.specialtyChart.resize();
    }
    
    if (adminCharts && adminCharts.appointmentChart) {
        adminCharts.appointmentChart.resize();
    }
}

// Listen for window resize events
window.addEventListener('resize', handleChartResize);

// Handle orientation change for mobile devices
window.addEventListener('orientationchange', () => {
    setTimeout(handleChartResize, 100);
});
```

---

## Usage and Integration

### Initialization

The charts are automatically initialized when the admin dashboard page loads:

```javascript
// In admin.html
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('specialtyDistributionChart')) {
        adminCharts = new AdminDashboardCharts();
    }
});
```

### Data Refresh

Charts can be refreshed programmatically:

```javascript
// Refresh charts when needed
if (adminCharts) {
    adminCharts.refreshCharts();
}
```

### Error Handling

Both charts include comprehensive error handling:

1. **Network Errors**: If API calls fail, error messages are displayed
2. **Missing Data**: Charts handle empty datasets gracefully
3. **Chart Rendering Errors**: Fallback error states are shown
4. **Retry Mechanism**: Users can retry loading failed charts