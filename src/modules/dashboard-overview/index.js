export default function render() {
  return `
    <div class="dashboard-overview">
      <!-- Quick Stats Grid -->
      <section class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">$127.5K</div>
            <div class="stat-label">Revenue (MTD)</div>
            <div class="stat-change positive">
              <span class="trend-arrow">↗</span>
              <span>+18.2%</span>
            </div>
          </div>
          <div class="stat-sparkline">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline points="0,25 20,20 40,22 60,15 80,10 100,8" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
        </div>

        <div class="stat-card stat-success">
          <div class="stat-icon">✓</div>
          <div class="stat-content">
            <div class="stat-value">47</div>
            <div class="stat-label">Completed Jobs</div>
            <div class="stat-change positive">
              <span class="trend-arrow">↗</span>
              <span>+12.5%</span>
            </div>
          </div>
          <div class="stat-sparkline">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline points="0,20 20,18 40,15 60,12 80,10 100,5" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
        </div>

        <div class="stat-card stat-warning">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">23</div>
            <div class="stat-label">Active Work Orders</div>
            <div class="stat-change neutral">
              <span class="trend-arrow">→</span>
              <span>+2.1%</span>
            </div>
          </div>
          <div class="stat-sparkline">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline points="0,15 20,16 40,14 60,15 80,13 100,14" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
        </div>

        <div class="stat-card stat-info">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-value">156</div>
            <div class="stat-label">Active Customers</div>
            <div class="stat-change positive">
              <span class="trend-arrow">↗</span>
              <span>+8.3%</span>
            </div>
          </div>
          <div class="stat-sparkline">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline points="0,22 20,20 40,18 60,16 80,12 100,10" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
        </div>
      </section>

      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Revenue Chart -->
        <div class="dashboard-card chart-card">
          <div class="card-header">
            <div>
              <h3>Revenue Overview</h3>
              <p class="card-subtitle">Last 6 months performance</p>
            </div>
            <div class="card-actions">
              <button class="icon-btn">📅</button>
              <button class="icon-btn">⋯</button>
            </div>
          </div>
          <div class="chart-container">
            <div class="bar-chart">
              <div class="bar-group">
                <div class="bar" style="height: 65%;" data-value="$18.2K"></div>
                <span class="bar-label">Jan</span>
              </div>
              <div class="bar-group">
                <div class="bar" style="height: 72%;" data-value="$21.5K"></div>
                <span class="bar-label">Feb</span>
              </div>
              <div class="bar-group">
                <div class="bar" style="height: 58%;" data-value="$16.8K"></div>
                <span class="bar-label">Mar</span>
              </div>
              <div class="bar-group">
                <div class="bar" style="height: 85%;" data-value="$24.3K"></div>
                <span class="bar-label">Apr</span>
              </div>
              <div class="bar-group">
                <div class="bar" style="height: 78%;" data-value="$22.1K"></div>
                <span class="bar-label">May</span>
              </div>
              <div class="bar-group active">
                <div class="bar" style="height: 92%;" data-value="$27.5K"></div>
                <span class="bar-label">Jun</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="dashboard-card activity-card">
          <div class="card-header">
            <div>
              <h3>Recent Activity</h3>
              <p class="card-subtitle">Latest updates</p>
            </div>
            <button class="text-btn">View All →</button>
          </div>
          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon success">✓</div>
              <div class="activity-content">
                <div class="activity-title">Work Order #1247 completed</div>
                <div class="activity-meta">HVAC Repair • 2 hours ago</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon primary">💰</div>
              <div class="activity-content">
                <div class="activity-title">Invoice #INV-2024-089 paid</div>
                <div class="activity-meta">$3,450.00 • 4 hours ago</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon warning">📋</div>
              <div class="activity-content">
                <div class="activity-title">New estimate request received</div>
                <div class="activity-meta">Plumbing Service • 6 hours ago</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon info">👤</div>
              <div class="activity-content">
                <div class="activity-title">New customer registered</div>
                <div class="activity-meta">Sarah Johnson • 8 hours ago</div>
              </div>
            </div>
            <div class="activity-item">
              <div class="activity-icon success">✓</div>
              <div class="activity-content">
                <div class="activity-title">Inspection #INS-445 approved</div>
                <div class="activity-meta">Electrical Safety • Yesterday</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Work Orders Status -->
        <div class="dashboard-card status-card">
          <div class="card-header">
            <div>
              <h3>Work Orders Status</h3>
              <p class="card-subtitle">Current pipeline</p>
            </div>
          </div>
          <div class="status-grid">
            <div class="status-item">
              <div class="status-ring" style="--progress: 75; --color: var(--primary);">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" />
                  <circle cx="50" cy="50" r="45" />
                </svg>
                <div class="status-value">18</div>
              </div>
              <div class="status-label">In Progress</div>
            </div>
            <div class="status-item">
              <div class="status-ring" style="--progress: 45; --color: var(--accent);">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" />
                  <circle cx="50" cy="50" r="45" />
                </svg>
                <div class="status-value">11</div>
              </div>
              <div class="status-label">Scheduled</div>
            </div>
            <div class="status-item">
              <div class="status-ring" style="--progress: 90; --color: var(--success);">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" />
                  <circle cx="50" cy="50" r="45" />
                </svg>
                <div class="status-value">47</div>
              </div>
              <div class="status-label">Completed</div>
            </div>
            <div class="status-item">
              <div class="status-ring" style="--progress: 20; --color: var(--danger);">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" />
                  <circle cx="50" cy="50" r="45" />
                </svg>
                <div class="status-value">5</div>
              </div>
              <div class="status-label">Overdue</div>
            </div>
          </div>
        </div>

        <!-- Top Services -->
        <div class="dashboard-card services-card">
          <div class="card-header">
            <div>
              <h3>Top Services</h3>
              <p class="card-subtitle">This month</p>
            </div>
          </div>
          <div class="services-list">
            <div class="service-row">
              <div class="service-info">
                <div class="service-icon-small" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">🔧</div>
                <div>
                  <div class="service-name">HVAC Maintenance</div>
                  <div class="service-count">24 jobs</div>
                </div>
              </div>
              <div class="service-revenue">$18,450</div>
              <div class="service-bar">
                <div class="service-bar-fill" style="width: 85%;"></div>
              </div>
            </div>
            <div class="service-row">
              <div class="service-info">
                <div class="service-icon-small" style="background: linear-gradient(135deg, #f59e0b, #d97706);">💧</div>
                <div>
                  <div class="service-name">Plumbing Repair</div>
                  <div class="service-count">18 jobs</div>
                </div>
              </div>
              <div class="service-revenue">$12,300</div>
              <div class="service-bar">
                <div class="service-bar-fill" style="width: 65%;"></div>
              </div>
            </div>
            <div class="service-row">
              <div class="service-info">
                <div class="service-icon-small" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">⚡</div>
                <div>
                  <div class="service-name">Electrical Work</div>
                  <div class="service-count">15 jobs</div>
                </div>
              </div>
              <div class="service-revenue">$9,850</div>
              <div class="service-bar">
                <div class="service-bar-fill" style="width: 52%;"></div>
              </div>
            </div>
            <div class="service-row">
              <div class="service-info">
                <div class="service-icon-small" style="background: linear-gradient(135deg, #10b981, #059669);">🏠</div>
                <div>
                  <div class="service-name">General Maintenance</div>
                  <div class="service-count">12 jobs</div>
                </div>
              </div>
              <div class="service-revenue">$7,200</div>
              <div class="service-bar">
                <div class="service-bar-fill" style="width: 38%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="dashboard-card actions-card">
          <div class="card-header">
            <div>
              <h3>Quick Actions</h3>
              <p class="card-subtitle">Common tasks</p>
            </div>
          </div>
          <div class="actions-grid">
            <button class="action-btn">
              <div class="action-icon">📝</div>
              <div class="action-label">New Work Order</div>
            </button>
            <button class="action-btn">
              <div class="action-icon">💰</div>
              <div class="action-label">Create Invoice</div>
            </button>
            <button class="action-btn">
              <div class="action-icon">📋</div>
              <div class="action-label">New Estimate</div>
            </button>
            <button class="action-btn">
              <div class="action-icon">👤</div>
              <div class="action-label">Add Customer</div>
            </button>
            <button class="action-btn">
              <div class="action-icon">📅</div>
              <div class="action-label">Schedule Job</div>
            </button>
            <button class="action-btn">
              <div class="action-icon">📊</div>
              <div class="action-label">View Reports</div>
            </button>
          </div>
        </div>

        <!-- Upcoming Schedule -->
        <div class="dashboard-card schedule-card">
          <div class="card-header">
            <div>
              <h3>Upcoming Schedule</h3>
              <p class="card-subtitle">Next 7 days</p>
            </div>
            <button class="text-btn">View Calendar →</button>
          </div>
          <div class="schedule-list">
            <div class="schedule-item">
              <div class="schedule-date">
                <div class="schedule-day">MON</div>
                <div class="schedule-num">10</div>
              </div>
              <div class="schedule-content">
                <div class="schedule-title">HVAC Installation - Downtown Office</div>
                <div class="schedule-meta">9:00 AM - 2:00 PM • Team A</div>
              </div>
              <div class="schedule-badge priority-high">High</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-date">
                <div class="schedule-day">TUE</div>
                <div class="schedule-num">11</div>
              </div>
              <div class="schedule-content">
                <div class="schedule-title">Plumbing Inspection - Residential</div>
                <div class="schedule-meta">10:30 AM - 12:00 PM • Team B</div>
              </div>
              <div class="schedule-badge priority-medium">Medium</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-date">
                <div class="schedule-day">WED</div>
                <div class="schedule-num">12</div>
              </div>
              <div class="schedule-content">
                <div class="schedule-title">Electrical Repair - Shopping Mall</div>
                <div class="schedule-meta">1:00 PM - 4:00 PM • Team C</div>
              </div>
              <div class="schedule-badge priority-high">High</div>
            </div>
            <div class="schedule-item">
              <div class="schedule-date">
                <div class="schedule-day">THU</div>
                <div class="schedule-num">13</div>
              </div>
              <div class="schedule-content">
                <div class="schedule-title">Maintenance Check - Industrial Site</div>
                <div class="schedule-meta">8:00 AM - 11:00 AM • Team A</div>
              </div>
              <div class="schedule-badge priority-low">Low</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .dashboard-overview {
        padding: 0;
      }

      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
        margin-bottom: 1.5rem;
      }

      .stat-card {
        background: var(--color-surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 1.5rem;
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      }

      .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
      }

      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        opacity: 0;
        transition: opacity 0.3s;
      }

      .stat-card:hover::before {
        opacity: 1;
      }

      .stat-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        opacity: 0.9;
      }

      .stat-value {
        font-size: 2.25rem;
        font-weight: 900;
        line-height: 1;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, var(--color-text), color-mix(in srgb, var(--color-text) 70%, var(--primary)));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .stat-label {
        font-size: 0.9rem;
        color: var(--muted);
        font-weight: 600;
        margin-bottom: 0.75rem;
      }

      .stat-change {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 700;
      }

      .stat-change.positive {
        background: color-mix(in srgb, var(--success) 15%, transparent);
        color: var(--success);
      }

      .stat-change.neutral {
        background: color-mix(in srgb, var(--muted) 15%, transparent);
        color: var(--muted);
      }

      .trend-arrow {
        font-size: 1.1rem;
      }

      .stat-sparkline {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 45%;
        height: 60px;
        opacity: 0.15;
      }

      .stat-sparkline svg {
        width: 100%;
        height: 100%;
      }

      /* Dashboard Grid */
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 1.25rem;
      }

      .dashboard-card {
        background: var(--color-surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 1.5rem;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .dashboard-card:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
      }

      .card-header h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.15rem;
        font-weight: 800;
      }

      .card-subtitle {
        margin: 0;
        font-size: 0.85rem;
        color: var(--muted);
      }

      .card-actions {
        display: flex;
        gap: 0.5rem;
      }

      .icon-btn {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--color-background);
        border: 1px solid var(--border);
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
      }

      .icon-btn:hover {
        background: var(--primary);
        border-color: var(--primary);
        transform: scale(1.05);
      }

      .text-btn {
        background: none;
        border: none;
        color: var(--primary);
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        padding: 0;
        transition: all 0.2s;
      }

      .text-btn:hover {
        opacity: 0.7;
      }

      /* Chart Card */
      .chart-card {
        grid-column: span 8;
      }

      .chart-container {
        height: 280px;
      }

      .bar-chart {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 100%;
        gap: 1rem;
        padding: 1rem 0;
      }

      .bar-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        position: relative;
      }

      .bar {
        width: 100%;
        max-width: 60px;
        background: linear-gradient(180deg, var(--primary), color-mix(in srgb, var(--primary) 70%, var(--accent)));
        border-radius: 12px 12px 4px 4px;
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 25%, transparent);
      }

      .bar:hover {
        transform: scaleY(1.05);
        box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 40%, transparent);
      }

      .bar::before {
        content: attr(data-value);
        position: absolute;
        top: -2rem;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--color-text);
        opacity: 0;
        transition: opacity 0.3s;
      }

      .bar:hover::before {
        opacity: 1;
      }

      .bar-group.active .bar {
        background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--primary)));
        box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 35%, transparent);
      }

      .bar-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--muted);
      }

      /* Activity Card */
      .activity-card {
        grid-column: span 4;
      }

      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .activity-item {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        padding: 0.75rem;
        border-radius: 12px;
        transition: background 0.2s;
      }

      .activity-item:hover {
        background: var(--color-background);
      }

      .activity-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      .activity-icon.success {
        background: color-mix(in srgb, var(--success) 15%, transparent);
        color: var(--success);
      }

      .activity-icon.primary {
        background: color-mix(in srgb, var(--primary) 15%, transparent);
        color: var(--primary);
      }

      .activity-icon.warning {
        background: color-mix(in srgb, var(--accent) 15%, transparent);
        color: var(--accent);
      }

      .activity-icon.info {
        background: color-mix(in srgb, var(--muted) 15%, transparent);
        color: var(--muted);
      }

      .activity-content {
        flex: 1;
      }

      .activity-title {
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 0.25rem;
      }

      .activity-meta {
        font-size: 0.8rem;
        color: var(--muted);
      }

      /* Status Card */
      .status-card {
        grid-column: span 6;
      }

      .status-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.5rem;
      }

      .status-item {
        text-align: center;
      }

      .status-ring {
        width: 100px;
        height: 100px;
        margin: 0 auto 1rem;
        position: relative;
      }

      .status-ring svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .status-ring circle {
        fill: none;
        stroke-width: 8;
      }

      .status-ring circle:first-child {
        stroke: var(--color-background);
      }

      .status-ring circle:last-child {
        stroke: var(--color);
        stroke-dasharray: 283;
        stroke-dashoffset: calc(283 - (283 * var(--progress)) / 100);
        stroke-linecap: round;
        transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .status-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.75rem;
        font-weight: 900;
      }

      .status-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--muted);
      }

      /* Services Card */
      .services-card {
        grid-column: span 6;
      }

      .services-list {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .service-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 1rem;
        align-items: center;
      }

      .service-info {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .service-icon-small {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .service-name {
        font-weight: 700;
        font-size: 0.95rem;
      }

      .service-count {
        font-size: 0.8rem;
        color: var(--muted);
      }

      .service-revenue {
        font-weight: 800;
        font-size: 1.1rem;
        color: var(--primary);
      }

      .service-bar {
        grid-column: 1 / -1;
        height: 6px;
        background: var(--color-background);
        border-radius: 999px;
        overflow: hidden;
      }

      .service-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        border-radius: 999px;
        transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Actions Card */
      .actions-card {
        grid-column: span 4;
      }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .action-btn {
        background: var(--color-background);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 1.25rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--color-text);
      }

      .action-btn:hover {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
        transform: translateY(-4px);
        box-shadow: 0 8px 24px color-mix(in srgb, var(--primary) 30%, transparent);
      }

      .action-icon {
        font-size: 2rem;
      }

      .action-label {
        font-size: 0.85rem;
        font-weight: 700;
        text-align: center;
      }

      /* Schedule Card */
      .schedule-card {
        grid-column: span 8;
      }

      .schedule-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .schedule-item {
        display: flex;
        gap: 1.25rem;
        align-items: center;
        padding: 1rem;
        border-radius: 14px;
        border: 1px solid var(--border);
        transition: all 0.2s;
      }

      .schedule-item:hover {
        background: var(--color-background);
        border-color: var(--primary);
      }

      .schedule-date {
        text-align: center;
        padding: 0.75rem;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        border-radius: 12px;
        color: white;
        min-width: 60px;
      }

      .schedule-day {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.05em;
      }

      .schedule-num {
        font-size: 1.5rem;
        font-weight: 900;
        line-height: 1;
      }

      .schedule-content {
        flex: 1;
      }

      .schedule-title {
        font-weight: 700;
        margin-bottom: 0.25rem;
      }

      .schedule-meta {
        font-size: 0.85rem;
        color: var(--muted);
      }

      .schedule-badge {
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .schedule-badge.priority-high {
        background: color-mix(in srgb, var(--danger) 15%, transparent);
        color: var(--danger);
      }

      .schedule-badge.priority-medium {
        background: color-mix(in srgb, var(--accent) 15%, transparent);
        color: var(--accent);
      }

      .schedule-badge.priority-low {
        background: color-mix(in srgb, var(--muted) 15%, transparent);
        color: var(--muted);
      }

      /* Responsive Design */
      @media (max-width: 1400px) {
        .chart-card {
          grid-column: span 12;
        }
        .activity-card {
          grid-column: span 12;
        }
        .status-card {
          grid-column: span 12;
        }
        .services-card {
          grid-column: span 12;
        }
        .actions-card {
          grid-column: span 12;
        }
        .schedule-card {
          grid-column: span 12;
        }
      }

      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }
        .status-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .actions-grid {
          grid-template-columns: 1fr;
        }
        .bar-chart {
          gap: 0.5rem;
        }
      }
    </style>
  `;
}

// Made with Bob
