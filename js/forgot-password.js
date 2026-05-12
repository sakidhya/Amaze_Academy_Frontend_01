const sendOtpBtn = document.getElementById('send-otp');
const verifyOtpBtn = document.getElementById('verify-otp');
const resetPwdBtn = document.getElementById('reset-password');

let currentSessionId = null;

const API_BASE_URL = 'http://localhost:5000/api';

function isValidEmail(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// Step 1: Send OTP
if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async (e) => {
        e && e.preventDefault();
        const email = document.getElementById('email').value.trim();
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

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';
        try {
            const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                document.getElementById('step-1').style.display = 'none';
                document.getElementById('step-2').style.display = 'block';
                // show demo otp when provided
                if (data.demo_otp) {
                    console.log('Demo OTP:', data.demo_otp);
                    const demoMsg = document.createElement('div');
                    demoMsg.className = 'info-message';
                    demoMsg.textContent = `Demo OTP: ${data.demo_otp}`;
                    errorDiv.parentNode.insertBefore(demoMsg, errorDiv.nextSibling);
                }
            } else {
                errorDiv.textContent = data.message || 'Failed to send OTP';
            }
        } catch (err) {
            console.error(err);
            errorDiv.textContent = 'Network error sending OTP';
        } finally {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }
    });
}

// Step 2: Verify OTP
if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', async (e) => {
        e && e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const otp = document.getElementById('otp').value.trim();
        const errorDiv = document.getElementById('step2Error');
        errorDiv.textContent = '';
        if (!otp) {
            errorDiv.textContent = 'Please enter the OTP';
            return;
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'Verifying...';
        try {
            const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                currentSessionId = data.sessionId;
                document.getElementById('step-2').style.display = 'none';
                document.getElementById('step-3').style.display = 'block';
            } else {
                errorDiv.textContent = data.message || 'OTP verification failed';
            }
        } catch (err) {
            console.error(err);
            errorDiv.textContent = 'Network error verifying OTP';
        } finally {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.textContent = 'Verify OTP';
        }
    });
}

// Step 3: Reset Password
if (resetPwdBtn) {
    resetPwdBtn.addEventListener('click', async (e) => {
        e && e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorDiv = document.getElementById('step3Error');
        errorDiv.textContent = '';

        if (!newPassword || !confirmPassword) {
            errorDiv.textContent = 'Please enter and confirm your new password';
            return;
        }
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            return;
        }

        // Demo flow: no backend reset endpoint. Redirect after success.
        errorDiv.textContent = 'Password updated. Redirecting...';
        setTimeout(() => {
            window.location.href = 'signup.html';
        }, 900);
    });
}