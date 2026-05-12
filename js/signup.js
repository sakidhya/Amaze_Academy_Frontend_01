const API_BASE_URL = 'http://localhost:5000/api';

function createModal(message, actions = []) {
    // remove existing
    const existing = document.getElementById('app-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'app-modal';
    overlay.style.position = 'fixed';
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.right = 0;
    overlay.style.bottom = 0;
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.width = '380px';
    box.style.background = '#fff';
    box.style.borderRadius = '8px';
    box.style.padding = '20px';
    box.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';

    const msg = document.createElement('div');
    msg.style.marginBottom = '16px';
    msg.textContent = message;

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';

    actions.forEach(a => {
        const b = document.createElement('button');
        b.textContent = a.label;
        b.style.padding = '8px 12px';
        b.style.border = 'none';
        b.style.borderRadius = '6px';
        b.style.cursor = 'pointer';
        b.style.background = a.primary ? '#5b3ff8' : '#e0e0e0';
        b.style.color = a.primary ? '#fff' : '#000';
        b.addEventListener('click', () => {
            if (a.onClick) a.onClick();
            overlay.remove();
        });
        btnRow.appendChild(b);
    });

    box.appendChild(msg);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

document.getElementById('signup-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    if (!email || !password) {
        createModal('Email and password are required', [{ label: 'OK', primary: true }]);
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (data.token) localStorage.setItem('authToken', data.token);
            // redirect to dashboard
            createModal('Signup successful — Redirecting to dashboard...', [{ label: 'OK', primary: true, onClick: () => {
                if (role === 'admin') window.location.href = 'admin/admin-dashboard.html';
                else if (role === 'teacher') window.location.href = 'teacher/teacher-dashboard.html';
                else window.location.href = 'student/student-dashboard.html';
            }}]);
        } else {
            // If email already registered, inform the user and offer actions
            if (data && data.message && data.message.toLowerCase().includes('email already')) {
                createModal('Email already registered. Please login or use Forgot Password to recover your account.', [
                    { label: 'Go to Login', onClick: () => window.location.href = 'login.html' },
                    { label: 'Forgot Password', primary: true, onClick: () => window.location.href = 'forgot-password.html' }
                ]);
            } else {
                createModal(data.message || 'Signup failed', [{ label: 'OK', primary: true }]);
            }
        }
    } catch (err) {
        console.error(err);
        createModal('Network error during signup', [{ label: 'OK', primary: true }]);
    }
});