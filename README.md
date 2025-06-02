# 📦 Wayback Chrome Extension Tutorial

Wayback is a Chrome Extension that helps you **collect and download files** from webpages using customizable filters and formats. It saves everything to an IndexedDB database and gives you full control over your collected data.

[Click to install from Chrome Web Store](https://chromewebstore.google.com/detail/wayback/ackbmnbooeeadblijhhlndcchfbjdogb)

---

## 🧭 How It Works (Quick Overview)

1. **Choose a collection** — Open a webpage in your browser that you want to gather files from.
2. **Collect links** — Press `Collect` and scroll up and down the page. The extension grabs links dynamically.
3. **Use RegEx (optional)** — You can filter titles using a RegEx pattern.
4. **Search for files** — Press `Search` to fetch the files matching the collected links. They are saved in the database.
5. **Download** — Enter a file format (e.g., `.mp3`, `.pdf`) and press `Download` to grab all matching files.
6. **Database** — Click `Database` to manage, export, or delete collections or individual items.

---

## 🎛️ Main Panel (`content.js`)

This panel appears as an overlay on the current page when the extension is activated.

### 📋 Panel Controls

- **Collection input**: Type in the name of the collection (e.g., `my-files`).
- **RegEx filter (optional)**: Use a regular expression to collect only items whose titles match the pattern.
- **`Collect` button**: Begins gathering links from the page while you scroll. Keep scrolling to let the extension discover more content.
- **`Search` button**: Finds downloadable files using the collected links and saves them to IndexedDB.
- **File format input**: Enter a format like `mp3`, `pdf`, etc.
- **`Download` button**: Downloads all matching files saved in the database.
- **`Database` button**: Opens the DB Dashboard for managing your collections.

---

## 🗃️ DB Dashboard (`db.js`)

Accessed by clicking the **`Database`** button from the main panel. This opens `db.html`.

### 📂 What You Can Do

- **View entries**: See all collected items grouped by collection.
- **Download by format**: Filter by file format and download a specific collection.
- **Delete single items**: Remove one entry from the database manually.
- **Delete collection**: Remove an entire collection.
- **Clear all**: Erase the entire database.

### 🛠️ Typical Use Case

- Open the DB dashboard after collecting files.
- Select your collection.
- Enter the file format you want.
- Download or delete as needed.

---

## 💡 Tips

- Be sure to scroll around when collecting — some content loads dynamically.
- Use RegEx for advanced filtering (e.g., `^Lesson \d+`).
- If nothing downloads, double-check that your file format is correct and that the search found results.


