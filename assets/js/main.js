/* =========================================================
   JavaScript
   ========================================================= */

// ---------- 移动端导航 ----------
const navMenu = document.getElementById("navMenu");
const navLinks = document.getElementById("navLinks");

navMenu.addEventListener("click", () => {
    navMenu.setAttribute('aria-expanded', String(navLinks.classList.toggle("open")));
});

document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        navMenu.setAttribute('aria-expanded', 'false');
    });
});

// ---------- 滚动渐入 ----------
const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if(entry.isIntersecting){
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        }
    });
}, {threshold:.08});

document.querySelectorAll(".reveal").forEach(el => {
    revealObserver.observe(el);
});

// ---------- 图片灯箱 ----------
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

document.addEventListener("click", event => {
    const image = event.target.closest(".shot-image img, .clickable-thumb");

    if(image){
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt || "作品大图预览";
        lightbox.classList.add("active");
        lightbox.setAttribute("aria-hidden","false");
        document.body.style.overflow = "hidden";
    }
});

function closeLightbox(){
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
}

lightbox.addEventListener("click", event => {
    if(event.target === lightbox || event.target === lightboxImage){
        closeLightbox();
    }
});

lightboxClose.addEventListener("click", closeLightbox);

document.addEventListener("keydown", event => {
    if(event.key === "Escape"){
        closeLightbox();
    }
});

// ---------- 当前导航高亮 ----------
const sections = document.querySelectorAll("main section[id]");
const navItems = document.querySelectorAll(".nav-links a");

const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if(entry.isIntersecting){
            navItems.forEach(item => {
                item.classList.toggle(
                    "active",
                    item.getAttribute("href") === "#" + entry.target.id
                );
            });
        }
    });
}, {
    rootMargin:"-30% 0px -60% 0px",
    threshold:0
});

sections.forEach(section => activeObserver.observe(section));

// Case navigation, including keyboard access.
const caseTabs = [...document.querySelectorAll('.case-tab')];
function selectCase(tab) {
    caseTabs.forEach(item => {
        const selected = item === tab;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('.case-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === tab.dataset.case);
    });
}
caseTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectCase(tab));
    tab.addEventListener('keydown', event => {
        let next;
        if(event.key === 'ArrowRight') next = (index + 1) % caseTabs.length;
        if(event.key === 'ArrowLeft') next = (index - 1 + caseTabs.length) % caseTabs.length;
        if(event.key === 'Home') next = 0;
        if(event.key === 'End') next = caseTabs.length - 1;
        if(next === undefined) return;
        event.preventDefault();
        selectCase(caseTabs[next]);
        caseTabs[next].focus();
    });
});
