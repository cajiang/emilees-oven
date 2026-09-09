/**
 * Emilees Oven — order/message intake Apps Script
 * =================================================
 * This script turns a Google Sheet into a free receiving endpoint for the
 * website's reservation form and contact form. No email is used anywhere.
 *
 * SETUP (one-time, done by Calvin in his own Google account):
 *   1. Go to https://sheets.google.com and create a new blank Sheet.
 *      (Optional: rename it "Emilees Oven Orders".)
 *   2. In the Sheet: Extensions ▸ Apps Script. This opens the script editor
 *      with a default Code.gs file.
 *   3. Delete anything in Code.gs and paste this entire file in its place.
 *      Save (the disk icon, or Ctrl/Cmd+S).
 *   4. Click Deploy ▸ New deployment.
 *        - Click the gear icon next to "Select type" ▸ choose "Web app".
 *        - Description: anything, e.g. "orders intake".
 *        - Execute as: Me (your own account).
 *        - Who has access: Anyone.
 *      Click Deploy. Google will ask you to authorize the script the first
 *      time — click through "Advanced" ▸ "Go to (project name)" if you see
 *      a warning; this is expected for a script you wrote yourself.
 *   5. Copy the "Web app" URL shown after deploying — it ends in /exec.
 *      Send that URL to the Strategist to paste into site/app.js as
 *      GOOGLE_SCRIPT_URL.
 *   6. Share the Sheet itself (view access is enough) with the baker so she
 *      can see incoming orders/messages.
 *
 * NOTE: the /exec URL is safe to be public/unlisted — this script only
 * accepts POST requests and only appends rows; it doesn't expose the sheet
 * for reading, and the FORM_TOKEN check below is just a light spam guard,
 * not real security.
 *
 * If you ever change the code after already deploying, use
 * Deploy ▸ Manage deployments ▸ (pencil/edit icon) ▸ New version ▸ Deploy,
 * so the same /exec URL keeps working.
 */

// Must match FORM_TOKEN in site/app.js. Leave blank ("") to disable the check.
var FORM_TOKEN = "emilees-oven-orders";

var ORDERS_SHEET_NAME = "Orders";
var MESSAGES_SHEET_NAME = "Messages";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (FORM_TOKEN && data.token !== FORM_TOKEN) {
      return jsonResponse({ ok: false, error: "bad token" });
    }

    if (data.type === "order") {
      appendOrderRow(data);
    } else if (data.type === "message") {
      appendMessageRow(data);
    } else {
      return jsonResponse({ ok: false, error: "unknown type" });
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function appendOrderRow(data) {
  var sheet = getOrCreateSheet(ORDERS_SHEET_NAME, [
    "Timestamp", "Reservation ID", "Customer Name", "Customer Email",
    "Customer Phone", "Note", "Items", "Total"
  ]);

  var customer = data.customer || {};
  var items = (data.items || []).map(function (it) {
    var priceText = typeof it.lineTotal === "number" ? ("$" + it.lineTotal.toFixed(2)) : "Price TBD";
    return it.name + " x" + it.qty + " (" + priceText + ")";
  }).join("; ");
  var totalText = typeof data.total === "number" ? ("$" + data.total.toFixed(2)) : "TBD";

  sheet.appendRow([
    new Date(),
    data.reservationId || "",
    customer.name || "",
    customer.email || "",
    customer.phone || "",
    customer.note || "",
    items,
    totalText
  ]);
}

function appendMessageRow(data) {
  var sheet = getOrCreateSheet(MESSAGES_SHEET_NAME, [
    "Timestamp", "Customer Name", "Customer Email", "Message"
  ]);

  var customer = data.customer || {};

  sheet.appendRow([
    new Date(),
    customer.name || "",
    customer.email || "",
    data.message || ""
  ]);
}

function getOrCreateSheet(name, headerRow) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headerRow);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
