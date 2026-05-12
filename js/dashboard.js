// Dashboard JS (placeholder for future dynamic content)

// Navigation: only one menu item highlighted at a time
function setupNavHighlight() {
    const navLinks = document.querySelectorAll('.main-nav a:not(.btn-primary)');
    if (!navLinks.length) return;
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active from all
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active to clicked
            link.classList.add('active');
            // Navigate if needed
            const href = link.getAttribute('href');
            if (href && href !== '#') {
                setTimeout(() => window.location.href = href, 100);
            }
        });
    });
    // Remove active from all links by default (no default highlight)
}
window.addEventListener('DOMContentLoaded', setupNavHighlight);

// Render user initial in header (if any) as a circle on the right
function renderUserInitial() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const existing = document.getElementById('user-initial');
        let container = document.querySelector('.main-nav');
        if (!container) return;
        if (existing) existing.remove();
        if (!user || !user.email) return;
        const span = document.createElement('span');
        span.id = 'user-initial';
        span.style.display = 'inline-flex';
        span.style.alignItems = 'center';
        span.style.justifyContent = 'center';
        span.style.width = '36px';
        span.style.height = '36px';
        span.style.borderRadius = '50%';
        span.style.background = '#5b3ff8';
        span.style.color = '#fff';
        span.style.marginLeft = '12px';
        span.style.fontWeight = '700';
        const name = user.name || user.email || '';
        span.textContent = (name && name.length) ? name[0].toUpperCase() : '';
        container.appendChild(span);
    } catch (e) { /* ignore */ }
}
window.addEventListener('DOMContentLoaded', renderUserInitial);
window.renderUserInitial = renderUserInitial;
