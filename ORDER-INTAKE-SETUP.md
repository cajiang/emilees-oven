# Order Intake Setup — for Calvin

The website's reservation form and contact form send data to a Google Sheet
you own, via a small script (Google Apps Script). No email is used. Follow
these steps once to turn it on.

## 1. Make a Google Sheet

- Go to https://sheets.google.com in **your own** Google account.
- Create a new blank spreadsheet. Name it something like "Emilees Oven Orders".

## 2. Add the script

- In the Sheet menu bar: **Extensions ▸ Apps Script**.
- A new tab opens with a script editor and a default `Code.gs` file.
- Select all the placeholder text in `Code.gs` and delete it.
- Open `site/orders-apps-script.gs` from this project, copy its entire
  contents, and paste it into `Code.gs`.
- Save (the disk icon, or Ctrl/Cmd+S).

## 3. Deploy it as a Web App

- Click **Deploy ▸ New deployment**.
- Click the gear icon next to "Select type" and choose **Web app**.
- Fill in:
  - **Execute as:** Me (your account)
  - **Who has access:** Anyone
- Click **Deploy**.
- The first time, Google will ask you to authorize the script. Click
  through it — you may see an "unverified app" warning; click **Advanced**
  then **Go to (project name) (unsafe)**. This is expected because it's a
  script you just wrote yourself, not a third-party app.

## 4. Copy the URL and send it to the Strategist

- After deploying, Google shows a **Web app URL** ending in `/exec`.
- Copy that URL and send it to the Claude Strategist. It will be pasted
  into `site/app.js` in place of `GOOGLE_SCRIPT_URL = "PLACEHOLDER-apps-script-url"`.
- This URL is safe to be public/unlisted — the script only accepts
  submissions (POST requests) and only adds rows; it can't be used to read
  or download the sheet.

## 5. Share the Sheet with the baker

- In the Sheet, click **Share**, add Emilee's email/account, and set her
  access to **Viewer** (she just needs to see incoming orders/messages, not
  edit the script).
- New reservations land on the "Orders" tab, contact-form messages land on
  the "Messages" tab (both are created automatically on first submission).

## If you ever edit the script later

- Make your changes in `Code.gs`, save, then **Deploy ▸ Manage deployments**,
  click the pencil/edit icon on the existing deployment, choose **New
  version**, and **Deploy** again. This keeps the same `/exec` URL working —
  you do not need to send a new URL to the Strategist unless you create a
  brand-new deployment.
