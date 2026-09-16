const windows = document.querySelectorAll('.window');
const folders = document.querySelectorAll('.folder');
function openWindow(name) { windows.forEach(w => w.classList.toggle('is-open', w.dataset.window === name)); folders.forEach(f => f.classList.toggle('selected', f.dataset.section === name)); }
folders.forEach(folder => folder.addEventListener('click', () => openWindow(folder.dataset.section)));
document.querySelectorAll('.window-controls button:last-child').forEach(button => button.addEventListener('click', e => { e.currentTarget.closest('.window').classList.remove('is-open'); folders.forEach(f => f.classList.remove('selected')); }));
document.querySelectorAll('.window-controls button:first-child').forEach(button => button.addEventListener('click', e => e.currentTarget.closest('.window').classList.remove('is-open')));
function updateClock() { const now = new Date(); document.querySelector('#clock').textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); document.querySelector('#date').textContent = now.toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'}).toUpperCase(); }
updateClock(); setInterval(updateClock, 1000);
