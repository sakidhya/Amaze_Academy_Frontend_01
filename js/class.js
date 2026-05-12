// Class view: load students for the selected standard, allow marking attendance and chat
(async function() {
    const params = new URLSearchParams(window.location.search);
    const standard = params.get('standard') || '';
    document.getElementById('classTitle').textContent = standard + ' Standard';
    const API_BASE = 'http://localhost:5000';

    async function apiAvailable() {
        try { const r = await fetch(API_BASE + '/api/health'); return r.ok; } catch (e) { return false; }
    }

    const tbody = document.querySelector('#classStudentTable tbody');
    const attendanceDateClass = document.getElementById('attendanceDateClass');
    const submitAttendanceBtn = document.getElementById('submitAttendanceBtn');
    const submitAttendanceMsg = document.getElementById('submitAttendanceMsg');
    
    // Store attendance state for batch submission
    let attendanceData = {};

    function normalizeStandard(s) {
        if (!s) return '';
        const str = String(s).toLowerCase().trim();
        // prefer numeric match (3, 10 etc.) so variants like '3rd', '3 std', '3std' all become '3'
        const digits = (str.match(/(\d+)/) || [])[0];
        if (digits) return digits;
        // fallback: remove common suffixes/words
        return str.replace(/\s+/g, '').replace(/std\.?|standard|grade|class|first|second|third|fourth|fifth/gi, '').trim();
    }

    async function loadStudents() {
        tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
        if (await apiAvailable()) {
            // send normalized query where possible (e.g. '3rd' -> '3')
            const q = normalizeStandard(standard) || standard;
            const res = await fetch(API_BASE + '/api/students?standard=' + encodeURIComponent(q));
            const data = await res.json();
            let list = data.success ? data.students : [];

            // If server returned no students, merge any locally-stored students (admin may have added while offline)
            if ((!list || list.length === 0)) {
                try {
                    const local = JSON.parse(localStorage.getItem('amaze_students') || '[]');
                    const ns = normalizeStandard(standard);
                    const localMatches = local.filter(s => ns && ns === normalizeStandard(s.studentClass || s.standard));
                    if (localMatches && localMatches.length) {
                        // Deduplicate by email: prefer server entries but include local ones
                        const emails = new Set((list || []).map(s => (s.email || '').toLowerCase()));
                        localMatches.forEach(s => {
                            if (s.email && !emails.has(s.email.toLowerCase())) {
                                list.push({ name: s.name, email: s.email, standard: s.studentClass || s.standard });
                                emails.add(s.email.toLowerCase());
                            }
                        });
                    }
                } catch (e) {
                    // ignore local storage parse errors
                }
            }

            renderStudents(list);
        } else {
            const local = JSON.parse(localStorage.getItem('amaze_students') || '[]');
            // normalize both stored student fields and requested standard to be tolerant of formatting
            const ns = normalizeStandard(standard);
            const list = local.filter(s => ns && ns === normalizeStandard(s.studentClass || s.standard));
            renderStudents(list);
        }
    }

    // Keep teacher view in sync when admin updates students (localStorage across tabs)
    window.addEventListener('storage', function(e) {
        if (!e.key) return;
        if (e.key === 'amaze_students' || e.key.startsWith('amaze_students')) {
            // reload students if class view is open
            loadStudents();
        }
    });

    // Periodic refresh when online to pick up backend changes (every 15s)
    setInterval(async () => {
        try {
            if (await apiAvailable()) {
                await loadStudents();
            }
        } catch (e) { /* ignore errors */ }
    }, 15000);

    function renderStudents(list) {
        tbody.innerHTML = '';
        attendanceData = {}; // reset attendance data
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="2">No students found</td></tr>';
            return;
        }
        list.forEach(s => {
            const tr = document.createElement('tr');
            const studentCell = document.createElement('td');
            studentCell.innerHTML = `<span class="student-name">${s.name}</span><span class="student-email">${s.email || ''}</span>`;
            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `
                <button class="present-btn">Present</button>
                <button class="absent-btn">Absent</button>
            `;
            tr.appendChild(studentCell);
            tr.appendChild(actionsCell);
            tbody.appendChild(tr);
            const presentBtn = tr.querySelector('.present-btn');
            const absentBtn = tr.querySelector('.absent-btn');
            
            // Store initial state using normalized email key
            const normalizedEmail = (s.email || '').toLowerCase().trim();
            attendanceData[normalizedEmail] = null;
            
            // click handlers: only update UI state, don't save yet
            presentBtn.addEventListener('click', async () => {
                tr.classList.remove('absent-row');
                tr.classList.add('present-row');
                presentBtn.classList.add('active');
                absentBtn.classList.remove('active');
                attendanceData[normalizedEmail] = 'Present';
            });
            absentBtn.addEventListener('click', async () => {
                tr.classList.remove('present-row');
                tr.classList.add('absent-row');
                absentBtn.classList.add('active');
                presentBtn.classList.remove('active');
                attendanceData[normalizedEmail] = 'Absent';
            });
        });
    }

    async function markAttendance(email, status) {
        if (await apiAvailable()) {
            await fetch(API_BASE + '/api/attendance', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentEmail: email, date: new Date().toISOString(), status })
            });
                // no alert — UI updated optimistically by caller
        } else {
            // local fallback
            const records = JSON.parse(localStorage.getItem('amaze_attendance') || '[]');
            records.push({ studentEmail: email, date: new Date().toISOString(), status });
            localStorage.setItem('amaze_attendance', JSON.stringify(records));
                // no alert
        }
    }

    // Load saved attendance for a specific date and render in the submitted attendance table
    async function loadAttendanceForDate(dateStr) {
        if (!dateStr) return;
        const container = document.getElementById('submittedAttendanceContainer');
        const table = document.getElementById('submittedAttendanceTable');
        const tbody = table.querySelector('tbody');
        const dateHeading = document.getElementById('attendanceTableDate');
        tbody.innerHTML = '';
        if (dateHeading) {
            // show date in D.M.YY format
            const dt = new Date(dateStr);
            const d = dt.getDate();
            const m = dt.getMonth() + 1;
            const yy = String(dt.getFullYear()).slice(-2);
            dateHeading.textContent = `${d}.${m}.${yy}`;
        }

        const online = await apiAvailable();
        let records = [];
        if (online) {
            try {
                const res = await fetch(API_BASE + '/api/attendance?date=' + encodeURIComponent(dateStr));
                if (!res.ok) {
                    console.warn('Attendance API error', res.status);
                    records = JSON.parse(localStorage.getItem('amaze_attendance') || '[]').filter(r => r.date && r.date.startsWith(dateStr));
                } else {
                    const data = await res.json();
                    records = data.success ? data.records : [];
                }
            } catch (e) {
                console.warn('Failed to load attendance records', e);
                records = JSON.parse(localStorage.getItem('amaze_attendance') || '[]').filter(r => r.date && r.date.startsWith(dateStr));
            }
        } else {
            // local fallback
            records = JSON.parse(localStorage.getItem('amaze_attendance') || '[]').filter(r => r.date && r.date.startsWith(dateStr));
        }

        // Get class student list (prefer backend) so we can show names in table and show 'Holiday' when no attendance
        let classStudents = [];
        const ns = normalizeStandard(standard) || standard;
        if (online) {
            try {
                const r = await fetch(API_BASE + '/api/students?standard=' + encodeURIComponent(ns));
                const d = await r.json().catch(() => ({}));
                classStudents = d && d.success ? d.students : [];
            } catch (e) {
                classStudents = [];
            }
        }
        if (!classStudents || classStudents.length === 0) {
            // fallback to rows already rendered or localStorage
            const local = JSON.parse(localStorage.getItem('amaze_students') || '[]');
            classStudents = local.filter(s => ns && ns === normalizeStandard(s.studentClass || s.standard));
        }

        // Map attendance by email
        const attByEmail = {};
        records.forEach(r => { if (r.studentEmail) attByEmail[r.studentEmail.toLowerCase()] = r.status; });

        // If no students found for class, show message
        if (!classStudents || classStudents.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3" style="padding:10px;border-bottom:1px solid #334155;">No students found for this class/date.</td>';
            tbody.appendChild(tr);
            container.style.display = 'block';
            return;
        }

        // For each student in class, show name, date, and status (default 'Holiday' when no attendance record)
        classStudents.forEach(s => {
            const email = (s.email || '').toLowerCase();
            const name = s.name || email || 'Unknown';
            let status = attByEmail[email];
            if (!status) status = 'Holiday';
            const dateDisplay = (() => {
                const dt = new Date(dateStr);
                return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`;
            })();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:10px;border-bottom:1px solid #334155;">${name}</td>
                <td style="padding:10px;border-bottom:1px solid #334155;">${dateDisplay}</td>
                <td style="padding:10px;border-bottom:1px solid #334155;">${status}</td>`;
            tbody.appendChild(tr);
        });

        container.style.display = records.length === 0 ? 'block' : 'block';
    }

    // Submit attendance functionality
    if (submitAttendanceBtn) {
        submitAttendanceBtn.addEventListener('click', async function() {
            const date = attendanceDateClass.value;
            if (!date) {
                submitAttendanceMsg.textContent = 'Please select a date first.';
                submitAttendanceMsg.style.color = 'red';
                setTimeout(() => submitAttendanceMsg.textContent = '', 3000);
                return;
            }

            // Filter marked attendance (non-null values)
            const markedRecords = Object.entries(attendanceData)
                .filter(([email, status]) => status !== null)
                .map(([email, status]) => ({ studentEmail: email, date: new Date(date).toISOString().split('T')[0], status }));

            if (markedRecords.length === 0) {
                submitAttendanceMsg.textContent = 'Please mark at least one student present or absent.';
                submitAttendanceMsg.style.color = 'orange';
                setTimeout(() => submitAttendanceMsg.textContent = '', 3000);
                return;
            }

            try {
                submitAttendanceBtn.disabled = true;
                let successCount = 0;
                const submittedRecords = [];
                
                // Get student list for name lookup
                const studentList = Array.from(tbody.querySelectorAll('tr')).map(tr => {
                    const email = (tr.querySelector('.student-email').textContent || '').trim().toLowerCase();
                    const name = tr.querySelector('.student-name').textContent;
                    return { email, name };
                });

                for (const record of markedRecords) {
                    try {
                        const res = await fetch(API_BASE + '/api/attendance', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(record)
                        });
                        const data = await res.json();
                        if (data.success) {
                            successCount++;
                            const student = studentList.find(s => s.email === record.studentEmail);
                            submittedRecords.push({
                                standard,
                                name: student ? student.name : 'Unknown',
                                email: record.studentEmail,
                                date: record.date,
                                status: record.status
                            });
                        }
                    } catch (err) {
                        console.error('Error submitting attendance for ' + record.studentEmail, err);
                    }
                }

                if (successCount === markedRecords.length) {
                    submitAttendanceMsg.textContent = `✓ Attendance submitted! ${successCount} record(s) saved for ${date}.`;
                    submitAttendanceMsg.style.color = 'green';
                    
                    // Display submitted records in table
                    displaySubmittedRecords(submittedRecords);
                    
                    attendanceData = {}; // reset state
                    renderStudents([]); // clear UI
                    await loadStudents(); // reload students
                    // reload attendance table for this date from server
                    await loadAttendanceForDate(date);
                    attendanceDateClass.value = ''; // reset date
                } else if (successCount > 0) {
                    submitAttendanceMsg.textContent = `Saved ${successCount} of ${markedRecords.length} records.`;
                    submitAttendanceMsg.style.color = 'orange';
                    
                    // Still display what was saved
                    if (submittedRecords.length > 0) {
                        displaySubmittedRecords(submittedRecords);
                    }
                    await loadAttendanceForDate(date);
                } else {
                    submitAttendanceMsg.textContent = 'Failed to submit attendance. Please try again.';
                    submitAttendanceMsg.style.color = 'red';
                }
                setTimeout(() => submitAttendanceMsg.textContent = '', 5000);
            } catch (err) {
                console.error('Submit error:', err);
                submitAttendanceMsg.textContent = 'Server error. Please try again.';
                submitAttendanceMsg.style.color = 'red';
            } finally {
                submitAttendanceBtn.disabled = false;
            }
        });
    }

    // When date is changed, load saved attendance for that date
    if (attendanceDateClass) {
        attendanceDateClass.addEventListener('change', async function() {
            const d = attendanceDateClass.value;
            if (d) {
                // Use ISO date (YYYY-MM-DD) to query backend
                await loadAttendanceForDate(d);
            }
        });
    }

    // Display submitted attendance records
    function displaySubmittedRecords(records) {
        const container = document.getElementById('submittedAttendanceContainer');
        const table = document.getElementById('submittedAttendanceTable');
        const tbody = table.querySelector('tbody');
        
        tbody.innerHTML = '';
        records.forEach(record => {
            const tr = document.createElement('tr');
            const statusColor = record.status === 'Present' ? '#22c55e' : '#ef4444';
            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #334155;">${record.standard}</td>
                <td style="padding: 10px; border-bottom: 1px solid #334155;">${record.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #334155;">${record.email}</td>
                <td style="padding: 10px; border-bottom: 1px solid #334155;">${new Date(record.date).toLocaleDateString()}</td>
                <td style="padding: 10px; border-bottom: 1px solid #334155; color: ${statusColor}; font-weight: bold;">${record.status}</td>
            `;
            tbody.appendChild(tr);
        });
        
        container.style.display = 'block';
    }

    // Chat functionality
    const chatForm = document.getElementById('chatForm');
    const chatMessages = document.getElementById('chatMessages');
    const chatAlertText = document.getElementById('chatAlertText');
    const chatAlert = document.getElementById('chatAlert');
    const chatFileInput = document.getElementById('chatFile');
    const selectedFile = document.getElementById('selectedFile');

    // Real-time socket (try to connect to backend running on localhost:5000)
    let socket = null;
    try {
        if (typeof io !== 'undefined') {
            socket = io(API_BASE);
            socket.on('connect', () => {
                try {
                    const room = normalizeStandard(standard) || String(standard || '').trim();
                    if (room) socket.emit('joinStandard', room);
                } catch (e) { /* ignore */ }
            });
            socket.on('newChatMessage', (m) => {
                try {
                    if ((m.standard || '') === standard) {
                        renderMessage(m);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                } catch (e) { /* ignore render errors */ }
            });
        }
    } catch (e) {
        console.warn('Socket.io not available or failed to connect', e);
    }

    function renderMessage(m) {
        const row = document.createElement('div');
        row.className = 'chat-row ' + ((m.sender || '').toLowerCase().includes('teacher') ? 'right' : 'left');
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + ((m.sender || '').toLowerCase().includes('teacher') ? 'teacher' : 'student');
        const meta = document.createElement('div');
        meta.className = 'chat-meta';
        const time = m.createdAt ? new Date(m.createdAt) : new Date();
        meta.textContent = (m.sender || 'Unknown') + ' • ' + time.toLocaleString();
        const body = document.createElement('div');
        body.innerHTML = (m.message || '').replace(/\n/g, '<br/>');
        bubble.appendChild(meta);
        bubble.appendChild(body);
        if (m.fileUrl) {
            const a = document.createElement('a');
            a.href = m.fileUrl;
            a.target = '_blank';
            a.className = 'chat-file-link';
            a.textContent = 'Attachment';
            bubble.appendChild(a);
        }
        const ts = document.createElement('span');
        ts.className = 'timestamp';
        ts.textContent = time.toLocaleTimeString();
        bubble.appendChild(ts);
        row.appendChild(bubble);
        chatMessages.appendChild(row);
    }

    async function loadMessages() {
        if (!standard) return;
        chatMessages.innerHTML = '';
        const online = await apiAvailable();
        if (online) {
            chatAlertText.textContent = 'Online — messages are saved on server';
            try {
                const r = await fetch(API_BASE + '/api/chat/messages?standard=' + encodeURIComponent(standard));
                const data = await r.json();
                const list = data.messages || [];
                if (!list.length) {
                    const p = document.createElement('div');
                    p.className = 'chat-meta';
                    p.textContent = 'No messages yet. Start the conversation.';
                    chatMessages.appendChild(p);
                } else {
                    list.reverse().forEach(m => renderMessage(m));
                }
            } catch (err) {
                chatAlertText.textContent = 'Online (failed to load messages)';
            }
        } else {
            chatAlertText.textContent = 'Offline — messages stored locally';
            const localKey = 'amaze_chat_' + standard;
            const localMsgs = JSON.parse(localStorage.getItem(localKey) || '[]');
            if (!localMsgs.length) {
                const p = document.createElement('div');
                p.className = 'chat-meta';
                p.textContent = 'No messages yet (offline).';
                chatMessages.appendChild(p);
            } else {
                localMsgs.forEach(m => renderMessage(m));
            }
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatFileInput.addEventListener('change', function() {
        if (chatFileInput.files.length) {
            const name = chatFileInput.files[0].name;
            selectedFile.innerHTML = `<span class="file-tag">${name}</span>`;
        } else {
            selectedFile.innerHTML = '';
        }
    });

    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const sender = document.getElementById('chatSender').value.trim();
        const message = document.getElementById('chatMessage').value.trim();
        if (!sender) return alert('Enter sender name');
        const online = await apiAvailable();
            if (online) {
            const fd = new FormData();
            fd.append('standard', standard);
            fd.append('sender', sender);
            // include role if available (so backend can detect teacher reliably)
            try {
                const u = JSON.parse(localStorage.getItem('user') || '{}');
                if (u && u.role) fd.append('role', u.role);
            } catch (e) { /* ignore */ }
            fd.append('message', message);
            if (chatFileInput.files[0]) fd.append('file', chatFileInput.files[0]);
            try {
                await fetch(API_BASE + '/api/chat/message', { method: 'POST', body: fd });
                document.getElementById('chatMessage').value = '';
                chatFileInput.value = '';
                selectedFile.innerHTML = '';
                await loadMessages();
            } catch (err) {
                alert('Failed to send message');
            }
        } else {
            // store locally for offline preview
            const localKey = 'amaze_chat_' + standard;
            const localMsgs = JSON.parse(localStorage.getItem(localKey) || '[]');
            const newMsg = { sender, message, createdAt: new Date().toISOString() };
            localMsgs.push(newMsg);
            localStorage.setItem(localKey, JSON.stringify(localMsgs));
            renderMessage(newMsg);
            document.getElementById('chatMessage').value = '';
            chatFileInput.value = '';
            selectedFile.innerHTML = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });

    // Chat toggle button behaviour
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatCard = document.getElementById('chatCard');
    if (chatToggleBtn && chatCard) {
        chatToggleBtn.addEventListener('click', async function() {
            const isHidden = chatCard.classList.contains('hidden');
            if (isHidden) {
                chatCard.classList.remove('hidden');
                chatToggleBtn.textContent = 'Close Chat';
                // load messages when opening
                await loadMessages();
            } else {
                chatCard.classList.add('hidden');
                chatToggleBtn.textContent = 'Open Chat';
            }
        });
    }

    await loadStudents();
    // Do not auto-load chat messages until user opens chat

})();
