/* ============================================================
   Emilees Oven — app.js
   Shared front-end logic: reservation cart, floating tray,
   reservation form modal, confirmation, and the SINGLE
   swappable submission integration point.

   No frameworks. No network calls except optional mailto.
   Nothing is transmitted to any server in v1.
   ============================================================ */
(function () {
  "use strict";

  var CART_KEY = "emileesoven.cart.v1";

  /* ----- placeholder handles the owner must replace (see HOW-TO-UPDATE.md) ----- */
  var PAYMENT = {
    zelle: "PLACEHOLDER-zelle@example.com",   // TODO(owner): replace with real Zelle email/phone
    venmo: "@PLACEHOLDER-Emilees-Oven",        // TODO(owner): replace with real Venmo handle
    notifyEmail: "hello@example.com"           // TODO(owner): where a reservation email should go (fallback mailto)
  };

  /* =========================================================
     ONE swappable integration point.
     Everything that "submits" a reservation goes through here.
     To wire a real backend later (Airtable / Notion / email /
     serverless function), replace the body of this function.
     The rest of the site does not need to change.
     ========================================================= */
  function submitReservation(payload) {
    // Sends the reservation to the baker's email via Web3Forms (free, no
    // backend needed). Until a real access key is set below, this rejects
    // on purpose so the caller falls back to the local confirmation +
    // mailto path — nothing is transmitted anywhere pre-key.
    //
    //   { reservationId, createdAt, customer:{name,email,phone,note}, items:[{id,name,qty,price,lineTotal}], total, currency }

    var WEB3FORMS_ACCESS_KEY = "PLACEHOLDER-web3forms-access-key"; // SWAP: get a free key at web3forms.com (tied to the baker's email)

    if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY.indexOf("PLACEHOLDER") === 0) {
      try {
        console.info("[Emilees Oven] submitReservation() — placeholder Web3Forms key, using local fallback. Payload:", payload);
      } catch (e) {}
      return Promise.reject({ ok: false, mode: "placeholder-key", payload: payload });
    }

    var itemLines = payload.items.map(function (it) {
      return "  - " + it.name + " x " + it.qty + " (" + money(it.lineTotal) + ")";
    }).join("\n");

    var message =
      "New cookie reservation " + payload.reservationId + "\n\n" +
      itemLines +
      "\n\nTotal: " + money(payload.total) + " " + payload.currency +
      "\n\nCustomer: " + payload.customer.name +
      "\nEmail: " + (payload.customer.email || "-") +
      "\nPhone: " + (payload.customer.phone || "-") +
      "\nNote: " + (payload.customer.note || "-") +
      "\n\nReservation ref: " + payload.reservationId +
      "\nSubmitted: " + payload.createdAt;

    var body = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: "New cookie reservation " + payload.reservationId,
      from_name: "Emilees Oven website",
      name: payload.customer.name,
      email: payload.customer.email || "not provided",
      phone: payload.customer.phone || "not provided",
      message: message
    };

    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok || !data || data.success === false) {
          throw new Error("Web3Forms submission failed");
        }
        return { ok: true, mode: "web3forms", payload: payload };
      });
    }).catch(function (err) {
      try {
        console.warn("[Emilees Oven] submitReservation() — Web3Forms send failed, using local fallback.", err);
      } catch (e) {}
      throw { ok: false, mode: "network-error", payload: payload };
    });
  }

  /* ----- expose for manual testing / future wiring ----- */
  window.EmileesOven = window.EmileesOven || {};
  window.EmileesOven.submitReservation = submitReservation;

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
  function cartTotal() {
    return readCart().reduce(function (s, it) { return s + it.qty * it.price; }, 0);
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
    clear: clearCart, count: cartCount, total: cartTotal
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
            " selected · " + money(cartTotal());
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
             '</span><span>' + money(it.qty * it.price) + '</span></li>';
    }).join("");

    body.innerHTML =
      '<button class="modal-close" type="button" data-close aria-label="Close">&times;</button>' +
      '<h2>Reserve your cookies</h2>' +
      '<p class="modal-sub">Emilee bakes limited batches. Reserving lets her set your cookies aside — you’ll arrange pickup &amp; payment with her directly.</p>' +
      '<ul class="order-lines">' + lines +
        '<li class="order-total"><span>Total</span><span>' + money(cartTotal()) + '</span></li>' +
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
        '<p class="mock-flag">Nothing is charged now. This v1 site does not send data anywhere yet — see the confirmation for details.</p>' +
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
      return { id: it.id, name: it.name, qty: it.qty, price: it.price,
               lineTotal: +(it.qty * it.price).toFixed(2) };
    });

    var payload = {
      reservationId: "EO-" + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      customer: { name: name, email: email, phone: phone, note: note },
      items: items,
      total: +cartTotal().toFixed(2),
      currency: "USD"
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "Sending...";

    Promise.resolve(submitReservation(payload))
      .then(function () { showConfirmation(payload); clearCart(); })
      .catch(function () { showConfirmation(payload, true); clearCart(); });
  }

  function showConfirmation(payload, degraded) {
    var m = getModal(); if (!m) return;
    var body = m.querySelector("[data-modal-body]");

    var lines = payload.items.map(function (it) {
      return '<li><span>' + escapeHtml(it.name) + ' &times; ' + it.qty +
             '</span><span>' + money(it.lineTotal) + '</span></li>';
    }).join("");

    var mailto = buildMailto(payload);

    body.innerHTML =
      '<button class="modal-close" type="button" data-close aria-label="Close">&times;</button>' +
      '<div class="confirm-check" aria-hidden="true">🍪</div>' +
      '<h2 style="text-align:center;">Reservation ready!</h2>' +
      '<p class="modal-sub" style="text-align:center;">Reservation ' + escapeHtml(payload.reservationId) +
        ' for <strong>' + escapeHtml(payload.customer.name) + '</strong></p>' +
      '<ul class="order-lines">' + lines +
        '<li class="order-total"><span>Total</span><span>' + money(payload.total) + '</span></li>' +
      '</ul>' +
      '<div class="pay-box">' +
        '<span class="wip">Work in progress</span>' +
        '<h3>How payment will work</h3>' +
        '<p style="margin:0 0 8px;">Payment is arranged with Emilee directly — nothing is charged here. Once these handles are set, you’ll send payment after she confirms your batch:</p>' +
        '<p style="margin:0;">Zelle: <code>' + escapeHtml(PAYMENT.zelle) + '</code><br>' +
        'Venmo: <code>' + escapeHtml(PAYMENT.venmo) + '</code></p>' +
        '<p style="margin:8px 0 0;font-size:12px;">(Placeholder handles — the bakery will replace these before launch.)</p>' +
      '</div>' +
      '<p style="font-size:14px;color:var(--ink-soft);">' +
        (degraded ? "We couldn’t reach the notification service, so " : "This v1 site doesn’t send messages automatically yet, so ") +
        'please confirm your reservation with Emilee. You can send the details as an email:</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<a class="btn" href="' + mailto + '">Email these details</a>' +
        '<button class="btn btn-secondary" type="button" data-close>Done</button>' +
      '</div>' +
      '<p class="mock-flag">Developer note: reservation captured locally only. See <code>submitReservation()</code> in app.js to wire a real backend/notification.</p>';
  }

  function buildMailto(payload) {
    var lines = payload.items.map(function (it) {
      return "  - " + it.name + " x " + it.qty + " (" + money(it.lineTotal) + ")";
    }).join("\n");
    var body =
      "Hi Emilee, I'd like to reserve:\n\n" + lines +
      "\n\nTotal: " + money(payload.total) +
      "\n\nName: " + payload.customer.name +
      "\nEmail: " + (payload.customer.email || "-") +
      "\nPhone: " + (payload.customer.phone || "-") +
      "\nNote: " + (payload.customer.note || "-") +
      "\n\nReservation ref: " + payload.reservationId;
    return "mailto:" + encodeURIComponent(PAYMENT.notifyEmail) +
      "?subject=" + encodeURIComponent("Cookie reservation " + payload.reservationId) +
      "&body=" + encodeURIComponent(body);
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
