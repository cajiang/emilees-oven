/* ============================================================
   Emilees Oven — app.js
   Shared front-end logic: reservation cart, floating tray,
   reservation form modal, confirmation, and the SINGLE
   swappable submission integration point.

   Orders + contact messages are POSTed to a Google Apps Script
   Web App (which appends a row to a Google Sheet). No email is
   used anywhere in this flow.
   ============================================================ */
(function () {
  "use strict";

  var CART_KEY = "emileesoven.cart.v1";

  /* ----- real payment handles (no email) ----- */
  var PAYMENT = {
    venmo: "@emileegroff",
    paypal: "@emilee1264",
    cash: "exact cash only (can not break bills at this time)"
  };

  /* =========================================================
     ONE swappable integration point.
     Everything that "submits" an order or a contact message
     goes through submitToSheet(). Point GOOGLE_SCRIPT_URL at a
     deployed Apps Script Web App (see orders-apps-script.gs +
     ORDER-INTAKE-SETUP.md) and both flows work with no other
     code changes.
     ========================================================= */
  var GOOGLE_SCRIPT_URL = "PLACEHOLDER-apps-script-url"; // SWAP: your deployed Apps Script /exec URL
  var FORM_TOKEN = "emilees-oven-orders"; // light spam guard, checked (optionally) by the Apps Script

  // Low-level POST to the Apps Script Web App.
  // Apps Script Web Apps don't do a CORS preflight and don't expose a
  // readable CORS response to the page, so this uses a CORS-safe "simple
  // request" (text/plain body, no custom headers that would trigger a
  // preflight) and treats a resolved fetch (no thrown network error) as
  // success — the response body itself is not read.
  function submitToSheet(body) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf("PLACEHOLDER") === 0) {
      try {
        console.info("[Emilees Oven] submitToSheet() — placeholder Apps Script URL, not sending. Payload:", body);
      } catch (e) {}
      return Promise.reject({ ok: false, mode: "placeholder-url", payload: body });
    }

    return fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }).then(function () {
      return { ok: true, mode: "sheet", payload: body };
    }).catch(function (err) {
      try {
        console.warn("[Emilees Oven] submitToSheet() — send failed.", err);
      } catch (e) {}
      throw { ok: false, mode: "network-error", payload: body };
    });
  }

  // { reservationId, createdAt, customer:{name,email,phone,note}, items:[{id,name,qty,price,lineTotal}], total, currency }
  function submitReservation(payload) {
    return submitToSheet({
      type: "order",
      token: FORM_TOKEN,
      reservationId: payload.reservationId,
      createdAt: payload.createdAt,
      customer: payload.customer,
      items: payload.items,
      total: payload.total,
      currency: payload.currency
    });
  }

  // { name, email (optional), message }
  function submitContactMessage(payload) {
    return submitToSheet({
      type: "message",
      token: FORM_TOKEN,
      createdAt: new Date().toISOString(),
      customer: { name: payload.name, email: payload.email || "" },
      message: payload.message
    });
  }

  /* ----- expose for manual testing / future wiring ----- */
  window.EmileesOven = window.EmileesOven || {};
  window.EmileesOven.submitReservation = submitReservation;
  window.EmileesOven.submitMessage = submitContactMessage;

  /* ================= cart storage ================= */
  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function writeCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    renderCartUI();
  }
  function clearCart() { writeCart([]); }

  function cartCount() {
    return readCart().reduce(function (n, it) { return n + it.qty; }, 0);
  }
  function cartHasTBD() {
    return readCart().some(function (it) { return it.price === null || it.price === undefined; });
  }
  function cartTotal() {
    // Sums only priced lines. When any line is Price TBD, use cartTotalLabel()
    // for display instead of this raw number.
    return readCart().reduce(function (s, it) {
      return s + it.qty * (typeof it.price === "number" ? it.price : 0);
    }, 0);
  }
  function cartTotalLabel() {
    return cartHasTBD() ? "Price TBD" : money(cartTotal());
  }
  function lineTotalLabel(it) {
    return typeof it.price === "number" ? money(it.qty * it.price) : "Price TBD";
  }

  /* add / set quantity for a product line.
     item = {id,name,price}, qty = desired quantity (absolute) */
  function setLineQty(item, qty) {
    var cart = readCart();
    var found = cart.filter(function (c) { return c.id === item.id; })[0];
    qty = Math.max(0, qty | 0);
    if (found) {
      if (qty === 0) {
        cart = cart.filter(function (c) { return c.id !== item.id; });
      } else {
        found.qty = qty; found.name = item.name; found.price = item.price;
      }
    } else if (qty > 0) {
      cart.push({ id: item.id, name: item.name, price: item.price, qty: qty });
    }
    writeCart(cart);
  }
  function addToCart(item, qty) {
    var cart = readCart();
    var found = cart.filter(function (c) { return c.id === item.id; })[0];
    var current = found ? found.qty : 0;
    setLineQty(item, current + (qty | 0));
  }

  window.EmileesOven.cart = {
    read: readCart, add: addToCart, setLineQty: setLineQty,
    clear: clearCart, count: cartCount, total: cartTotal,
    totalLabel: cartTotalLabel, hasTBD: cartHasTBD, lineTotalLabel: lineTotalLabel
  };

  /* ================= money helper ================= */
  function money(n) { return "$" + Number(n).toFixed(2); }
  window.EmileesOven.money = money;

  /* ================= UI: nav count + tray ================= */
  function renderCartUI() {
    var count = cartCount();
    // nav badge(s)
    var badges = document.querySelectorAll("[data-cart-count]");
    Array.prototype.forEach.call(badges, function (b) {
      b.textContent = count;
      b.hidden = count === 0;
    });
    // floating tray (present only on products page)
    var tray = document.getElementById("reserve-tray");
    if (tray) {
      var summary = tray.querySelector("[data-tray-summary]");
      if (summary) {
        summary.innerHTML = count === 0
          ? "No items selected yet."
          : "<strong>" + count + "</strong> item" + (count === 1 ? "" : "s") +
            " selected · " + cartTotalLabel();
      }
      tray.classList.toggle("open", count > 0);
      var btn = tray.querySelector("[data-open-reserve]");
      if (btn) btn.disabled = count === 0;
    }
  }
  window.EmileesOven.renderCartUI = renderCartUI;

  /* ================= modal helpers ================= */
  function getModal() { return document.getElementById("reserve-modal"); }
  function openModal() {
    var m = getModal(); if (!m) return;
    m.hidden = false;
    document.body.style.overflow = "hidden";
    var first = m.querySelector("input, button, textarea");
    if (first) first.focus();
  }
  function closeModal() {
    var m = getModal(); if (!m) return;
    m.hidden = true;
    document.body.style.overflow = "";
  }

  /* build the form view inside the modal */
  function renderReservationForm() {
    var m = getModal(); if (!m) return;
    var body = m.querySelector("[data-modal-body]");
    var cart = readCart();
    if (cart.length === 0) { closeModal(); return; }

    var lines = cart.map(function (it) {
      return '<li><span>' + escapeHtml(it.name) + ' &times; ' + it.qty +
             '</span><span>' + lineTotalLabel(it) + '</span></li>';
    }).join("");

    body.innerHTML =
      '<button class="modal-close" type="button" data-close aria-label="Close">&times;</button>' +
      '<h2>Reserve your cookies</h2>' +
      '<p class="modal-sub">Emilee bakes limited batches. Reserving lets her set your cookies aside — you’ll arrange pickup &amp; payment with her directly.</p>' +
      '<ul class="order-lines">' + lines +
        '<li class="order-total"><span>Total</span><span>' + cartTotalLabel() + '</span></li>' +
      '</ul>' +
      '<form id="reserve-form" novalidate>' +
        '<div class="field">' +
          '<label for="rf-name">Your name <span class="req">*</span></label>' +
          '<input id="rf-name" name="name" type="text" autocomplete="name" required>' +
          '<div class="field-error" data-err="name" hidden>Please enter your name.</div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="rf-email">Email</label>' +
          '<input id="rf-email" name="email" type="email" autocomplete="email" inputmode="email">' +
        '</div>' +
        '<div class="field">' +
          '<label for="rf-phone">Phone</label>' +
          '<input id="rf-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel">' +
          '<div class="hint">Give an email and/or a phone number so Emilee can confirm.</div>' +
          '<div class="field-error" data-err="contact" hidden>Please provide an email or a phone number.</div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="rf-note">Note for Emilee (optional)</label>' +
          '<textarea id="rf-note" name="note" rows="3" placeholder="Pickup day, allergies, a special request..."></textarea>' +
        '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">' +
          '<button class="btn" type="submit">Send reservation</button>' +
          '<button class="btn btn-secondary" type="button" data-close>Keep browsing</button>' +
        '</div>' +
        '<p class="mock-flag">Nothing is charged now. Emilee will confirm availability and arrange payment with you directly.</p>' +
      '</form>';

    body.querySelector("#reserve-form").addEventListener("submit", onReserveSubmit);
  }

  function onReserveSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var note = form.note.value.trim();

    var ok = true;
    var nameErr = form.querySelector('[data-err="name"]');
    var contactErr = form.querySelector('[data-err="contact"]');
    nameErr.hidden = true; contactErr.hidden = true;

    if (!name) { nameErr.hidden = false; ok = false; }
    if (!email && !phone) { contactErr.hidden = false; ok = false; }
    if (!ok) { return; }

    var cart = readCart();
    var items = cart.map(function (it) {
      var priced = typeof it.price === "number";
      return { id: it.id, name: it.name, qty: it.qty, price: it.price,
               lineTotal: priced ? +(it.qty * it.price).toFixed(2) : null };
    });
    var hasTBD = cartHasTBD();

    var payload = {
      reservationId: "EO-" + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      customer: { name: name, email: email, phone: phone, note: note },
      items: items,
      total: hasTBD ? null : +cartTotal().toFixed(2),
      currency: "USD"
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "Sending...";

    Promise.resolve(submitReservation(payload))
      .then(function () { showConfirmation(payload); clearCart(); })
      .catch(function () { showSubmitError(payload); });
  }

  function showConfirmation(payload) {
    var m = getModal(); if (!m) return;
    var body = m.querySelector("[data-modal-body]");

    var lines = payload.items.map(function (it) {
      return '<li><span>' + escapeHtml(it.name) + ' &times; ' + it.qty +
             '</span><span>' + (typeof it.lineTotal === "number" ? money(it.lineTotal) : "Price TBD") + '</span></li>';
    }).join("");

    var totalLabel = typeof payload.total === "number" ? money(payload.total) : "Price TBD";

    body.innerHTML =
      '<button class="modal-close" type="button" data-close aria-label="Close">&times;</button>' +
      '<div class="confirm-check" aria-hidden="true">🍪</div>' +
      '<h2 style="text-align:center;">Reservation sent!</h2>' +
      '<p class="modal-sub" style="text-align:center;">Reservation ' + escapeHtml(payload.reservationId) +
        ' for <strong>' + escapeHtml(payload.customer.name) + '</strong></p>' +
      '<ul class="order-lines">' + lines +
        '<li class="order-total"><span>Total</span><span>' + totalLabel + '</span></li>' +
      '</ul>' +
      (payload.total === null
        ? '<p class="mock-flag" style="margin:-10px 0 14px;">Pricing isn’t set yet — Emilee will confirm the price when she confirms your batch.</p>'
        : '') +
      '<div class="pay-box">' +
        '<h3>How payment will work</h3>' +
        '<p style="margin:0 0 8px;">Payment is due at delivery. Tips are appreciated, not required.</p>' +
        '<p style="margin:0;">Venmo: <code>' + escapeHtml(PAYMENT.venmo) + '</code><br>' +
        'PayPal: <code>' + escapeHtml(PAYMENT.paypal) + '</code><br>' +
        'Cash: ' + escapeHtml(PAYMENT.cash) + '</p>' +
      '</div>' +
      '<p style="font-size:14px;color:var(--ink-soft);">Emilee has your reservation and will confirm availability with you directly.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button class="btn" type="button" data-close>Done</button>' +
      '</div>';
  }

  function showSubmitError(payload) {
    var m = getModal(); if (!m) return;
    var body = m.querySelector("[data-modal-body]");

    body.innerHTML =
      '<button class="modal-close" type="button" data-close aria-label="Close">&times;</button>' +
      '<h2>Couldn’t submit reservation</h2>' +
      '<p class="modal-sub">Something went wrong sending your reservation. Please check your connection and try again — your items are still saved.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">' +
        '<button class="btn" type="button" data-close>Try again</button>' +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ================= wiring ================= */
  function wireGlobalEvents() {
    // open reservation from tray
    document.addEventListener("click", function (e) {
      var openBtn = e.target.closest ? e.target.closest("[data-open-reserve]") : null;
      if (openBtn) { renderReservationForm(); openModal(); return; }
      var closeBtn = e.target.closest ? e.target.closest("[data-close]") : null;
      if (closeBtn) { closeModal(); return; }
      // click on overlay backdrop closes
      if (e.target && e.target.id === "reserve-modal") { closeModal(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
    // sync across tabs/pages
    window.addEventListener("storage", function (e) {
      if (e.key === CART_KEY) renderCartUI();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireGlobalEvents();
    renderCartUI();
  });
})();
