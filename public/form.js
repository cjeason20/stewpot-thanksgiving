(() => {
  const API = "/.netlify/functions";
  // EmailJS — same account, service and client template as the intake form.
  // The template must have "To Email" = {{to_email}} and use {{subject}} / {{message}}.
  const EJS = { publicKey: "I1vXCOCxiey4n_sN2", serviceId: "service_el38inc", templateId: "template_slosb0f" };
  try { window.emailjs?.init({ publicKey: EJS.publicKey }); } catch {}
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const form = $("#form");
  let data = null;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Food icon (symbol in index.html) and pan-filling colour for each dish.
  const ICONS = {
    "sweet-tea": ["i-tea"], "cornbread": ["i-muffin"], "rolls": ["i-roll"],
    "cranberry-sauce": ["i-cranberry"], "sweet-potato-pie": ["i-pie"],
    "candied-yams": ["i-pan", "#d9622b"], "potato-salad": ["i-pan", "#eadba0"],
    "collard-greens": ["i-pan", "#3f6b2e"], "green-beans": ["i-pan", "#6f9a3a"],
    "black-eyed-peas": ["i-pan", "#c7b085"], "mac-and-cheese": ["i-pan", "#f0b93a"],
  };
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

    // Group option only while group slots remain and at least 2 people can still fit.
    const groupInput = $('input[name=signupType][value=group]');
    const canGroup = data.groupsLeft > 0 && data.spotsLeft >= 2;
    groupInput.disabled = !canGroup;
    $("#group-choice").classList.toggle("disabled", !canGroup);
    $("#group-choice-note").textContent = !data.groupsLeft
      ? "All group spots are filled — individual sign-ups are still open"
      : data.spotsLeft < 2
        ? "Only 1 spot left — individual sign-ups only"
        : `Up to ${Math.min(ev.maxGroupSize, data.spotsLeft)} people · ${data.groupsLeft} of ${ev.maxGroups} group spots left`;
    if (!canGroup && groupInput.checked) { groupInput.checked = false; onTypeChange(); }

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
      const [icon, color] = ICONS[d.id] || ["i-pan", "#c9844a"];
      return `<label class="dish${full ? " full" : ""}">
        <input type="radio" name="dishId" value="${d.id}"${full ? " disabled" : ""}>
        <span><svg class="icon" aria-hidden="true" style="color:${color}"><use href="#${icon}"/></svg><b>${esc(d.name)}</b>
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
      groupName: f.groupName.value,
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
      const ev = data.event;
      const who = p.signupType === "group" ? `Your group of ${out.summary.headcount} is` : "You're";
      $("#done-text").textContent = `${who} confirmed to serve, and you're bringing ${out.summary.dish}.`;
      $("#done-time").textContent = ev.arrival;
      $("#done-date").textContent = ev.dateLabel;
      $("#done-address").textContent = ev.address.join(", ");
      $("#done-map").href = ev.mapUrl;
      $("#done-parking").textContent = ev.parking;
      $("#done-arrival").textContent = ev.arrivalNote;
      $("#done-phone").textContent = ev.phone;
      $("#done-phone").href = "tel:" + ev.phone.replace(/\D/g, "");
      $("#done").hidden = false; $("#done").focus();
      sendConfirmation(p, out.summary).then((ok) => {
        const el = $("#done-email");
        el.hidden = false;
        el.textContent = ok
          ? `A confirmation email with these details is on its way to ${p.email.trim()}.`
          : "We couldn't send your confirmation email, but your sign-up is saved. Please screenshot or save this page for the details below.";
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });

  // Confirmation email via EmailJS (plain text, like the intake form's client email).
  async function sendConfirmation(p, summary) {
    if (!window.emailjs) return false;
    const ev = data.event;
    const group = p.signupType === "group"
      ? `Group: ${p.groupName.trim()} (${summary.headcount} people: ${[`${p.firstName.trim()} ${p.lastName.trim()}`, ...p.members.map((m) => m.trim())].join(", ")})\n`
      : "";
    const duties = p.duties.length ? `Duty preferences: ${p.duties.join(", ")}\n` : "";
    const message =
`Hi ${p.firstName.trim()},

Thank you for signing up to volunteer at ${ev.title}! Here are your details:

Date: ${ev.dateLabel}
Arrive by: ${ev.arrival} (service runs ${ev.serviceWindow})
${group}You're bringing: ${summary.dish}, warm and ready to serve
${duties}
WHERE TO GO
${ev.address.join("\n")}
Map: ${ev.mapUrl}

PARKING
${ev.parking}

${ev.arrivalNote} If you have any questions in the meantime or need assistance when you arrive, please call ${ev.phone}.

If your plans change, please call us so we can offer your spot to someone else.

With gratitude,
Stewpot Community Services`;
    try {
      await window.emailjs.send(EJS.serviceId, EJS.templateId, {
        to_email: p.email.trim(),
        to_name: p.firstName.trim(),
        subject: `Your seat at the table is saved: Stewpot Thanksgiving, ${ev.dateLabel}`,
        message,
      });
      return true;
    } catch (err) {
      console.warn("Confirmation email failed:", err);
      return false;
    }
  }

  load().catch(() => { $("#loading").hidden = true; $("#load-error").hidden = false; });
})();
