(() => {
  const API = "/.netlify/functions";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const form = $("#form");
  let data = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const plural = (n, d) => (n === 1 ? d.unit : d.unitPlural);

  async function load() {
    const res = await fetch(`${API}/availability`, { cache: "no-store" });
    if (!res.ok) throw new Error("load failed");
    data = await res.json();
    render();
  }

  function render() {
    const { event: ev } = data;
    $("#loading").hidden = true;
    $("#f-date").textContent = ev.dateLabel;
    $("#f-time").textContent = ev.serviceWindow;
    $("#f-spots").textContent = `${data.spotsLeft} of ${ev.volunteerCap}`;
    $("#max-group").textContent = ev.maxGroupSize;
    $("#agree-text").textContent = `I'll arrive by ${ev.arrival}, stay through the end of service (${ev.serviceWindow.split("–").pop().trim()}), and bring my dish warm and ready to serve.`;

    // Whole form closes when there are no spots or no dishes left.
    const anyDish = data.dishes.some((d) => d.remaining > 0);
    if (data.closed || !anyDish) { form.hidden = true; $("#closed").hidden = false; return; }
    form.hidden = false;

    // Group option only if at least 2 spots remain.
    const groupInput = $('input[name=signupType][value=group]');
    const canGroup = data.spotsLeft >= 2;
    groupInput.disabled = !canGroup;
    $("#group-choice").classList.toggle("disabled", !canGroup);
    $("#group-choice-note").textContent = canGroup
      ? `Family, congregation, school… up to ${Math.min(ev.maxGroupSize, data.spotsLeft)} people`
      : "Only 1 spot left — individual sign-ups only";
    if (!canGroup && groupInput.checked) { groupInput.checked = false; onTypeChange(); }

    // Group type options (once).
    const gt = form.groupType;
    if (gt.options.length === 1) data.groupTypes.forEach((t) => gt.add(new Option(t, t)));

    // Group size limited by both the group cap and spots left.
    const maxSize = Math.min(ev.maxGroupSize, data.spotsLeft);
    const prevSize = form.groupSize.value;
    form.groupSize.innerHTML = "";
    for (let n = 2; n <= maxSize; n++) form.groupSize.add(new Option(`${n} people`, n));
    if (prevSize && +prevSize <= maxSize) form.groupSize.value = prevSize;
    renderMembers();

    // Duties (once).
    if (!$("#duties").children.length) {
      $("#duties").innerHTML = data.duties.map((d) => `<label><input type="checkbox" name="duties" value="${esc(d)}"> ${esc(d)}</label>`).join("");
    }

    // Dishes — full ones shown but disabled.
    const prevDish = form.querySelector("input[name=dishId]:checked")?.value;
    $("#dishes").innerHTML = data.dishes.map((d) => {
      const full = d.remaining === 0;
      return `<label class="dish${full ? " full" : ""}">
        <input type="radio" name="dishId" value="${d.id}"${full ? " disabled" : ""}>
        <span><b>${esc(d.name)}</b>
        <small class="left">${full ? "Covered — thank you!" : `${d.remaining} ${plural(d.remaining, d)} still needed`}</small></span></label>`;
    }).join("");
    const keep = prevDish && data.dishes.find((d) => d.id === prevDish && d.remaining > 0);
    if (keep) form.querySelector(`input[name=dishId][value="${prevDish}"]`).checked = true;
    onDishChange();
  }

  function onTypeChange() {
    const type = form.querySelector("input[name=signupType]:checked")?.value;
    $$("[data-step]").forEach((s) => (s.hidden = !type));
    const isGroup = type === "group";
    $("#group-fields").hidden = !isGroup;
    $("#contact-title").textContent = isGroup ? "Group leader's contact info" : "Your contact info";
    $("#submit").textContent = isGroup ? "Sign up our group" : "Sign up to volunteer";
  }

  function renderMembers() {
    const n = Math.max(0, (+form.groupSize.value || 2) - 1);
    const box = $("#member-inputs");
    const old = $$("input", box).map((i) => i.value);
    box.innerHTML = Array.from({ length: n }, (_, i) =>
      `<input name="member" aria-label="Group member ${i + 2} full name" placeholder="Person ${i + 2} — full name" value="${esc(old[i] || "")}">`).join("");
  }

  function onDishChange() {
    const id = form.querySelector("input[name=dishId]:checked")?.value;
    const d = data.dishes.find((x) => x.id === id);
    $("#dish-detail").hidden = !d;
    if (!d) return;
    $("#dish-size").innerHTML = `<strong>${esc(d.name)}:</strong> ${esc(d.details)}`;
    const max = Math.min(d.maxPer, d.remaining);
    const prev = +form.dishQty.value || 1;
    form.dishQty.innerHTML = "";
    for (let n = 1; n <= max; n++) form.dishQty.add(new Option(`${n} ${plural(n, d)}`, n));
    form.dishQty.value = Math.min(prev, max);
    $("#dish-left").textContent = `Stewpot needs ${d.needed} ${plural(d.needed, d)} in total; ${d.remaining} still unclaimed.`;
  }

  function collect() {
    const f = form;
    const type = f.querySelector("input[name=signupType]:checked")?.value;
    return {
      signupType: type,
      firstName: f.firstName.value, lastName: f.lastName.value, email: f.email.value, phone: f.phone.value,
      groupName: f.groupName.value, groupType: f.groupType.value, groupTypeOther: f.groupTypeOther.value,
      groupSize: type === "group" ? +f.groupSize.value : 1,
      members: $$("#member-inputs input").map((i) => i.value),
      duties: $$("input[name=duties]:checked").map((i) => i.value),
      dishId: f.querySelector("input[name=dishId]:checked")?.value,
      dishQty: +f.dishQty.value,
      notes: f.notes.value, agree: f.agree.checked, website: f.website.value,
    };
  }

  // Client-side checks, returning the first problem + the field to focus.
  function validate(p) {
    const f = form;
    const req = (el, msg) => (!el.value.trim() ? [msg, el] : null);
    const checks = [
      () => !p.signupType && ["Choose “Just me” or “A group.”", form.querySelector("input[name=signupType]")],
      () => req(f.firstName, "Enter your first name."),
      () => req(f.lastName, "Enter your last name."),
      () => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()) && ["Enter a valid email address.", f.email],
      () => f.phone.value.replace(/\D/g, "").length < 10 && ["Enter a phone number with area code.", f.phone],
      ...(p.signupType === "group" ? [
        () => req(f.groupName, "Enter your group's name."),
        () => req(f.groupType, "Choose what kind of group you are."),
        () => p.groupType === "Other" && req(f.groupTypeOther, "Tell us what kind of group you are."),
        () => { const e = $$("#member-inputs input").find((i) => !i.value.trim()); return e && ["Enter the name of each person in your group.", e]; },
      ] : []),
      () => !p.dishId && ["Pick a dish to bring.", $("#dishes")],
      () => !p.agree && ["Please confirm the arrival time and dish instructions.", f.agree],
    ];
    for (const c of checks) { const r = c(); if (r) return r; }
    return null;
  }

  function showError(msg, el) {
    const box = $("#form-error");
    box.textContent = msg; box.hidden = !msg;
    $$(".invalid").forEach((x) => x.classList.remove("invalid"));
    if (el) {
      if (el.matches?.("input:not([type=radio]):not([type=checkbox]), select, textarea")) el.classList.add("invalid");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus?.({ preventScroll: true });
    }
  }

  form.addEventListener("change", (e) => {
    const n = e.target.name;
    if (n === "signupType") onTypeChange();
    if (n === "groupSize") renderMembers();
    if (n === "groupType") $("#group-other").hidden = e.target.value !== "Other";
    if (n === "dishId") onDishChange();
  });
  form.addEventListener("input", (e) => e.target.classList.remove("invalid"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = collect();
    const bad = validate(p);
    if (bad) return showError(...bad);
    showError("");
    const btn = $("#submit"); const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const res = await fetch(`${API}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (out.refresh) await load();
        return showError(out.error || "Something went wrong. Please try again.");
      }
      form.hidden = true;
      const who = p.signupType === "group" ? `Your group of ${out.summary.headcount} is` : "You're";
      $("#done-text").textContent = `${who} confirmed to serve, and you're bringing ${out.summary.dish}.`;
      $("#done-time").textContent = data.event.arrival;
      $("#done-date").textContent = data.event.dateLabel;
      $("#done").hidden = false; $("#done").focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });

  load().catch(() => { $("#loading").hidden = true; $("#load-error").hidden = false; });
})();
