if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light-mode');
}

document.addEventListener('DOMContentLoaded', () => {
    
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

    const toggleBtn = document.getElementById('theme-toggle');
    if(toggleBtn) {
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

    const parseCSV = (str) => {
        const arr = [];
        let quote = false;
        for (let row = 0, col = 0, c = 0; c < str.length; c++) {
            let cc = str[c], nc = str[c+1];
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
    today.setHours(0,0,0,0);

    async function loadServiceData() {
        const csvUrl = 'YOUR_GOOGLE_SHEETS_SERVICES_CSV_URL';
        const tbody = document.getElementById('service-body');
        if (!tbody) return;

        try {
            const response = await fetch(csvUrl);
            const text = await response.text();
            const rows = parseCSV(text);
            tbody.innerHTML = '';
            
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
                renderServiceRow(rows[currentIndex], true, "This week");
                let nextIndex = currentIndex + 1;
                while (nextIndex < rows.length && rows[nextIndex].findIndex(c => c.includes('-')) === -1) {
                    nextIndex++;
                }
                if (nextIndex < rows.length) {
                    renderServiceRow(rows[nextIndex], false, "Next week");
                }
            } else {
                tbody.innerHTML = '<tr><td colspan="2" class="loading-td">No duty assigned currently.</td></tr>';
            }

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="2" class="loading-td">Error loading data.</td></tr>';
        }
    }

    function renderServiceRow(row, isCurrent, label) {
        const tbody = document.getElementById('service-body');
        const tr = document.createElement('tr');
        if (isCurrent) tr.classList.add('current-week');
        
        let dateStr = row.find(c => c.includes('.') && c.includes('-')) || row[0];
        let names = row[row.length - 1]; 

        tr.innerHTML = `<td><span class="label-tag">${label}</span><br>${dateStr}</td><td>${names}</td>`;
        tbody.appendChild(tr);
    }

    async function loadTestsData() {
        const csvUrl = 'YOUR_GOOGLE_SHEETS_TESTS_CSV_URL'; 
        
        const tbody = document.getElementById('tests-body');
        if (!tbody) return;

        try {
            const response = await fetch(csvUrl);
            const text = await response.text();
            const rows = parseCSV(text);
            tbody.innerHTML = '';

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
                    let formattedDateStr = `${d}.${m + 1}.${y}`;
                    upcomingTests.push({ dateStr: formattedDateStr, name: row[1], dateObj: testDate });
                }
            }

            upcomingTests.sort((a, b) => a.dateObj - b.dateObj);
            const nextTwoTests = upcomingTests.slice(0, 2);

            if (nextTwoTests.length > 0) {
                nextTwoTests.forEach((test, index) => {
                    const tr = document.createElement('tr');
                    if (index === 0) tr.classList.add('current-week'); 
                    let label = index === 0 ? "Next up" : "Later";
                    
                    tr.innerHTML = `<td><span class="label-tag">${label}</span><br>${test.dateStr}</td><td>${test.name}</td>`;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="2" class="loading-td">No planned tests. Yay!</td></tr>';
            }

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="2" class="loading-td">Error loading tests.</td></tr>';
        }
    }

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
                if(icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    loadServiceData();
    loadTestsData();
});