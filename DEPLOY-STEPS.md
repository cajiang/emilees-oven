# Putting the site online — Emilees Oven

This walks you through making the site live on the internet, for free, using GitHub Pages.
Nobody will find it by searching — it only shows up for people who scan the QR code or
open the exact link.

You'll do four things:

1. Create a GitHub repo and upload the `site` folder's contents.
2. Turn on GitHub Pages.
3. Get a free Web3Forms key (tied to Emilee's email) so orders reach her inbox.
4. Find the live link and make a QR code from it.

---

## 1. Create a GitHub repo and upload the site

1. Go to **github.com** and sign in (or create a free account).
2. Click the **+** in the top right → **New repository**.
3. Give it any name, for example `emilees-oven`. Leave it **Public** (GitHub Pages needs
   this on a free account — remember, the site itself is still unlisted/private in the
   sense that nobody can find it without the link).
4. Click **Create repository**.
5. On the new repo's page, click **uploading an existing file** (or **Add file → Upload files**).
6. Open the `site` folder on your computer, select **everything inside it** (all the
   `.html` files, `styles.css`, `app.js`, `products.json`, `robots.txt`, the `.nojekyll`
   file, etc.) and drag them into the GitHub upload box.
   - Important: upload the **contents** of the `site` folder, not the folder itself.
7. Scroll down and click **Commit changes**.

---

## 2. Turn on GitHub Pages

1. In your repo, click **Settings** (top menu).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose **main** and folder **/ (root)**, then click **Save**.
5. Wait a minute or two, then refresh the page. GitHub will show a message like
   *"Your site is live at..."* with a link — that's your website address. See step 4 below
   for more on this link.

---

## 3. Get a free Web3Forms key and connect it

Web3Forms is a free service that takes the reservation form on the site and emails it to
Emilee — no extra app or account for customers, and no cost.

1. Go to **web3forms.com**.
2. Enter **Emilee's email address** (the one she wants orders sent to) and click
   **Create Access Key**.
3. Check that inbox for a confirmation email from Web3Forms and confirm it.
4. Copy the **access key** it gives you (a long string of letters and numbers).
5. Open the file **`app.js`** (in the `site` folder) in any text editor.
6. Find this line near the top of the file:

   ```
   var WEB3FORMS_ACCESS_KEY = "PLACEHOLDER-web3forms-access-key"; // SWAP: get a free key at web3forms.com (tied to the baker's email)
   ```

7. Replace the text between the quotes (`PLACEHOLDER-web3forms-access-key`) with the key
   you copied, keeping the quote marks. For example:

   ```
   var WEB3FORMS_ACCESS_KEY = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
   ```

8. Save the file, then upload it to GitHub again (open the file in your repo, click the
   pencil/edit icon, paste in the updated content, and commit) — or re-upload the whole
   `site` folder contents as in step 1.

Once this key is in place, reservations submitted on the site will email Emilee directly.
Before the key is added, the site still works fine — it just shows customers the same
confirmation screen with an "email these details" button instead.

---

## 4. Find the live link (for the QR code)

- The live web address is shown on the **Settings → Pages** screen in GitHub, and usually
  looks like:

  `https://your-github-username.github.io/your-repo-name/`

- That's the link to turn into a QR code (any free QR code generator online will do — just
  paste in that link).
- Anyone who scans the code or opens that link sees the site. It won't show up in Google
  or other search results.
