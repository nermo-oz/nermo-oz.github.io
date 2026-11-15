(() => {
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* hover notes */
    const pop = Object.assign(document.createElement("div"), { className: "pop" });
    pop.id = "pop"; pop.setAttribute("role", "tooltip"); document.body.append(pop);
    let mute = false, tip = null, lx = 0, ly = 0;
    const place = (x, y) => {
        lx = x; ly = y;
        const w = pop.offsetWidth, h = pop.offsetHeight;
        let l = x + 22, t = y + 24;
        if (l + w > innerWidth - 8) l = x - w - 22;
        if (t + h > innerHeight - 8) t = y - h - 20;
        pop.style.left = Math.max(8, l) + "px"; pop.style.top = Math.max(8, t) + "px";
    };
    const show = (el, x, y) => {
        pop.replaceChildren();
        if (el.dataset.img) { const i = new Image(); i.alt = ""; i.onload = () => place(lx, ly); i.src = el.dataset.img; pop.append(i); }
        else { pop.textContent = el.dataset.pop; el.setAttribute("aria-describedby", "pop"); tip = el; }
        pop.style.setProperty("--r", (Math.random() * 4 - 2).toFixed(1) + "deg");
        pop.classList.add("on"); place(x, y);
    };
    const hide = () => { pop.classList.remove("on"); if (tip) { tip.removeAttribute("aria-describedby"); tip = null; } };
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

    /* theme: follows the system until you pick one; remembered afterwards */
    const root = document.documentElement, tbtn = $(".theme"), tmeta = $('meta[name="theme-color"]'); let tm;
    const applyTheme = (t, save) => {
        root.dataset.theme = t;
        tbtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
        tbtn.setAttribute("aria-pressed", t === "dark"); tbtn.dataset.pop = t === "dark" ? "Light theme" : "Dark theme";
        if (tmeta) tmeta.content = t === "dark" ? "#0b0b0b" : "#ffffff";
        if (save) try { localStorage.setItem("theme", t); } catch (e) {}
    };
    applyTheme(root.dataset.theme === "dark" ? "dark" : "light", false);
    tbtn.addEventListener("click", () => {
        if (!reduce) root.classList.add("theming"); applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
        clearTimeout(tm); tm = setTimeout(() => root.classList.remove("theming"), 600);
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
        try { if (localStorage.getItem("theme")) return; } catch (_) {}
        applyTheme(e.matches ? "dark" : "light", false);
    });

    /* copy email + lightbox */
    const toast = $(".toast"), lb = $("#lb"); let tt;
    const say = msg => { toast.textContent = msg; toast.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("on"), 1800); };
    document.addEventListener("click", e => {
        const a = e.target.closest("[data-copy]");
        if (a && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
            e.preventDefault();
            (navigator.clipboard ? navigator.clipboard.writeText(a.dataset.copy) : Promise.reject()).then(
                () => say("Email copied"), () => { location.href = a.href; });
        }
        const b = e.target.closest("[data-lb]");
        if (b) { hide(); lb.setAttribute("aria-label", b.dataset.cap || "Image viewer"); const im = $("img", lb); im.src = b.dataset.lb; im.alt = b.dataset.cap || ""; $(".cap", lb).textContent = b.dataset.cap || ""; lb.showModal(); }
    });
    lb.addEventListener("click", e => { if (e.target === lb || e.target.closest(".x")) lb.close(); });
    lb.addEventListener("close", () => { hide(); mute = true; setTimeout(() => (mute = false), 300); });

    /* reveal on scroll */
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .6 });
    $$("mark,.meter").forEach(el => io.observe(el));

    /* background chemistry: faint chalk doodles, scattered evenly but randomly.
     Seeded by the page path, so a page looks the same on every visit; one kind never repeats beside or above itself. */
    const sprite = $("#chalk-sprite");
    if (sprite) {
        const kinds = $$("symbol", sprite).map(s => ({ id: s.id, w: s.viewBox.baseVal.width, h: s.viewBox.baseVal.height }));
        const layer = Object.assign(document.createElement("div"), { className: "chalk" });
        layer.setAttribute("aria-hidden", "true"); document.body.prepend(layer);
        const seed = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
        const prng = a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
        let drawn = "";
        const scatter = () => {
            const W = layer.clientWidth, H = layer.clientHeight, narrow = W < 700;
            const cell = narrow ? W / 2 : W < 1100 ? 320 : 360, rowH = narrow ? 270 : 330;
            const cols = Math.max(1, Math.round(W / cell)), rows = Math.ceil(H / rowH), cw = W / cols;
            if (!W || !H || drawn === cols + "x" + rows) return; drawn = cols + "x" + rows;
            const rnd = prng(seed(location.pathname) + cols * 7919);
            let bag = [], html = "", above = new Array(cols).fill("");
            const take = avoid => {
                for (let n = 0; n <= kinds.length; n++) {
                    if (!bag.length) { bag = kinds.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
                    const k = bag.pop(); if (!avoid.includes(k.id)) return k; bag.unshift(k);
                }
                return bag.pop();
            };
            for (let r = 0; r < rows; r++) {
                let left = "";
                for (let c = 0; c < cols; c++) {
                    if (rnd() < (narrow ? .5 : .4)) { above[c] = left = ""; continue; }
                    const k = take([above[c], left]); above[c] = left = k.id;
                    let sc = (narrow ? .8 : 1.05) * (.85 + rnd() * .4), w = k.w * sc, h = k.h * sc;
                    if (w > cw * .95) { sc = cw * .95 / k.w; w = k.w * sc; h = k.h * sc; }
                    const x = c * cw + rnd() * (cw - w * .8) - w * .1, y = r * rowH + rnd() * Math.max(0, rowH - h), a = (rnd() - .5) * 20;
                    html += `<svg class="ch" viewBox="0 0 ${k.w} ${k.h}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;transform:rotate(${a.toFixed(1)}deg)" aria-hidden="true"><use href="#${k.id}"/></svg>`;
                }
            }
            layer.innerHTML = html;
        };
        new ResizeObserver(scatter).observe(layer); scatter();
    }

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
            seq.dataset.end = end; seq.dataset.first = i === 0; pb.disabled = i === 0;
            pb.setAttribute("aria-label", t[0] ? "Previous section: " + t[0] : "No previous section");
            nb.setAttribute("aria-label", end ? "Back to top" : "Next section: " + t[2]);
            requestAnimationFrame(() => seq.classList.add("ready"));
        };
        const queue = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(upd); };
        let idle = 0, rest = -1; // rest: where the guide's own scroll came to a stop
        const settle = () => { clearTimeout(idle); rest = -1; idle = setTimeout(() => { rest = scrollY; }, 160); };
        const release = () => { forced = -1; rest = -1; clearTimeout(idle); };
        const onScroll = () => { if (forced >= 0) { if (rest >= 0 && Math.abs(scrollY - rest) > 4) release(); else settle(); } queue(); };
        const go = i => { forced = i; settle(); i < 0 ? scrollTo({ top: 0 }) : secs[i].scrollIntoView(); if (i < 0) forced = 0; upd(); };
        pb.onclick = () => cur > 0 && go(cur - 1);
        nb.onclick = () => go(cur < secs.length - 1 ? cur + 1 : -1);
        ["wheel", "touchmove", "keydown"].forEach(t => addEventListener(t, release, { passive: true }));
        addEventListener("pointerdown", e => { if (!e.target.closest?.(".seq")) release(); }, { passive: true });
        addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", queue); addEventListener("load", queue);
        upd();
    } else seq.remove();

    /* header + menu */
    const header = $(".top"), burger = $(".burger"), menu = $("#menu"), behind = $$(".skip,.shell,footer,.seq");
    const onScroll = () => header.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
    const setMenu = o => {
        if (o) {
            const r = $("svg", burger).getBoundingClientRect();
            menu.style.setProperty("--mx", r.left + r.width / 2 + "px"); menu.style.setProperty("--my", r.top + r.height / 2 + "px");
            menu.scrollTop = 0; hide();
        }
        document.body.style.paddingRight = o ? innerWidth - root.clientWidth + "px" : "";
        document.body.classList.toggle("menu-open", o); behind.forEach(el => (el.inert = o));
        burger.setAttribute("aria-expanded", o); burger.setAttribute("aria-label", o ? "Close menu" : "Open menu");
    };
    burger.onclick = () => setMenu(!document.body.classList.contains("menu-open"));
    menu.addEventListener("click", e => {
        const a = e.target.closest("a:not([data-copy])"); if (!a) return;
        const leaving = !a.hasAttribute("download") && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) && a.href.split("#")[0] !== location.href.split("#")[0];
        if (!leaving) setMenu(false);
    });
    addEventListener("pageshow", e => { if (e.persisted) setMenu(false); });
    addEventListener("keydown", e => { if (e.key === "Escape" && !lb.open && document.body.classList.contains("menu-open")) { setMenu(false); burger.focus(); } });
    matchMedia("(min-width:861px)").addEventListener("change", e => e.matches && setMenu(false));
})();
