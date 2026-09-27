// Author: Alex Picon <alexnpc@me.com>
const slides = [...document.querySelectorAll('main section')];
let index = 0;
const observer = new IntersectionObserver(entries => { for(const e of entries) if(e.isIntersecting) index=slides.indexOf(e.target); },{threshold:.55});
slides.forEach(s=>observer.observe(s));
window.addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown','PageDown','ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();index=Math.max(0,Math.min(slides.length-1,index+(['ArrowRight','ArrowDown','PageDown'].includes(e.key)?1:-1)));slides[index].scrollIntoView();}});
document.getElementById('demoLink').href = `${location.origin}/keeper/?demo=1`;
