# Class Website Template

Responsive student dashboard template. Features dark mode, PWA support, and dynamic schedule/test tracking powered by Google Sheets.

## ✨ Features
- **Dark/Light Mode:** Toggle between themes easily.
- **PWA Support:** Users can install the site as an app on their mobile phones.
- **Dynamic Data:** Class duties (services) and upcoming tests are loaded directly from Google Sheets without needing a backend server.
- **Quick Links:** Easy access to Discord, school systems, notes, and gallery.

---

## 🚀 How to Setup

To use this template for your own class, follow these simple steps:

### 1. Update Basic Info and Links
Open `index.html` and replace the placeholder text with your actual information:
* Change `<h1>Class Name</h1>` to your actual class name.
* Find and replace the following placeholder links inside the `href` attributes:
  * `YOUR_DISCORD_LINK`
  * `YOUR_SCHOOL_SYSTEM_LINK`
  * `YOUR_NOTES_LINK`
  * `YOUR_GALLERY_LINK`

### 2. Setup Google Sheets (Your Database)
This template uses Google Sheets to fetch current data. You will need to create two separate sheets.

#### A. Class Duty (Service) Sheet Format:
The script expects a row where one of the columns contains a date range with a hyphen (e.g., `1.9. - 5.9. 2024`) and the **last column** contains the names of the students on duty.

#### B. Tests Sheet Format:
The script expects the **first column** to be the exact Date (e.g., `15.10. 2024`) and the **second column** to be the Subject/Test Name (e.g., `Math Exam`).

#### C. Publish Sheets to the Web:
For the script to read the data, you must publish both sheets as CSV files:
1. In your Google Sheet, go to `File` > `Share` > `Publish to web`.
2. Select `Entire Document` (or the specific sheet tab).
3. Change `Web page` to **`Comma-separated values (.csv)`**.
4. Click **Publish** and copy the generated link. Do this for both sheets.

### 3. Connect Sheets to Your Script
Open `script.js` and locate the fetching functions to paste your CSV links:
* In `loadServiceData()`, replace `YOUR_GOOGLE_SHEETS_SERVICES_CSV_URL` with your Duty Sheet CSV link.
* In `loadTestsData()`, replace `YOUR_GOOGLE_SHEETS_TESTS_CSV_URL` with your Tests Sheet CSV link.

### 4. Host Your Website
Since this is a static website (HTML/CSS/JS), you can host it anywhere for free. The easiest way is using **GitHub Pages**:
1. Go to your repository **Settings**.
2. Click on **Pages** in the left sidebar.
3. Under **Build and deployment**, select `Deploy from a branch`.
4. Select your `main` branch and click **Save**.
5. Within a few minutes, your class website will be live!

---

## 📄 License
This project is open-source and available under the MIT License. Feel free to use it, modify it, and share it!
