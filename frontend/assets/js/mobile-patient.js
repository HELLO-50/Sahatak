/**
 * Mobile Optimization JavaScript for Patient Interfaces
 * Handles touch gestures, mobile navigation, and app-like features
 */

class MobilePatientOptimizer {
    constructor() {
        this.isMobile = this.detectMobile();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouch = false;
        
        if (this.isMobile) {
            this.init();
        }
    }
    
    detectMobile() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;
    }
    
    init() {
        console.log('🔷 Mobile patient optimizer initialized');
        this.setupTouchGestures();
        this.setupMobileNavigation();
        this.setupPullToRefresh();
        this.setupMobileToasts();
        this.setupFormOptimizations();
        this.addSkipLinks();
        this.setupVirtualKeyboardHandling();
    }
    
    // Touch Gesture Support
    setupTouchGestures() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }
    
    handleTouchStart(e) {
        this.isTouch = true;
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }
    
    handleTouchMove(e) {
        if (!this.isTouch) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        // Prevent scrolling for horizontal swipes
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            e.preventDefault();
        }
    }
    
    handleTouchEnd(e) {
        if (!this.isTouch) return;
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const threshold = 80;
        
        // Swipe right to open sidebar (from left edge)
        if (deltaX > threshold && Math.abs(deltaY) < 100 && this.touchStartX < 30) {
            this.openMobileSidebar();
        }
        
        // Swipe left to close sidebar
        if (deltaX < -threshold && Math.abs(deltaY) < 100) {
            this.closeMobileSidebar();
        }
        
        // Swipe down to close modals
        if (deltaY > threshold && Math.abs(deltaX) < 100) {
            this.closeTopModal();
        }
        
        this.isTouch = false;
    }
    
    // Mobile Navigation
    setupMobileNavigation() {
        // Create mobile menu toggle if it doesn't exist
        this.createMobileMenuToggle();
        
        // Handle sidebar toggling
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const backdrop = document.querySelector('.backdrop');
        
        if (toggleButton) {
            toggleButton.addEventListener('click', this.toggleMobileSidebar.bind(this));
        }
        
        if (backdrop) {
            backdrop.addEventListener('click', this.closeMobileSidebar.bind(this));
        }
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
                this.closeMobileSidebar();
            }
        });
        
        // Close menu when window resizes to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 992) {
                this.closeMobileSidebar();
            }
        });
    }
    
    createMobileMenuToggle() {
        const existingToggle = document.querySelector('.mobile-menu-toggle');
        if (existingToggle) return;
        
        const toggle = document.createElement('button');
        toggle.className = 'mobile-menu-toggle';
        toggle.innerHTML = '<i class="bi bi-list"></i>';
        toggle.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 101;
            background: var(--medical-blue);
            color: white;
            border: none;
            border-radius: 12px;
            width: 48px;
            height: 48px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        `;
        
        // Show on mobile
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleMediaQuery = (e) => {
            toggle.style.display = e.matches ? 'flex' : 'none';
        };
        handleMediaQuery(mediaQuery);
        mediaQuery.addEventListener('change', handleMediaQuery);
        
        document.body.appendChild(toggle);
    }
    
    toggleMobileSidebar() {
        document.body.classList.toggle('sidebar-open');
        this.updateAriaAttributes();
    }
    
    openMobileSidebar() {
        document.body.classList.add('sidebar-open');
        this.updateAriaAttributes();
        
        // Add haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    
    closeMobileSidebar() {
        document.body.classList.remove('sidebar-open');
        this.updateAriaAttributes();
    }
    
    updateAriaAttributes() {
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const isOpen = document.body.classList.contains('sidebar-open');
        
        if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', isOpen);
            toggleButton.setAttribute('aria-label', isOpen ? 'أغلق القائمة' : 'افتح القائمة');
        }
        
        if (sidebar) {
            sidebar.setAttribute('aria-hidden', !isOpen);
        }
    }
    
    // Pull to Refresh
    setupPullToRefresh() {
        const refreshablePages = [
            '/dashboard/',
            '/appointments/',
            '/medical/patient/'
        ];
        
        if (!refreshablePages.some(page => window.location.pathname.includes(page))) {
            return;
        }
        
        this.createPullToRefreshIndicator();
        this.enablePullToRefresh();
    }
    
    createPullToRefreshIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'pull-to-refresh-indicator';
        indicator.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
        indicator.style.cssText = `
            position: fixed;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 40px;
            background: var(--medical-blue);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        document.body.appendChild(indicator);
    }
    
    enablePullToRefresh() {
        let startY = 0;
        let pullDistance = 0;
        let isPulling = false;
        const threshold = 80;
        const resistance = 2.5;
        
        const container = document.documentElement;
        
        container.addEventListener('touchstart', (e) => {
            if (container.scrollTop === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });
        
        container.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            const currentY = e.touches[0].clientY;
            pullDistance = Math.max(0, (currentY - startY) / resistance);
            
            if (pullDistance > 0) {
                this.updatePullIndicator(pullDistance, threshold);
                if (pullDistance > 20) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
        
        container.addEventListener('touchend', () => {
            if (isPulling && pullDistance > threshold) {
                this.triggerRefresh();
            }
            
            this.resetPullIndicator();
            isPulling = false;
            pullDistance = 0;
        }, { passive: true });
    }
    
    updatePullIndicator(distance, threshold) {
        const indicator = document.querySelector('.pull-to-refresh-indicator');
        if (!indicator) return;
        
        const progress = Math.min(distance / threshold, 1);
        const rotation = progress * 180;
        
        indicator.style.top = `${Math.min(distance, threshold) - 60}px`;
        indicator.style.opacity = progress;
        indicator.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    }
    
    triggerRefresh() {
        const indicator = document.querySelector('.pull-to-refresh-indicator');
        if (indicator) {
            indicator.classList.add('refreshing');
            indicator.style.animation = 'spin 1s linear infinite';
        }
        
        // Add haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 50, 50]);
        }
        
        // Trigger page refresh or data reload
        this.refreshPageData().finally(() => {
            setTimeout(() => {
                this.resetPullIndicator();
                if (indicator) {
                    indicator.classList.remove('refreshing');
                    indicator.style.animation = '';
                }
            }, 1000);
        });
    }
    
    async refreshPageData() {
        // Simulate data refresh - implement actual refresh logic here
        try {
            if (typeof window.loadDashboardData === 'function') {
                await window.loadDashboardData();
            } else if (typeof window.loadAppointments === 'function') {
                await window.loadAppointments();
            } else {
                // Fallback: reload page
                await new Promise(resolve => setTimeout(resolve, 1500));
                window.location.reload();
            }
            
            this.showMobileToast('تم تحديث البيانات', 'success');
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showMobileToast('فشل في تحديث البيانات', 'error');
        }
    }
    
    resetPullIndicator() {
        const indicator = document.querySelector('.pull-to-refresh-indicator');
        if (indicator) {
            indicator.style.top = '-60px';
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateX(-50%) rotate(0deg)';
        }
    }
    
    // Mobile Toast Notifications
    setupMobileToasts() {
        // Create toast container
        if (!document.querySelector('.mobile-toast-container')) {
            const container = document.createElement('div');
            container.className = 'mobile-toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                z-index: 2000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }
    
    showMobileToast(message, type = 'info', duration = 3000) {
        const container = document.querySelector('.mobile-toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `mobile-toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            padding: 1rem 1.25rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 1rem;
            transform: translateY(100px);
            transition: transform 0.3s ease;
            pointer-events: auto;
        `;
        
        // Set colors based on type
        const colors = {
            success: { bg: '#10b981', text: 'white' },
            error: { bg: '#ef4444', text: 'white' },
            info: { bg: '#2563eb', text: 'white' },
            warning: { bg: '#f59e0b', text: 'white' }
        };
        
        const color = colors[type] || colors.info;
        toast.style.background = color.bg;
        toast.style.color = color.text;
        
        container.appendChild(toast);
        
        // Show toast
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
        });
        
        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        // Add haptic feedback
        if ('vibrate' in navigator) {
            const pattern = type === 'error' ? [100, 50, 100] : [50];
            navigator.vibrate(pattern);
        }
    }
    
    // Form Optimizations
    setupFormOptimizations() {
        // Prevent zoom on input focus for iOS
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (parseInt(getComputedStyle(input).fontSize) < 16) {
                input.style.fontSize = '16px';
            }
        });
        
        // Auto-scroll to focused input
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }, 300); // Wait for virtual keyboard
            });
        });
        
        // Enhanced form validation with mobile-friendly messages
        this.setupMobileValidation();
    }
    
    setupMobileValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    this.validateMobileField(input);
                });
                
                input.addEventListener('focus', () => {
                    this.clearMobileFieldError(input);
                });
            });
        });
    }
    
    validateMobileField(field) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        
        this.clearMobileFieldError(field);
        
        if (isRequired && !value) {
            this.showMobileFieldError(field, 'هذا الحقل مطلوب');
            return false;
        }
        
        // Type-specific validation
        switch (field.type) {
            case 'email':
                if (value && !this.isValidEmail(value)) {
                    this.showMobileFieldError(field, 'يرجى إدخال بريد إلكتروني صحيح');
                    return false;
                }
                break;
            case 'tel':
                if (value && !this.isValidPhone(value)) {
                    this.showMobileFieldError(field, 'يرجى إدخال رقم هاتف صحيح');
                    return false;
                }
                break;
        }
        
        return true;
    }
    
    showMobileFieldError(field, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mobile-error-message';
        errorDiv.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${message}`;
        
        field.parentNode.appendChild(errorDiv);
        field.classList.add('is-invalid');
        
        // Add haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
    }
    
    clearMobileFieldError(field) {
        const error = field.parentNode.querySelector('.mobile-error-message');
        if (error) {
            error.remove();
        }
        field.classList.remove('is-invalid');
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    isValidPhone(phone) {
        return /^[\+]?[0-9\s\-\(\)]{10,}$/.test(phone);
    }
    
    // Virtual Keyboard Handling
    setupVirtualKeyboardHandling() {
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // Detect virtual keyboard
            if (heightDifference > 150) {
                document.body.classList.add('virtual-keyboard-open');
                this.adjustForVirtualKeyboard(true);
            } else {
                document.body.classList.remove('virtual-keyboard-open');
                this.adjustForVirtualKeyboard(false);
            }
        });
    }
    
    adjustForVirtualKeyboard(isOpen) {
        const bottomActions = document.querySelector('.bottom-actions');
        if (bottomActions) {
            bottomActions.style.display = isOpen ? 'none' : 'block';
        }
        
        const fixedElements = document.querySelectorAll('.topbar, .mobile-menu-toggle');
        fixedElements.forEach(element => {
            element.style.opacity = isOpen ? '0.7' : '1';
        });
    }
    
    // Close any open modals
    closeTopModal() {
        const openModals = document.querySelectorAll('.modal.show, .mobile-action-sheet.show');
        if (openModals.length > 0) {
            openModals[openModals.length - 1].classList.remove('show');
        }
    }
    
    // Accessibility - Skip Links
    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'تخطى إلى المحتوى الرئيسي';
        skipLink.className = 'skip-link';
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
}

// Performance Monitoring
class MobilePerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.setupPerformanceTracking();
    }
    
    setupPerformanceTracking() {
        if (!('PerformanceObserver' in window)) return;
        
        // First Contentful Paint
        const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.metrics[entry.name] = entry.startTime;
                
                // Log performance issues
                if (entry.name === 'first-contentful-paint' && entry.startTime > 2500) {
                    console.warn('🐌 Slow First Contentful Paint:', entry.startTime + 'ms');
                }
            }
        });
        
        paintObserver.observe({ entryTypes: ['paint'] });
        
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.metrics['largest-contentful-paint'] = lastEntry.startTime;
            
            if (lastEntry.startTime > 4000) {
                console.warn('🐌 Slow Largest Contentful Paint:', lastEntry.startTime + 'ms');
            }
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    }
    
    getMetrics() {
        return this.metrics;
    }
}

// Network Awareness
class NetworkAwareOptimizations {
    constructor() {
        this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.adaptToConnection();
    }
    
    adaptToConnection() {
        if (!this.connection) return;
        
        const slowConnections = ['slow-2g', '2g', '3g'];
        const isSlowConnection = slowConnections.includes(this.connection.effectiveType);
        
        if (isSlowConnection) {
            this.enableLightMode();
            console.log('📱 Slow connection detected, enabling light mode');
        }
        
        this.connection.addEventListener('change', () => {
            this.adaptToConnection();
        });
    }
    
    enableLightMode() {
        // Disable non-critical animations
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
        
        // Add slow connection class
        document.documentElement.classList.add('slow-connection');
        
        // Show notification
        if (window.mobileOptimizer) {
            window.mobileOptimizer.showMobileToast('اتصال بطيء - تم تفعيل الوضع المبسط', 'info', 5000);
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize mobile optimizations
    window.mobileOptimizer = new MobilePatientOptimizer();
    window.performanceMonitor = new MobilePerformanceMonitor();
    window.networkOptimizer = new NetworkAwareOptimizations();
    
    console.log('🚀 Mobile patient optimizations loaded');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobilePatientOptimizer, MobilePerformanceMonitor, NetworkAwareOptimizations };
}