/**
 * Emilees Oven — order/message intake Apps Script (STANDALONE)
 * =================================================
 * This is a STANDALONE Apps Script (not bound to any Sheet). It writes
 * website reservations and contact messages into dedicated tabs on the
 * BAKERS' existing spreadsheet — leaving their Google-Form "Form Responses 1"
 * tab (and any other existing tab) completely untouched — and emails the
 * customer a receipt when they gave an email address.
 *
 * SETUP (one-time, done by whoever will run this — that account must have
 * EDIT access to the bakers' spreadsheet):
 *   1. Go to https://script.google.com ▸ New project. Do NOT open this from
 *      inside a Sheet's Extensions ▸ Apps Script menu — this script is
 *      standalone and targets the bakers' sheet by ID (see BAKERS_SHEET_ID
 *      below), it is not bound to whatever sheet you happen to be in.
 *   2. Delete the default Code.gs contents and paste this entire file in
 *      its place. Save (the disk icon, or Ctrl/Cmd+S).
 *   3. Click Deploy ▸ New deployment.
 *        - Click the gear icon next to "Select type" ▸ choose "Web app".
 *        - Description: anything, e.g. "orders intake".
 *        - Execute as: Me (your own account).
 *        - Who has access: Anyone.
 *      Click Deploy. Google will ask you to authorize the script — it will
 *      request BOTH Google Sheets access (to write the rows) and Gmail /
 *      "send email as you" access (to send the receipt). Click through
 *      "Advanced" ▸ "Go to (project name)" if you see a warning; this is
 *      expected for a script you wrote yourself.
 *   4. Copy the "Web app" URL shown after deploying — it ends in /exec.
 *      Send that URL to the Strategist to paste into site/app.js as
 *      GOOGLE_SCRIPT_URL.
 *   5. Make sure the account you deployed as has EDIT (not just view)
 *      access to the bakers' spreadsheet (BAKERS_SHEET_ID below) — the
 *      script needs to create tabs and append rows to it.
 *
 * NOTE: the /exec URL is safe to be public/unlisted — this script only
 * accepts POST requests and only appends rows to its own two tabs; it
 * doesn't expose the sheet for reading, and the FORM_TOKEN check below is
 * just a light spam guard, not real security.
 *
 * If you ever change the code after already deploying, use
 * Deploy ▸ Manage deployments ▸ (pencil/edit icon) ▸ New version ▸ Deploy,
 * so the same /exec URL keeps working.
 */

// Must match FORM_TOKEN in site/app.js. Leave blank ("") to disable the check.
var FORM_TOKEN = "emilees-oven-orders";

// The bakers' existing spreadsheet. This script is standalone, so it must
// open the target sheet explicitly by ID rather than getActiveSpreadsheet().
var BAKERS_SHEET_ID = "1p2uajKaXjt1QS9o2s4dEYbrJPzs1vRw8zkjaTZh4_2Q";

// Dedicated tabs this script owns. Never write to "Form Responses 1" or any
// other existing tab on the bakers' sheet.
var ORDERS_SHEET_NAME = "Website Orders";
var MESSAGES_SHEET_NAME = "Website Messages";

var SENDER_NAME = "Emilees Oven";
var PAYMENT_NOTE = "Venmo @emileegroff, PayPal @emilee1264, or cash — due at pickup/drop-off once the team confirms your order.";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (FORM_TOKEN && data.token !== FORM_TOKEN) {
      return jsonResponse({ ok: false, error: "bad token" });
    }

    if (data.type === "order") {
      appendOrderRow(data);
      sendOrderReceipt(data); // guarded internally; never throws
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

// Emails the customer a plain-text receipt confirming we RECEIVED (not
// confirmed) their reservation. Wrapped in its own try/catch so a mail
// failure (quota, bad address, etc.) never blocks the row already appended
// above.
function sendOrderReceipt(data) {
  try {
    var customer = data.customer || {};
    var email = customer.email;
    if (typeof email !== "string" || email.trim() === "") return;

    var reservationId = data.reservationId || "";
    var name = customer.name || "there";

    var itemLines = (data.items || []).map(function (it) {
      var priceText = typeof it.lineTotal === "number" ? ("$" + it.lineTotal.toFixed(2)) : "Price TBD";
      return "  - " + it.name + " x" + it.qty + " — " + priceText;
    }).join("\n");

    var totalText = typeof data.total === "number" ? ("$" + data.total.toFixed(2)) : "TBD";

    var subject = "Emilees Oven — we received your reservation (" + reservationId + ")";
    var body =
      "Hi " + name + ",\n\n" +
      "We've received your reservation with Emilees Oven — thank you!\n\n" +
      "This isn't final yet. Our baking team will review it, confirm availability, " +
      "and reach out to you (by email or phone) to arrange pickup or drop-off and payment.\n\n" +
      "Reservation ref: " + reservationId + "\n\n" +
      "Items:\n" + itemLines + "\n\n" +
      "Total: " + totalText + "\n\n" +
      "Payment: " + PAYMENT_NOTE + "\n\n" +
      "We'll be in touch soon!\n\n" +
      "— " + SENDER_NAME;

    MailApp.sendEmail({ to: email, subject: subject, body: body });
  } catch (mailErr) {
    // Swallow — the sheet row is already saved; a receipt failure must not
    // surface as an order failure to the customer.
  }
}

function getOrCreateSheet(name, headerRow) {
  var ss = SpreadsheetApp.openById(BAKERS_SHEET_ID);
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
