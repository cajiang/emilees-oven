/* ============================================================
   Emilees Oven — products.js
   Fetches products.json and renders product cards on
   products.html. Uses the shared cart in app.js.

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

  function money(n) { return EO ? EO.money(n) : "$" + Number(n).toFixed(2); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

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

  function card(p) {
    var soldOut = !(p.quantityAvailable > 0);
    var el = document.createElement("article");
    el.className = "card product-card";

    var allergens = Array.isArray(p.allergens) ? p.allergens : [];
    var ingredients = Array.isArray(p.ingredients) ? p.ingredients : [];

    var allergenBlock = allergens.length
      ? '<div class="allergen-flag"><span class="warn-ico" aria-hidden="true">⚠️</span>' +
        '<span><strong>Contains:</strong> ' + escapeHtml(allergens.join(", ")) + '</span></div>'
      : '<div class="allergen-none">No major allergens listed — always confirm with Emilee if you have a serious allergy.</div>';

    var qtyBadge = soldOut
      ? '<span class="qty-badge sold-out">Sold out this week</span>'
      : '<span class="qty-badge">' + p.quantityAvailable + ' left this week</span>';

    var staple = p.isStaple
      ? ' <span class="qty-badge" style="background:var(--sage);color:#fff;">Staple</span>'
      : "";

    el.innerHTML =
      '<div class="product-photo" role="img" aria-label="Placeholder photo of ' +
        escapeHtml(p.name) + ' (real photo coming soon)">' +
        '<span class="photo-tag">' + escapeHtml(p.imagePlaceholderLabel || p.name) + '<br><small style="font-family:var(--font-body);font-size:11px;letter-spacing:.05em;">photo coming soon</small></span>' +
      '</div>' +
      '<div class="product-body">' +
        '<h3 class="product-name">' + escapeHtml(p.name) + staple + '</h3>' +
        '<div class="product-price-row">' +
          '<span class="product-price">' + money(p.price) + '</span>' +
          qtyBadge +
        '</div>' +
        '<p class="product-desc">' + escapeHtml(p.description || "") + '</p>' +
        '<div class="ingredients">' +
          '<h4>Ingredients</h4>' +
          '<p>' + (ingredients.length ? escapeHtml(ingredients.join(", ")) : "Not listed") + '</p>' +
          allergenBlock +
        '</div>' +
      '</div>';

    // add-to-reservation row
    var addRow = document.createElement("div");
    addRow.className = "add-row";
    addRow.style.padding = "0 20px 20px";

    if (soldOut) {
      addRow.innerHTML = '<span class="mock-flag" style="margin:0;">Not available to reserve right now.</span>';
    } else {
      var max = p.quantityAvailable;
      addRow.innerHTML =
        '<div class="qty-picker" role="group" aria-label="Quantity for ' + escapeHtml(p.name) + '">' +
          '<button type="button" data-step="-1" aria-label="Decrease quantity">−</button>' +
          '<input type="number" min="1" max="' + max + '" value="1" ' +
            'aria-label="Quantity for ' + escapeHtml(p.name) + '">' +
          '<button type="button" data-step="1" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '<button class="btn btn-small" type="button" data-add>Add to reservation</button>';

      var input = addRow.querySelector("input");
      var minus = addRow.querySelector('[data-step="-1"]');
      var plus = addRow.querySelector('[data-step="1"]');

      function clamp() {
        var v = parseInt(input.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        if (v > max) v = max;
        input.value = v;
        minus.disabled = v <= 1;
        plus.disabled = v >= max;
      }
      minus.addEventListener("click", function () { input.value = (parseInt(input.value,10)||1) - 1; clamp(); });
      plus.addEventListener("click", function () { input.value = (parseInt(input.value,10)||1) + 1; clamp(); });
      input.addEventListener("input", clamp);
      clamp();

      addRow.querySelector("[data-add]").addEventListener("click", function () {
        var qty = parseInt(input.value, 10) || 1;
        if (EO) EO.cart.add({ id: p.id, name: p.name, price: p.price }, qty);
        var btn = this;
        var orig = btn.textContent;
        btn.textContent = "Added ✓";
        setTimeout(function () { btn.textContent = orig; }, 1100);
      });
    }

    el.appendChild(addRow);
    return el;
  }
})();
