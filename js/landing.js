// Hero Section Background Image Slider (School Students)
const heroSection = document.querySelector('.hero-section');
const heroImages = [
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=80'
];
let currentHero = 0;
function changeHeroBg() {
    if (!heroSection) return;
    heroSection.classList.add('fade');
    setTimeout(() => {
        heroSection.style.backgroundImage = `url('${heroImages[currentHero]}')`;
        heroSection.classList.remove('fade');
    }, 400);
    currentHero = (currentHero + 1) % heroImages.length;
}
setInterval(changeHeroBg, 3500);
window.addEventListener('DOMContentLoaded', changeHeroBg);

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
            } else if (href === '#') {
                window.scrollTo(0, 0);
            }
        });
    });
    // Remove active from all links by default (no default highlight)
}
window.addEventListener('DOMContentLoaded', setupNavHighlight);

// Contact form simple frontend validation
const contactForm = document.getElementById('contactForm');
const contactMsg = document.getElementById('contactMsg');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        contactMsg.textContent = 'Thank you for contacting us!';
        contactForm.reset();
        setTimeout(() => contactMsg.textContent = '', 3000);
    });
}