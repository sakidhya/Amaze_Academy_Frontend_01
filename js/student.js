// Student management and fees logic
let students = JSON.parse(localStorage.getItem('amaze_students') || '[]');
const API_BASE = ''; // assume same origin; set to backend origin if different

async function apiAvailable() {
    try {
        const res = await fetch(API_BASE + '/api/health');
        return res.ok;
    } catch (e) {
        return false;
    }
}
let feesRecords = [];

// Add Student
const addStudentForm = document.getElementById('addStudentForm');
const addStudentMsg = document.getElementById('addStudentMsg');
if (addStudentForm) {
    addStudentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = addStudentForm.studentName.value.trim();
        const email = addStudentForm.studentEmail.value.trim();
        const studentClass = addStudentForm.studentClass.value.trim();
        if (name && email && studentClass) {
            // Try backend first, fallback to localStorage
            apiAvailable().then(av => {
                if (av) {
                    fetch(API_BASE + '/api/students', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, standard: studentClass })
                    }).then(r => r.json()).then(data => {
                        if (data.success) {
                            addStudentMsg.textContent = 'Student added successfully!';
                            addStudentForm.reset();
                            setTimeout(() => addStudentMsg.textContent = '', 2000);
                            renderStudentTable();
                        } else {
                            addStudentMsg.textContent = data.message || 'Failed to add student';
                        }
                    }).catch(err => {
                        console.error(err);
                        addStudentMsg.textContent = 'Error adding student';
                    });
                } else {
                    // store students with a consistent `standard` field so teacher views can match
                    const studentObj = { name, email, studentClass, standard: studentClass };
                    students.push(studentObj);
                    localStorage.setItem('amaze_students', JSON.stringify(students));
                    addStudentMsg.textContent = 'Student added successfully!';
                    addStudentForm.reset();
                    setTimeout(() => addStudentMsg.textContent = '', 2000);
                    renderStudentTable();
                }
            });
        }
    });
}
// Render Student List
const studentTable = document.getElementById('studentTable');
if (studentTable) {
    function renderStudentTable() {
        const tbody = studentTable.querySelector('tbody');
        tbody.innerHTML = '';
        apiAvailable().then(av => {
            if (av) {
                fetch(API_BASE + '/api/students').then(r => r.json()).then(data => {
                    const localStudents = data.success ? data.students : [];
                    localStudents.forEach((s, idx) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                <td>${s.name}</td>
                <td>${s.email}</td>
                <td>${s.standard}</td>
                <td>
                    <button class="delete-student-btn" data-email="${s.email}" title="Delete" style="background:none;border:none;cursor:pointer;color:#e53935;font-size:1.1em;"><span>&#128465;</span></button>
                </td>`;
                        tbody.appendChild(row);
                    });
                    attachRowEvents(tbody);
                }).catch(err => {
                    console.error(err);
                });
            } else {
                const localStudents = JSON.parse(localStorage.getItem('amaze_students') || '[]');
                localStudents.forEach((s, idx) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                <td>${s.name}</td>
                <td>${s.email}</td>
                <td>${s.studentClass || s.standard || ''}</td>
                <td>
                    <button class="edit-student-btn" data-idx="${idx}" title="Edit" style="background:none;border:none;cursor:pointer;color:#3f51b5;font-size:1.1em;"><span>&#9998;</span></button>
                    <button class="delete-student-btn" data-idx="${idx}" title="Delete" style="background:none;border:none;cursor:pointer;color:#e53935;font-size:1.1em;"><span>&#128465;</span></button>
                </td>`;
                    tbody.appendChild(row);
                });
                attachRowEvents(tbody);
            }
        });
    }
    function attachRowEvents(tbody) {
        // Remove handlers first
        tbody.querySelectorAll('.delete-student-btn').forEach(btn => {
            btn.onclick = async function() {
                const email = this.getAttribute('data-email');
                if (email) {
                    try {
                        await fetch(API_BASE + '/api/students?email=' + encodeURIComponent(email), { method: 'DELETE' });
                    } catch (e) {
                        // ignore
                    }
                } else {
                    const idx = parseInt(this.getAttribute('data-idx'));
                    let studentsArr = JSON.parse(localStorage.getItem('amaze_students') || '[]');
                    studentsArr.splice(idx, 1);
                    localStorage.setItem('amaze_students', JSON.stringify(studentsArr));
                }
                renderStudentTable();
            };
        });
        tbody.querySelectorAll('.edit-student-btn').forEach(btn => {
            btn.onclick = function() {
                const idx = parseInt(this.getAttribute('data-idx'));
                let studentsArr = JSON.parse(localStorage.getItem('amaze_students') || '[]');
                const s = studentsArr[idx];
                const name = prompt('Edit Name:', s.name);
                if (name === null) return;
                const email = prompt('Edit Email:', s.email);
                if (email === null) return;
                const studentClass = prompt('Edit Class:', s.studentClass);
                if (studentClass === null) return;
                studentsArr[idx] = { name, email, studentClass };
                localStorage.setItem('amaze_students', JSON.stringify(studentsArr));
                renderStudentTable();
            };
        });
    }
    renderStudentTable();
}
// Fees Management
const feesForm = document.getElementById('feesForm');
const feesMsg = document.getElementById('feesMsg');
const feesTable = document.getElementById('feesTable');
if (feesForm) {
    feesForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = feesForm.studentEmail.value.trim();
        const amount = feesForm.amount.value.trim();
        const status = feesForm.status.value;
        if (email && amount && status) {
            feesRecords.push({ email, amount, status });
            feesMsg.textContent = 'Fees updated!';
            feesForm.reset();
            renderFeesTable();
            setTimeout(() => feesMsg.textContent = '', 2000);
        }
    });
}
function renderFeesTable() {
    if (!feesTable) return;
    const tbody = feesTable.querySelector('tbody');
    tbody.innerHTML = '';
    feesRecords.forEach(f => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${f.email}</td><td>${f.amount}</td><td>${f.status}</td>`;
        tbody.appendChild(row);
    });
}
if (feesTable) renderFeesTable();

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
