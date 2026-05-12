(function(){
    const API_BASE = 'http://localhost:5000';
    function normalizeStandard(s) {
        if (!s) return '';
        const str = String(s).toLowerCase().trim();
        const digits = (str.match(/(\d+)/) || [])[0];
        if (digits) return digits;
        return str.replace(/\s+/g, '').replace(/std\.?|standard|grade|class/gi, '');
    }

    async function init() {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            if (!u || !u.email || (u.role && u.role !== 'student' && u.role !== undefined)) return;
            const std = u.standard || '';
            if (!std) return; // student hasn't saved profile standard yet
            if (typeof io === 'undefined') return;
            const socket = io(API_BASE);
            socket.on('connect', () => {
                const room = normalizeStandard(std) || String(std).trim();
                if (room) socket.emit('joinStandard', room);
            });
            socket.on('newChatMessage', (m) => {
                try {
                    // Show inline notification banner
                    const containerId = 'student-chat-banner';
                    let el = document.getElementById(containerId);
                    if (!el) {
                        el = document.createElement('div');
                        el.id = containerId;
                        el.style.position = 'fixed';
                        el.style.bottom = '20px';
                        el.style.right = '20px';
                        el.style.background = 'linear-gradient(90deg,#5b3ff8,#7c52ff)';
                        el.style.color = '#fff';
                        el.style.padding = '12px 16px';
                        el.style.borderRadius = '8px';
                        el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                        el.style.zIndex = 9999;
                        document.body.appendChild(el);
                    }
                    const title = (m.sender || 'Teacher');
                    const txt = m.message || '';
                    el.textContent = `${title}: ${txt}`;
                    setTimeout(() => { try { el.remove(); } catch(e){} }, 8000);
                } catch (e) { console.warn('chat msg render error', e); }
            });
        } catch (e) { /* ignore */ }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
