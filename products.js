/* ============================================================
   Emilees Oven — products.js
   Fetches products.json and renders product cards on
   products.html. Uses the shared cart in app.js.

   Each product has one or more pack-size "options" (e.g. Half
   dozen / Dozen). Customers pick an option, choose how many of
   that pack to reserve, and add it — the cart line carries the
   chosen pack's label and price (or null while price is TBD).

   NOTE: browsers block fetch() of local files when a page is
   opened directly with the file:// protocol. If that happens
   we show a friendly notice explaining how to preview locally.
   When the site is served over http(s) (a tiny local server or
   real hosting) it just works. Editing products.json is the
   only step needed to change the catalog.
   ============================================================ */
(function () {
  "use strict";

  var EO = window.EmileesOven;
  var mount = document.getElementById("product-list");
  if (!mount) return;

  // max total packs (sum of quantities) allowed per reservation — sourced
  // from app.js's single constant, with a same-value fallback if app.js
  // hasn't set it for some reason.
  var MAX_ITEMS = (EO && typeof EO.MAX_ITEMS === "number") ? EO.MAX_ITEMS : 2;

  // Update the on-page menu note to state the 2-item rule with an example
  // (this script runs after the DOM has parsed, since it's loaded at the
  // end of <body>).
  var menuNoteEl = document.querySelector(".menu-note");
  if (menuNoteEl) {
    menuNoteEl.textContent = "You can reserve up to 2 items per order — mix any two " +
      "(e.g. a dozen cookies + an 8-pack of scones, or 2 variety boxes).";
  }

  function priceLabel(price) {
    return typeof price === "number" ? (EO ? EO.money(price) : "$" + Number(price).toFixed(2)) : "Price TBD";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Descriptive alt text for products that have a real photo (keyed by product id).
  var PHOTO_ALT = {
    "cranberry-orange-scones": "Cranberry orange scones on a wooden board",
    "pumpkin-spice-cream-pies": "Pumpkin spice oatmeal cream pies stacked on a board"
  };

  function notice(html) {
    mount.innerHTML =
      '<div class="card" style="grid-column:1/-1;">' + html + '</div>';
  }

  fetch("products.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      render(data.products || []);
    })
    .catch(function (err) {
      if (location.protocol === "file:") {
        notice(
          '<h2 class="script">Just one small step to preview</h2>' +
          '<p>Your browser won’t load <code>products.json</code> when this page is opened directly from a file. ' +
          'Serve the <code>site</code> folder over a tiny local web server and reload:</p>' +
          '<p style="font-size:14px;background:var(--warn-bg);border:1px dashed var(--warn-border);' +
          'border-radius:10px;padding:10px 12px;color:var(--warn-text);">' +
          'In the <code>site</code> folder run: <code>python -m http.server</code> ' +
          'then open <code>http://localhost:8000/products.html</code></p>' +
          '<p style="font-size:13px;color:var(--ink-faint);">Once the site is hosted for real, this happens automatically — customers never see this.</p>'
        );
      } else {
        notice('<h2 class="script">Couldn’t load the menu</h2><p>Please refresh the page. (' +
          escapeHtml(err.message) + ')</p>');
      }
    });

  function render(products) {
    if (!products.length) {
      notice('<h2 class="script">No cookies listed yet</h2><p>Check back soon!</p>');
      return;
    }
    mount.innerHTML = "";
    products.forEach(function (p) {
      mount.appendChild(card(p));
    });
    if (EO) EO.renderCartUI();
  }

  function allergenBlock(p) {
    var allergens = Array.isArray(p.allergens) ? p.allergens : [];
    if (p.allergensTBD) {
      if (allergens.length) {
        return '<div class="allergen-flag"><span class="warn-ico" aria-hidden="true">⚠️</span>' +
          '<span><strong>Allergens:</strong> ' + escapeHtml(allergens.join(", ")) + '. ' +
          escapeHtml(p.allergensNote || "Additional item(s) TBD — check with baker.") + '</span></div>';
      }
      return '<div class="allergen-flag"><span class="warn-ico" aria-hidden="true">⚠️</span>' +
        '<span><strong>Allergens:</strong> check with baker (TBD)</span></div>';
    }
    return allergens.length
      ? '<div class="allergen-flag"><span class="warn-ico" aria-hidden="true">⚠️</span>' +
        '<span><strong>Allergens:</strong> ' + escapeHtml(allergens.join(", ")) + '</span></div>'
      : '<div class="allergen-none">No allergens listed — always confirm with Emilee if you have a serious allergy.</div>';
  }

  function photoBlock(p) {
    if (p.image) {
      var alt = PHOTO_ALT[p.id] || (p.name + " photo");
      return '<img class="product-photo" src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(alt) + '" loading="lazy">';
    }
    return '<div class="product-photo" role="img" aria-label="Placeholder photo of ' +
        escapeHtml(p.name) + ' (real photo coming soon)">' +
        '<span class="photo-tag">' + escapeHtml(p.imagePlaceholderLabel || p.name) + '<br><small style="font-family:var(--font-body);font-size:11px;letter-spacing:.05em;">photo coming soon</small></span>' +
      '</div>';
  }

  function card(p) {
    var options = Array.isArray(p.options) && p.options.length ? p.options : [{ id: "default", label: p.name, count: 1, price: null }];
    var selected = 0;

    var el = document.createElement("article");
    el.className = "card product-card";

    el.innerHTML =
      photoBlock(p) +
      '<div class="product-body">' +
        '<h3 class="product-name">' + escapeHtml(p.name) + '</h3>' +
        '<div class="pack-selector" data-pack-selector role="group" aria-label="Pack size for ' + escapeHtml(p.name) + '"></div>' +
        '<div class="product-price-row">' +
          '<span class="product-price" data-price>' + priceLabel(options[0].price) + '</span>' +
        '</div>' +
        '<p class="product-desc">' + escapeHtml(p.description || "") + '</p>' +
        allergenBlock(p) +
      '</div>';

    var priceEl = el.querySelector("[data-price]");
    var selectorEl = el.querySelector("[data-pack-selector]");

    function selectOption(idx) {
      selected = idx;
      priceEl.textContent = priceLabel(options[selected].price);
      var btns = selectorEl.querySelectorAll("[data-opt]");
      Array.prototype.forEach.call(btns, function (b) {
        var isSel = parseInt(b.getAttribute("data-opt"), 10) === idx;
        b.classList.toggle("is-selected", isSel);
        b.setAttribute("aria-pressed", isSel ? "true" : "false");
      });
    }

    if (options.length > 1) {
      options.forEach(function (opt, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pack-btn";
        btn.setAttribute("data-opt", idx);
        btn.setAttribute("aria-pressed", idx === 0 ? "true" : "false");
        btn.textContent = opt.label;
        btn.addEventListener("click", function () { selectOption(idx); });
        selectorEl.appendChild(btn);
      });
      selectOption(0);
    } else {
      selectorEl.innerHTML = '<span class="pack-single">' + escapeHtml(options[0].label) + '</span>';
    }

    // add-to-reservation row
    var addRow = document.createElement("div");
    addRow.className = "add-row";
    addRow.style.padding = "0 20px 20px";

    var maxQty = MAX_ITEMS; // a single order can never need more than the 2-item cap
    addRow.innerHTML =
      '<div class="qty-picker" role="group" aria-label="Number of packs for ' + escapeHtml(p.name) + '">' +
        '<button type="button" data-step="-1" aria-label="Decrease quantity">−</button>' +
        '<input type="number" min="1" max="' + maxQty + '" value="1" ' +
          'aria-label="Number of packs for ' + escapeHtml(p.name) + '">' +
        '<button type="button" data-step="1" aria-label="Increase quantity">+</button>' +
      '</div>' +
      '<button class="btn btn-small" type="button" data-add>Add to reservation</button>' +
      '<p class="limit-msg" data-add-msg hidden></p>';

    var input = addRow.querySelector("input");
    var minus = addRow.querySelector('[data-step="-1"]');
    var plus = addRow.querySelector('[data-step="1"]');
    var addMsgTimer = null;

    function clamp() {
      var v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (v > maxQty) v = maxQty;
      input.value = v;
      minus.disabled = v <= 1;
      plus.disabled = v >= maxQty;
    }
    minus.addEventListener("click", function () { input.value = (parseInt(input.value, 10) || 1) - 1; clamp(); });
    plus.addEventListener("click", function () { input.value = (parseInt(input.value, 10) || 1) + 1; clamp(); });
    input.addEventListener("input", clamp);
    clamp();

    addRow.querySelector("[data-add]").addEventListener("click", function () {
      var btn = this;
      var msgEl = addRow.querySelector("[data-add-msg]");
      var qty = parseInt(input.value, 10) || 1;
      var opt = options[selected];
      var lineId = p.id + "__" + opt.id;
      var lineName = options.length > 1 ? (p.name + " — " + opt.label) : p.name;

      function flashMsg(text) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.hidden = false;
        if (addMsgTimer) clearTimeout(addMsgTimer);
        addMsgTimer = setTimeout(function () { msgEl.hidden = true; }, 3200);
      }

      var currentCount = EO ? EO.cart.count() : 0;
      var remaining = MAX_ITEMS - currentCount;

      if (remaining <= 0) {
        flashMsg("You can reserve up to 2 items per order.");
        return;
      }

      var toAdd = Math.min(qty, remaining);
      if (EO) EO.cart.add({ id: lineId, name: lineName, price: opt.price }, toAdd);

      var orig = btn.textContent;
      btn.textContent = "Added ✓";
      setTimeout(function () { btn.textContent = orig; }, 1100);

      if (toAdd < qty) {
        flashMsg("Added " + toAdd + " — that reaches the 2-item limit per order.");
      } else if (msgEl) {
        msgEl.hidden = true;
      }
    });

    el.appendChild(addRow);
    return el;
  }
})();
