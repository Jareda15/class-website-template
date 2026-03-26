# Class Website Template

Responsive student dashboard template. Features dark mode, PWA support, dynamic schedule/test tracking powered by Google Sheets, and automated Web Push Notifications via Cloudflare Workers.

## ✨ Features
- **Dark/Light Mode:** Toggle between themes easily.
- **PWA Support:** Users can install the site as an app on their mobile phones.
- **Dynamic Data:** Class duties (services) and upcoming tests are loaded directly from Google Sheets without needing a backend server.
- **Web Push Notifications:** Users can subscribe to receive real-time updates directly to their devices.
- **Automated Alerts (CRON):** The backend automatically checks the Google Sheet for tests happening the next day and sends an automated push notification to all subscribers at 17:00 UTC.
- **Quick Links:** Easy access to Discord, school systems, notes, and gallery.

---

## 🚀 Frontend Setup (The Website)

To use this template for your own class, follow these steps for the frontend:

### 1. Update Basic Info and Links
Open `index.html` and replace the placeholder text with your actual information:
* Change `<h1>OUR CLASS</h1>` to your actual class name.
* Find and replace the placeholder links inside the `href` attributes (e.g., `YOUR_SCHOOL_SYSTEM_LINK`, `YOUR_SHARED_NOTES_LINK`).

### 2. Setup Google Sheets (Your Database)
This template uses Google Sheets to fetch current data. You will need to create two separate sheets.

* **Class Duty Sheet:** The script expects a row where one column contains a date range (e.g., `1.9. - 5.9. 2024`) and the **last column** contains the names of the students on duty.
* **Tests Sheet:** The script expects the **first column** to be the Date (e.g., `15.10. 2024`), the **second column** to be the Subject, and the **third column** for details.

**Publish Sheets to the Web:**
1. In your Google Sheet, go to `File` > `Share` > `Publish to web`.
2. Select `Entire Document` (or the specific sheet tab).
3. Change `Web page` to **`Comma-separated values (.csv)`**.
4. Click **Publish** and copy the generated link. Do this for both sheets.

### 3. Connect Sheets to Your Script
Open `script.js` and paste your CSV links:
* In `loadServiceData()`, replace `YOUR_GOOGLE_SHEETS_CSV_URL_FOR_CLASS_DUTIES` with your Duty Sheet CSV link.
* In `loadTestsData()`, replace `YOUR_GOOGLE_SHEETS_CSV_URL_FOR_UPCOMING_TESTS` with your Tests Sheet CSV link.

### 4. Host Your Website
Since this is a static website, host it anywhere for free (e.g., **GitHub Pages** or **Cloudflare Pages**).

---

## ⚙️ Backend Setup (Push Notifications)

To enable Push Notifications, you need to deploy the included Cloudflare Worker.

### 1. Generate VAPID Keys
You need VAPID keys to send secure push messages. You can generate them using a tool like `npx web-push generate-vapid-keys`. You will get a **Public Key** and a **Private Key**.

### 2. Configure the Worker
Open `wrangler.toml` and update the following:
* Replace `YOUR_KV_NAMESPACE_ID_HERE` with the ID of a Cloudflare KV Namespace you create (e.g., via Cloudflare Dashboard > Workers & Pages > KV).
* Replace `YOUR_PUBLIC_VAPID_KEY_HERE` with your generated Public VAPID key.
* Update the `VAPID_SUBJECT` to an admin email address.

### 3. Set up Secrets
For security, do not hardcode your Private Key or Admin Secret. Use Wrangler to store them:
```bash
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put ADMIN_SECRET

4. Deploy the Worker

Run the following commands in your terminal to install dependencies and deploy the backend to Cloudflare:
Bash

npm install
npm run deploy

5. Connect Frontend to Backend

Once your Worker is deployed, it will give you a URL (e.g., https://class-push-worker.your-username.workers.dev).

    Open script.js again.

    Replace YOUR_PUBLIC_VAPID_KEY_HERE with your Public VAPID Key.

    Replace https://YOUR_WORKER_URL.workers.dev/api/subscribe and /api/unsubscribe with your actual deployed Worker URLs.

📄 License

This project is open-source and available under the MIT License. Feel free to use it, modify it, and share it
