// Attendance management logic
let attendanceRecords = [];

const attendanceForm = document.getElementById('attendanceForm');
const attendanceMsg = document.getElementById('attendanceMsg');
const attendanceTable = document.getElementById('attendanceTable');
const clearAttendanceForm = document.getElementById('clearAttendanceForm');
const clearMsg = document.getElementById('clearMsg');

if (attendanceForm) {
    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = attendanceForm.studentEmail.value.trim();
        const date = attendanceForm.date.value;
        const status = attendanceForm.status.value;
        if (email && date && status) {
            try {
                const res = await fetch('http://localhost:5000/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentEmail: email, date, status })
                });
                const data = await res.json();
                if (data.success) {
                    attendanceRecords.push({ email, date, status });
                    if (status === 'Absent') {
                        attendanceMsg.textContent = 'Attendance marked! The student is absent. You have been marked absent repeatedly. An email notification will be sent.';
                    } else {
                        attendanceMsg.textContent = 'Attendance marked!';
                    }
                    attendanceForm.reset();
                    renderAttendanceTable();
                    setTimeout(() => attendanceMsg.textContent = '', 3000);
                } else {
                    attendanceMsg.textContent = data.message || 'Error marking attendance.';
                }
            } catch (err) {
                attendanceMsg.textContent = 'Server error. Please try again.';
            }
        }
    });
}

// Clear attendance functionality
if (clearAttendanceForm) {
    clearAttendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const clearDate = clearAttendanceForm.clearDate.value;
        const clearEmail = clearAttendanceForm.clearStudentEmail.value.trim();
        
        if (!clearDate) {
            clearMsg.textContent = 'Please select a date.';
            clearMsg.style.color = 'red';
            setTimeout(() => clearMsg.textContent = '', 3000);
            return;
        }

        const confirmDelete = confirm(
            clearEmail 
                ? `Are you sure you want to clear attendance for ${clearEmail} on ${clearDate}?`
                : `Are you sure you want to clear ALL attendance records for ${clearDate}?`
        );

        if (!confirmDelete) return;

        try {
            const body = { date: clearDate };
            if (clearEmail) body.studentEmail = clearEmail;

            const res = await fetch('http://localhost:5000/api/attendance', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                clearMsg.textContent = `✓ Attendance cleared! ${data.deletedCount} record(s) deleted.`;
                clearMsg.style.color = 'green';
                clearAttendanceForm.reset();
                renderAttendanceTable();
                setTimeout(() => clearMsg.textContent = '', 4000);
            } else {
                clearMsg.textContent = data.message || 'Error clearing attendance.';
                clearMsg.style.color = 'red';
            }
        } catch (err) {
            clearMsg.textContent = 'Server error. Please try again.';
            clearMsg.style.color = 'red';
        }
    });
}

function renderAttendanceTable() {
    if (!attendanceTable) return;
    const tbody = attendanceTable.querySelector('tbody');
    tbody.innerHTML = '';
    attendanceRecords.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${a.email}</td><td>${a.date}</td><td>${a.status}</td>`;
        tbody.appendChild(row);
    });
}
if (attendanceTable) renderAttendanceTable();

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
