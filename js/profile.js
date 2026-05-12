const API_BASE_URL = 'http://localhost:5000/api';

function getStoredUserEmail() {
    try {
        const u = localStorage.getItem('user');
        if (!u) return null;
        const obj = JSON.parse(u);
        return obj.email || null;
    } catch (e) { return null; }
}

async function loadProfile() {
    const email = getStoredUserEmail();
    const msg = document.getElementById('profileMsg');
    if (!email) {
        msg.textContent = 'Not logged in. Please login first.';
        return;
    }
    document.getElementById('email').value = email;
    try {
        const res = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(email)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.student) {
                const s = data.student;
                document.getElementById('name').value = s.name || '';
                document.getElementById('standard').value = s.standard || '';
                document.getElementById('phone').value = s.phone || '';
                document.getElementById('address').value = s.address || '';
            }
        }
    } catch (err) {
        console.error('Error loading profile', err);
        msg.textContent = 'Unable to load profile';
    }
}

async function saveProfile(e) {
    e.preventDefault();
    const msg = document.getElementById('profileMsg');
    msg.textContent = '';
    const email = document.getElementById('email').value.trim();
    const name = document.getElementById('name').value.trim();
    const standard = document.getElementById('standard').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    if (!name || !standard || !email) {
        msg.textContent = 'Name, standard and email are required';
        return;
    }
    try {
        // Attempt update; if 404 then create
        const res = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(email)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, standard, phone, address })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                msg.textContent = 'Profile saved successfully';
                // Update localStorage user display name if present
                try {
                    const u = JSON.parse(localStorage.getItem('user') || '{}');
                    u.name = name;
                        u.standard = standard;
                    localStorage.setItem('user', JSON.stringify(u));
                } catch (e) {}
                // refresh header initial
                if (window.renderUserInitial) window.renderUserInitial();
                return;
            }
        }
        // if update failed because not found, create
        if (res.status === 404) {
            const createRes = await fetch(`${API_BASE_URL}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, standard, phone, address })
            });
            const cd = await createRes.json();
            if (createRes.ok && cd.success) {
                msg.textContent = 'Profile created successfully';
                try {
                    const u = JSON.parse(localStorage.getItem('user') || '{}');
                    u.name = name;
                    u.standard = standard;
                    localStorage.setItem('user', JSON.stringify(u));
                } catch (e) {}
                if (window.renderUserInitial) window.renderUserInitial();
                return;
            }
            msg.textContent = cd.message || 'Failed to create profile';
            return;
        }
        const body = await res.json();
        msg.textContent = body.message || 'Failed to save profile';
    } catch (err) {
        console.error('Save profile error', err);
        msg.textContent = 'Network error while saving profile';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profile-form');
    if (form) form.addEventListener('submit', saveProfile);
    loadProfile();
});
