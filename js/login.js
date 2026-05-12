// OTP resend timer function
function startOTPTimer(duration = 60) {
    let timer = duration;
    const resendOTPBtn = document.getElementById('resendOTPBtn');
    resendOTPBtn.disabled = true;
    resendOTPBtn.textContent = `Resend OTP (${timer}s)`;

    if (window.otpTimerInterval) clearInterval(window.otpTimerInterval);

    window.otpTimerInterval = setInterval(() => {
        timer--;
        resendOTPBtn.textContent = `Resend OTP (${timer}s)`;
        if (timer <= 0) {
            clearInterval(window.otpTimerInterval);
            resendOTPBtn.disabled = false;
            resendOTPBtn.textContent = 'Resend OTP';
        }
    }, 1000);
}
const API_BASE_URL = 'http://localhost:5000/api';
let sessionId = null;
let otpTimerInterval = null;

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const sendOTPBtn = document.getElementById('sendOTPBtn');
const otpInput = document.getElementById('otp');
const verifyOTPBtn = document.getElementById('verifyOTPBtn');
const roleSelect = document.getElementById('role');
const proceedToPasswordBtn = document.getElementById('proceedToPasswordBtn');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const togglePassword = document.getElementById('togglePassword');

// Email validation helper
function isValidEmail(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// Show/hide password
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
    });
}

// Step 1: Email → Send OTP
if (sendOTPBtn) {
    sendOTPBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const errorDiv = document.getElementById('step1Error');
        errorDiv.textContent = '';
        if (!email) {
            errorDiv.textContent = 'Please enter your email';
            return;
        }
        if (!isValidEmail(email)) {
            errorDiv.textContent = 'Invalid email format';
            return;
        }
        sendOTPBtn.disabled = true;
        sendOTPBtn.textContent = 'Sending...';
        try {
            const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.success) {
                document.getElementById('step1').style.display = 'none';
                document.getElementById('step2').style.display = 'block';
                sessionId = null;
            } else {
                errorDiv.textContent = data.message || 'Failed to send OTP';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
        } finally {
            sendOTPBtn.disabled = false;
            sendOTPBtn.textContent = 'Send OTP';
        }
    });
}

// Step 2: OTP Verification
if (verifyOTPBtn) {
    verifyOTPBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const otp = otpInput.value.trim();
        const errorDiv = document.getElementById('step2Error');
        errorDiv.textContent = '';
        if (!otp || otp.length !== 6) {
            errorDiv.textContent = 'Please enter a valid 6-digit OTP';
            return;
        }
        verifyOTPBtn.disabled = true;
        verifyOTPBtn.textContent = 'Verifying...';
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await response.json();
            if (data.success) {
                sessionId = data.sessionId;
                document.getElementById('step2').style.display = 'none';
                document.getElementById('step3').style.display = 'block';
            } else {
                errorDiv.textContent = data.message || 'Invalid OTP';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
        } finally {
            verifyOTPBtn.disabled = false;
            verifyOTPBtn.textContent = 'Verify OTP';
        }
    });
}

// Step 3: Role Selection → Next
if (proceedToPasswordBtn) {
    proceedToPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const role = roleSelect.value;
        const errorDiv = document.getElementById('step3Error');
        errorDiv.textContent = '';
        if (!role) {
            errorDiv.textContent = 'Please select a role';
            return;
        }
        document.getElementById('step3').style.display = 'none';
        document.getElementById('step4').style.display = 'block';
        // Set password placeholder for role
        if (role === 'student') {
            passwordInput.placeholder = 'Create your password';
        } else if (role === 'teacher') {
            passwordInput.placeholder = 'Enter default password: teacher123';
        } else if (role === 'admin') {
            passwordInput.placeholder = 'Enter default password: admin123';
        }
    });
}

