// --- 0. QUICK THEME CHECK BEFORE LOADING THE REST OF THE PAGE ---
if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light-mode');
}

document.addEventListener('DOMContentLoaded', () => {

    // --- SECURITY FUNCTION (XSS PROTECTION) ---
    function escapeHTML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- TOAST NOTIFICATIONS ---
    window.showToast = function (message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-exclamation-triangle';
        if (type === 'warning') iconClass = 'fa-exclamation-circle';

        toast.innerHTML = `<i class="fas ${iconClass} toast-icon"></i><span class="toast-message">${escapeHTML(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    };

    // --- PUSH NOTIFICATIONS ---
    const PUBLIC_VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE';
    const WORKER_API_URL = 'https://YOUR_WORKER_URL.workers.dev/api/subscribe';

    const notifyBtn = document.getElementById('notify-btn');
    const notifyIcon = document.getElementById('notify-icon');
    const notifyText = document.getElementById('notify-text');

    async function checkSubscriptionStatus() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            if (notifyBtn) notifyBtn.style.background = 'rgba(56, 239, 125, 0.2)';
            if (notifyIcon) notifyIcon.style.color = '#38ef7d';
            if (notifyText) notifyText.innerText = 'Subscribed';
            if (notifyBtn) notifyBtn.dataset.subscribed = 'true';
        }
    }

    if (notifyBtn) {
        checkSubscriptionStatus();

        notifyBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                window.showToast('Your browser does not support Push notifications.', 'error');
                return;
            }

            try {
                const registration = await navigator.serviceWorker.ready;
                const existingSubscription = await registration.pushManager.getSubscription();

                if (existingSubscription) {
                    window.showToast('Unsubscribing...', 'info');

                    await existingSubscription.unsubscribe();

                    await fetch('https://YOUR_WORKER_URL.workers.dev/api/unsubscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: existingSubscription.endpoint })
                    });

                    if (notifyText) notifyText.innerText = "Notifications";
                    if (notifyIcon) notifyIcon.className = "fas fa-bell-slash";
                    if (notifyBtn) {
                        notifyBtn.style.background = '';
                        notifyBtn.dataset.subscribed = 'false';
                    }
                    window.showToast("Unsubscribed from notifications.", "info");

                } else {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                        window.showToast('Notification access was denied.', 'warning');
                        return;
                    }

                    window.showToast('Setting up subscription...', 'info');

                    function urlBase64ToUint8Array(base64String) {
                        const padding = '='.repeat((4 - base64String.length % 4) % 4);
                        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                        const rawData = window.atob(base64);
                        const outputArray = new Uint8Array(rawData.length);
                        for (let i = 0; i < rawData.length; ++i) {
                            outputArray[i] = rawData.charCodeAt(i);
                        }
                        return outputArray;
                    }

                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
                    });

                    const response = await fetch(WORKER_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subscription)
                    });

                    if (!response.ok) throw new Error('Failed to save subscription on the server.');

                    if (notifyText) notifyText.innerText = 'Subscribed';
                    if (notifyIcon) notifyIcon.className = "fas fa-bell";
                    if (notifyBtn) {
                        notifyBtn.style.background = 'rgba(56, 239, 125, 0.2)';
                        notifyBtn.dataset.subscribed = 'true';
                    }
                    window.showToast('Done! You will now receive notifications.', 'success');
                }

            } catch (err) {
                console.error(err);
                if (err.message && err.message.includes('API')) {
                    window.showToast('Server error. Check your Cloudflare Worker deployment.', 'error');
                } else {
                    window.showToast('An error occurred during notification setup.', 'error');
                }
            }
        });
    }

    // --- 1. DYNAMIC ACTIVE CLASS FOR MENU ---
    function setActiveLink() {
        const links = document.querySelectorAll('.nav-link');
        const currentPath = window.location.pathname.split('/').pop() || 'index';

        links.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (currentPath.includes(href) || (currentPath === '' && href === 'index')) {
                link.classList.add('active');
            }
        });
    }
    setActiveLink();

    // --- 2. INDICATOR ANIMATION ---
    function updateIndicator() {
        const indicator = document.querySelector('.nav-indicator');
        const activeLink = document.querySelector('.nav-link.active');
        if (activeLink && indicator) {
            indicator.style.width = `${activeLink.offsetWidth}px`;
            indicator.style.height = `${activeLink.offsetHeight}px`;
            indicator.style.left = `${activeLink.offsetLeft}px`;
            indicator.style.top = `${activeLink.offsetTop}px`;
            indicator.style.opacity = '1';
        }
    }
    updateIndicator();
    window.addEventListener('resize', updateIndicator);

    // --- 3. THEME TOGGLE (BUTTON) ---
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        const root = document.documentElement;

        if (root.classList.contains('light-mode')) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }

        toggleBtn.addEventListener('click', () => {
            root.classList.toggle('light-mode');
            if (root.classList.contains('light-mode')) {
                localStorage.setItem('theme', 'light');
                icon.classList.replace('fa-sun', 'fa-moon');
            } else {
                localStorage.setItem('theme', 'dark');
                icon.classList.replace('fa-moon', 'fa-sun');
            }
        });
    }

    // --- UNIVERSAL CSV PARSER ---
    const parseCSV = (str) => {
        const arr = [];
        let quote = false;
        for (let row = 0, col = 0, c = 0; c < str.length; c++) {
            let cc = str[c], nc = str[c + 1];
            arr[row] = arr[row] || [];
            arr[row][col] = arr[row][col] || '';
            if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
            if (cc == '"') { quote = !quote; continue; }
            if (cc == ',' && !quote) { ++col; continue; }
            if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
            if (cc == '\n' && !quote) { ++row; col = 0; continue; }
            arr[row][col] += cc;
        }
        return arr.map(r => r.map(c => c.trim()));
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- 4. LOAD CLASS DUTIES FROM GOOGLE SHEETS (TIMELINE) ---
    async function loadServiceData() {
        const csvUrl = 'YOUR_GOOGLE_SHEETS_CSV_URL_FOR_CLASS_DUTIES';
        const container = document.getElementById('service-timeline');
        if (!container) return;

        try {
            const response = await fetch(csvUrl);
            const text = await response.text();
            const rows = parseCSV(text);
            container.innerHTML = '';

            let currentIndex = -1;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                let dateColIndex = row.findIndex(c => c.includes('.') && c.includes('-'));
                if (dateColIndex === -1) continue;

                let dateStr = row[dateColIndex];
                let endPart = dateStr.split('-')[1];
                if (!endPart) continue;

                let dateParts = endPart.trim().split('.');
                if (dateParts.length < 2) continue;

                let d = parseInt(dateParts[0].trim());
                let m = parseInt(dateParts[1].trim()) - 1;
                let y = dateParts[2] ? parseInt(dateParts[2].trim()) : new Date().getFullYear();

                let friday = new Date(y, m, d);
                let monday = new Date(friday);
                monday.setDate(friday.getDate() - 4);
                let sunday = new Date(friday);
                sunday.setDate(friday.getDate() + 2);

                if (today >= monday && today <= sunday) {
                    currentIndex = i;
                    break;
                }
                if (currentIndex === -1 && today < monday) {
                    currentIndex = i;
                    break;
                }
            }

            if (currentIndex !== -1) {
                renderServiceTimeline(rows[currentIndex], true, "This Week", container);

                let count = 1;
                let nextIndex = currentIndex + 1;

                while (count < 3 && nextIndex < rows.length) {
                    if (rows[nextIndex].findIndex(c => c.includes('-')) !== -1) {
                        let label = count === 1 ? "Next Week" : "Coming Up";
                        renderServiceTimeline(rows[nextIndex], false, label, container);
                        count++;
                    }
                    nextIndex++;
                }
            } else {
                container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">No assigned duties right now.</div>';
            }

        } catch (error) {
            container.innerHTML = '<div class="error-msg"><i class="fas fa-exclamation-triangle"></i><span>Failed to load duties.</span></div>';
            window.showToast('Error loading class duties.', 'error');
        }
    }

    function renderServiceTimeline(row, isCurrent, label, container) {
        const item = document.createElement('div');
        item.className = `timeline-item ${isCurrent ? 'current-test' : ''}`;

        let dateStr = row.find(c => c.includes('.') && c.includes('-')) || row[0];
        let names = row[row.length - 1];

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-date">${escapeHTML(label)} &bull; ${escapeHTML(dateStr)}</div>
                <div class="timeline-title" style="color: var(--text-primary); font-weight: bold;">${escapeHTML(names)}</div>
            </div>
        `;
        container.appendChild(item);
    }

    // --- 5. LOAD UPCOMING TESTS FROM GOOGLE SHEETS (TIMELINE) ---
    async function loadTestsData() {
        const csvUrl = 'YOUR_GOOGLE_SHEETS_CSV_URL_FOR_UPCOMING_TESTS';
        const container = document.getElementById('tests-timeline');
        if (!container) return;

        try {
            const response = await fetch(csvUrl);
            const text = await response.text();
            const rows = parseCSV(text);
            container.innerHTML = '';

            const upcomingTests = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 2) continue;

                let dateStr = row[0];
                let dateParts = dateStr.split('.');
                if (dateParts.length < 2) continue;

                let d = parseInt(dateParts[0].trim());
                let m = parseInt(dateParts[1].trim()) - 1;
                let y = dateParts[2] && dateParts[2].trim() !== "" ? parseInt(dateParts[2].trim()) : new Date().getFullYear();

                let testDate = new Date(y, m, d);

                if (testDate >= today) {
                    let formattedDateStr = `${d}. ${m + 1}. ${y}`;
                    upcomingTests.push({ dateStr: formattedDateStr, name: row[1], dateObj: testDate });
                }
            }

            upcomingTests.sort((a, b) => a.dateObj - b.dateObj);
            const nextTests = upcomingTests.slice(0, 3);

            if (nextTests.length > 0) {
                nextTests.forEach((test, index) => {
                    const isCurrent = index === 0;
                    const item = document.createElement('div');
                    item.className = `timeline-item ${isCurrent ? 'current-test' : ''}`;

                    let label = isCurrent ? "Next Test" : "Upcoming";

                    item.innerHTML = `
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">${escapeHTML(label)} &bull; ${escapeHTML(test.dateStr)}</div>
                            <div class="timeline-title">${escapeHTML(test.name)}</div>
                        </div>
                    `;
                    container.appendChild(item);
                });
            } else {
                container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">No upcoming tests planned. Hooray!</div>';
            }

        } catch (error) {
            container.innerHTML = '<div class="error-msg"><i class="fas fa-exclamation-triangle"></i><span>Failed to load tests.</span></div>';
            window.showToast('Error loading tests.', 'error');
        }
    }

    // --- 6. MOBILE LINKS MENU CONTROL ---
    const actionsToggleBtn = document.getElementById('actions-toggle-btn');
    const actionBoxesContainer = document.getElementById('action-boxes');

    if (actionsToggleBtn && actionBoxesContainer) {
        actionsToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            actionBoxesContainer.classList.toggle('show');
            const icon = actionsToggleBtn.querySelector('i');

            if (actionBoxesContainer.classList.contains('show')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        document.addEventListener('click', (e) => {
            if (!actionsToggleBtn.contains(e.target) && !actionBoxesContainer.contains(e.target)) {
                actionBoxesContainer.classList.remove('show');
                const icon = actionsToggleBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    loadServiceData();
    loadTestsData();
});
