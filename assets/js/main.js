(() => {
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* hover notes */
    const pop = Object.assign(document.createElement("div"), { className: "pop" });
    pop.setAttribute("role", "tooltip"); document.body.append(pop);
    let mute = false;
    const place = (x, y) => {
        const w = pop.offsetWidth, h = pop.offsetHeight;
        let l = x + 16, t = y + 18;
        if (l + w > innerWidth - 8) l = x - w - 16;
        if (t + h > innerHeight - 8) t = y - h - 14;
        pop.style.left = Math.max(8, l) + "px"; pop.style.top = Math.max(8, t) + "px";
    };
    const show = (el, x, y) => {
        pop.replaceChildren();
        if (el.dataset.img) { const i = new Image(); i.alt = ""; i.src = el.dataset.img; pop.append(i); }
        else pop.textContent = el.dataset.pop;
        pop.style.setProperty("--r", (Math.random() * 4 - 2).toFixed(1) + "deg");
        pop.classList.add("on"); place(x, y);
    };
    const hide = () => pop.classList.remove("on");
    const tgt = e => e.target.closest?.("[data-pop],[data-img]");
    document.addEventListener("pointerover", e => { const el = tgt(e); if (el && e.pointerType === "mouse") show(el, e.clientX, e.clientY); });
    document.addEventListener("pointermove", e => { if (pop.classList.contains("on")) place(e.clientX, e.clientY); });
    document.addEventListener("pointerout", e => { if (tgt(e)) hide(); });
    document.documentElement.addEventListener("mouseleave", hide);
    document.addEventListener("focusin", e => {
        const el = tgt(e); if (!el || mute || !e.target.matches(":focus-visible")) return;
        const r = el.getBoundingClientRect(); show(el, r.left, r.bottom - 12);
    });
    document.addEventListener("focusout", hide);

    /* copy email + lightbox */
    const toast = $(".toast"), lb = $("#lb"); let tt;
    document.addEventListener("click", e => {
        const a = e.target.closest("[data-copy]");
        if (a) {
            e.preventDefault();
            (navigator.clipboard ? navigator.clipboard.writeText(a.dataset.copy) : Promise.reject()).then(
                () => { toast.textContent = "Email copied"; }, () => { location.href = a.href; });
            toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("on"), 1800);
        }
        const b = e.target.closest("[data-lb]");
        if (b) { hide(); const im = $("img", lb); im.src = b.dataset.lb; im.alt = b.dataset.cap || ""; $(".cap", lb).textContent = b.dataset.cap || ""; lb.showModal(); }
    });
    lb.addEventListener("click", e => { if (e.target === lb || e.target.closest(".x")) lb.close(); });
    lb.addEventListener("close", () => { hide(); mute = true; setTimeout(() => (mute = false), 300); });

    /* reveal on scroll */
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .6 });
    $$("mark,.meter").forEach(el => io.observe(el));

    /* section guide: previous / now / next */
    const secs = $$("[data-sec]"), seq = $(".seq");
    if (secs.length > 1) {
        const pb = $(".p", seq), cb = $(".c", seq), nb = $(".n", seq), ems = [pb, cb, nb].map(b => $("em", b));
        let cur = -1, raf = 0, forced = -1;
        const swap = (em, text, dir) => {
            const old = em.lastElementChild;
            if (old && old.textContent === text) return;
            const n = document.createElement("span"); n.textContent = text; em.append(n);
            if (!old || !dir || reduce) { old && old.remove(); return; }
            const o = { duration: 460, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" };
            n.animate([{ opacity: 0, transform: `translateY(${dir * 10}px)` }, { opacity: 1, transform: "none" }], o);
            old.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${-dir * 10}px)` }], { ...o, duration: 320 }).onfinish = () => old.remove();
        };
        const scrollable = () => document.documentElement.scrollHeight > innerHeight + 40;
        const upd = () => {
            seq.hidden = !scrollable(); if (seq.hidden) return;
            let i = 0;
            secs.forEach((s, k) => { if (s.getBoundingClientRect().top < innerHeight * .4) i = k; });
            if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 4) i = secs.length - 1;
            if (forced >= 0) i = forced;
            if (i === cur) return;
            const dir = cur < 0 ? 0 : i > cur ? 1 : -1, end = i === secs.length - 1; cur = i;
            const t = [i ? secs[i - 1].dataset.sec : "", secs[i].dataset.sec, end ? "Back to top" : secs[i + 1].dataset.sec];
            ems.forEach((em, k) => swap(em, t[k], dir));
            seq.dataset.end = end; seq.dataset.first = i === 0;
            pb.setAttribute("aria-label", t[0] ? "Previous section: " + t[0] : "No previous section");
            nb.setAttribute("aria-label", end ? "Back to top" : "Next section: " + t[2]);
            requestAnimationFrame(() => seq.classList.add("ready"));
        };
        const queue = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(upd); };
        const go = i => { forced = i; i < 0 ? scrollTo({ top: 0 }) : secs[i].scrollIntoView(); if (i < 0) forced = 0; upd(); };
        pb.onclick = () => cur > 0 && go(cur - 1);
        nb.onclick = () => go(cur < secs.length - 1 ? cur + 1 : -1);
        ["wheel", "touchmove", "keydown"].forEach(t => addEventListener(t, () => { forced = -1; }, { passive: true }));
        addEventListener("pointerdown", e => { if (!e.target.closest?.(".seq")) forced = -1; }, { passive: true });
        addEventListener("scroll", queue, { passive: true }); addEventListener("resize", queue); addEventListener("load", queue);
        upd();
    } else seq.remove();

    /* header + menu */
    const top = $(".top"), burger = $(".burger"), menu = $("#menu"), behind = $$(".shell,footer,.seq");
    const onScroll = () => top.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const setMenu = o => {
        document.body.classList.toggle("menu-open", o); behind.forEach(el => (el.inert = o));
        burger.setAttribute("aria-expanded", o); burger.setAttribute("aria-label", o ? "Close menu" : "Open menu");
    };
    burger.onclick = () => setMenu(!document.body.classList.contains("menu-open"));
    menu.addEventListener("click", e => { if (e.target.closest("a:not([data-copy])")) setMenu(false); });
    addEventListener("keydown", e => { if (e.key === "Escape" && !lb.open) setMenu(false); });
    matchMedia("(min-width:861px)").addEventListener("change", e => e.matches && setMenu(false));
})();