// Step 4: Password → Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const role = roleSelect.value;
        const errorDiv = document.getElementById('step4Error');
        errorDiv.textContent = '';
        if (!password) {
            errorDiv.textContent = 'Password is required';
            return;
        }
        let payload = { email, password, role };
        if (role === 'student') {
            if (!sessionId) {
                errorDiv.textContent = 'OTP verification required.';
                return;
            }
            payload.sessionId = sessionId;
        }
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                if (role === 'admin') {
                    window.location.href = 'admin/admin-dashboard.html';
                } else if (role === 'teacher') {
                    window.location.href = 'teacher/teacher-dashboard.html';
                } else {
                    window.location.href = 'student/student-dashboard.html';
                }
            } else {
                errorDiv.textContent = data.message || 'Login failed';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
}

// Step 1: Send OTP
sendOTPBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const errorDiv = document.getElementById('step1Error');
    errorDiv.textContent = '';

    if (!email) {
        errorDiv.textContent = 'Please enter your email';
        return;
    }

    sendOTPBtn.disabled = true;
    sendOTPBtn.textContent = 'Sending...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            startOTPTimer();
            goToStep(2);
            // For demo purposes - show OTP
            if (data.demo_otp) {
                console.log(`Demo OTP: ${data.demo_otp}`);
                alert(`Demo Mode: Your OTP is ${data.demo_otp}`);
            }
        } else {
            errorDiv.textContent = data.message || 'Failed to send OTP';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        console.error('Error:', error);
    } finally {
        sendOTPBtn.disabled = false;
        sendOTPBtn.textContent = 'Send OTP';
    }
});

// Step 2: Verify OTP
verifyOTPBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const otp = otpInput.value.trim();
    const errorDiv = document.getElementById('step2Error');
    errorDiv.textContent = '';

    if (!otp || otp.length !== 6) {
        errorDiv.textContent = 'Please enter a valid 6-digit OTP';
        return;
    }

    verifyOTPBtn.disabled = true;
    verifyOTPBtn.textContent = 'Verifying...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (data.success) {
            sessionId = data.sessionId;
            clearInterval(otpTimerInterval);
            goToStep(3);
        } else {
            errorDiv.textContent = data.message || 'Invalid OTP';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        console.error('Error:', error);
    } finally {
        verifyOTPBtn.disabled = false;
        verifyOTPBtn.textContent = 'Verify OTP';
    }
});

// Step 2: Resend OTP
resendOTPBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const errorDiv = document.getElementById('step2Error');
    errorDiv.textContent = '';

    resendOTPBtn.disabled = true;
    resendOTPBtn.textContent = 'Resending...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            startOTPTimer();
            otpInput.value = '';
            if (data.demo_otp) {
                alert(`Demo Mode: New OTP is ${data.demo_otp}`);
            }
        } else {
            errorDiv.textContent = data.message || 'Failed to resend OTP';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        console.error('Error:', error);
    } finally {
        resendOTPBtn.disabled = false;
        resendOTPBtn.textContent = 'Resend OTP';
    }
});

// Step 3: Proceed to Role Selection
proceedToRoleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const errorDiv = document.getElementById('step3Error');
    errorDiv.textContent = '';

    if (!password) {
        errorDiv.textContent = 'Please enter a password';
        return;
    }

    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        return;
    }

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        return;
    }

    goToStep(4);
});

// Step 4: Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const role = roleSelect.value;
        const errorDiv = document.getElementById('step4Error');
        errorDiv.textContent = '';

        if (!role) {
            errorDiv.textContent = 'Please select a role';
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role, sessionId })
            });

            const data = await response.json();

            if (data.success) {
                // Store user info in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('authToken', data.token || 'demo-token');

                // Redirect based on role
                if (role === 'admin') {
                    window.location.href = 'admin/admin-dashboard.html';
                } else if (role === 'teacher') {
                    window.location.href = 'teacher/teacher-dashboard.html';
                } else if (role === 'student') {
                    window.location.href = 'student/student-dashboard.html';
                }
            } else {
                errorDiv.textContent = data.message || 'Login failed';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
            console.error('Error:', error);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
}

// Password visibility toggle
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
    });
}

if (toggleConfirmPassword && confirmPasswordInput) {
    toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
    });
}

// (Removed unused OTP timer and navigation highlight functions)
window.addEventListener('DOMContentLoaded', setupNavHighlight);
