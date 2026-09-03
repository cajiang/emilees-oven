# How to update your cookies — Emilees Oven website

This site shows your cookies from **one file**: `products.json`.
Change that file and the Products page updates. You don’t need to touch anything else.

You can edit it yourself, or hand this whole folder to an AI assistant and say
*"update products.json — here are this week’s cookies."* This guide explains both.

---

## The quick version

1. Open the file **`products.json`** (it lives in the `site` folder, next to the web pages).
2. Find the cookie you want to change.
3. Edit the words and numbers between the quote marks.
4. Save the file.
5. Reload the Products page in your browser.

That’s it. Everything on the Products page comes from this one file.

---

## What each cookie looks like

Every cookie is a block that looks like this:

```json
{
  "id": "pumpkin-snickerdoodle",
  "name": "Pumpkin Snickerdoodle",
  "price": 4.00,
  "quantityAvailable": 6,
  "isStaple": false,
  "description": "Soft pumpkin-spiced cookie rolled in cinnamon sugar.",
  "ingredients": ["Flour (wheat)", "Butter", "Pumpkin puree", "Egg", "Cinnamon"],
  "allergens": ["Wheat", "Gluten", "Dairy", "Egg"],
  "imagePlaceholderLabel": "Pumpkin Snickerdoodle"
}
```

Here is what each line means:

| Field | What it is | Example |
|-------|-----------|---------|
| `id` | A short label with no spaces, used behind the scenes. Make it unique for each cookie. | `"maple-oat-pecan"` |
| `name` | The cookie name customers see. | `"Maple Oat Pecan"` |
| `price` | The price as a number (no dollar sign). | `4.00` |
| `quantityAvailable` | How many you have this week. Set to `0` to show **Sold out**. | `8` |
| `isStaple` | `true` for your always-available cookie, `false` for seasonal ones. | `false` |
| `description` | One friendly sentence about the cookie. | `"Chewy, with toasted pecans."` |
| `ingredients` | The list of ingredients, each in quotes, separated by commas. | `["Flour (wheat)", "Butter", "Pecans"]` |
| `allergens` | The **allergy warnings**, each in quotes. These show in the orange “Contains” box. | `["Wheat", "Gluten", "Dairy", "Tree nuts (pecan)"]` |
| `imagePlaceholderLabel` | Short text shown on the picture block until you have real photos. | `"Maple Oat Pecan"` |

> **Allergens are important.** Whatever you put in `allergens` is shown to customers as a
> warning. If a cookie has none of the common allergens, you can use an empty list `[]` and the
> card will say so. When in doubt, list it.

---

## Common changes

### Change how many are left
Find `"quantityAvailable"` and change the number. Set it to `0` to mark a cookie **Sold out**
(customers can still see it but can’t reserve it).

```json
"quantityAvailable": 3,
```

### Change a price
Find `"price"` and change the number. No dollar sign, and use a decimal point.

```json
"price": 4.50,
```

### Add a brand-new cookie
Copy one whole block (from the opening `{` to the closing `}`), paste it right after another cookie,
put a comma between the two blocks, and change the details. Give it a new, unique `id`.

### Remove a cookie
Delete its whole block, from `{` to `}`. If it was in the middle of the list, also remove the extra
comma so two commas don’t end up next to each other.

---

## The two rules that keep the file working

JSON is picky about punctuation. If the page ever shows an error, it’s almost always one of these:

1. **Commas go _between_ items, never after the last one.**
   Between two cookies: yes. After the final cookie in the list: no.

2. **Every piece of text needs straight double quotes** `"like this"` — not curly quotes.
   If you copy text from Word or Notes, the quotes can turn curly and break the file. Type them
   fresh or use a plain text editor.

If something breaks, undo your last change (Ctrl+Z / Cmd+Z) and try again, or ask your AI assistant
to *"fix the JSON in products.json."*

---

## Handing it to an AI (easiest option)

You can give the `site` folder (or just `products.json`) to an AI assistant and say something like:

> "Here’s my products.json. This week I have 10 brown butter chocolate chip at $3.50, and I’m adding
> a new seasonal 'Gingerbread' cookie at $4, I have 8, ingredients are flour, butter, molasses, ginger,
> egg — allergens wheat, gluten, dairy, egg. Remove the lemon shortbread. Please update the file."

Ask it to keep the same format and to double-check the allergens. Then save the file it gives you back
into the `site` folder, replacing the old `products.json`.

---

## Previewing the site on your computer

Because of a browser safety rule, opening `products.html` by double-clicking it may show a “one small
step” notice instead of the cookies. To preview the full site, run a tiny local web server from inside
the `site` folder:

- **If you have Python:** open a terminal in the `site` folder and run `python -m http.server`,
  then visit `http://localhost:8000` in your browser.
- Or use any simple “live server” tool (for example the *Live Server* extension in VS Code).

The other pages (Home, About, Contact) open fine by double-clicking; only the Products page needs this
because it reads from `products.json`. Once the site is hosted for real, none of this matters —
customers just see the cookies.

---

## Things this file does **not** control

- **Photos** are placeholder blocks for now (no real images yet).
- **Payment handles** (Zelle/Venmo), **contact email/phone/social**, and **Emilee’s story** live in the
  web pages, not in `products.json`. Search the site files for the word `PLACEHOLDER` to find them.
- Reservations are **not** emailed or saved anywhere yet — that gets wired up later.
