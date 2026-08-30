# 🏭 RETORT PRO
### Industrial Retort Management Software

> A complete, professional, offline-first retort process management system built for food processing factories. Manage batches, F0 calculations, stock inventory, team logins and generate PDF/Excel reports — all from the browser, no server needed.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 🔐 **Login System** | Email/Phone + PIN + OTP verification. Admin controls all user accounts |
| 📊 **Dashboard** | Live KPI cards, machine status, pass/fail chart, quick actions |
| 🧪 **New Batch** | Full retort batch entry with live F0 evaluation and batch timer |
| 🧮 **F0 Calculator** | Real lethality calculator (F0 = Σ Δt·10^((T-Tref)/z)) with lethality curve chart |
| 📦 **Product Library** | 188+ products with retort parameters (temperature, pressure, F0, pH) |
| 📈 **Graphs** | Temperature / Pressure / F0 vs Time (Chart.js interactive) |
| 📚 **Process Guide** | SOPs, HACCP/CCP points for all 9 packaging types |
| 📋 **Stock Management** | Inward/Outward ledger, opening/closing balance, production-linked stock |
| 📄 **Reports** | Generate PDF, Excel and Print — batch report with all parameters |
| 🕐 **Batch History** | Search, filter, edit, delete past batches |
| 🔔 **Alarms** | Temperature, pressure, F0 shortfall, cooling error alerts |
| ⚙️ **Settings** | Company profile, theme (dark/light), backup & restore |
| 👥 **User Management** | Admin add/remove users, view any user's batch & stock data |

---

## 🚀 Live Demo / Deployment

**No installation needed.** Open `index.html` in any browser.

### Deploy free on GitHub Pages:
1. Fork or upload this repository
2. Go to **Settings → Pages**
3. Set Source: `main` branch, folder: `/ (root)`
4. Your live URL: `https://yourusername.github.io/retortpro`

### Deploy free on Netlify:
Drag the extracted folder to [app.netlify.com/drop](https://app.netlify.com/drop)

---

## 🔐 Security

- **No server** = no hack surface (static files only)
- **No data transmitted** = no leak possible (all data in browser localStorage)
- PIN stored as SHA-256 hash (Web Crypto API, built into every browser)
- OTP verification on every login (6-digit, 5-minute expiry, single-use)
- Admin-only access to User Management

---

## 📁 Project Structure

```
retortpro/
├── index.html              # Main app shell + login system
├── css/
│   └── style.css           # Industrial UI theme (light + dark mode)
├── js/
│   ├── app.js              # Router, auth, OTP, History, Alarms, Users
│   ├── storage.js          # LocalStorage database + OTP + user auth
│   ├── dashboard.js        # Dashboard KPIs, charts, machine status
│   ├── batch.js            # New Batch form, timer, temperature log
│   ├── calculator.js       # F0 lethality engine + Calculator view
│   ├── products.js         # 188+ product library + Product Library view
│   ├── stock.js            # Stock ledger, inward/outward, production link
│   ├── graph.js            # Interactive Chart.js graphs
│   ├── guide.js            # Process Guide SOPs per packaging type
│   ├── report.js           # PDF (jsPDF) + Excel (SheetJS) + Print
│   └── settings.js         # Settings, backup, restore
├── data/
│   └── products.json       # 188 product catalog (reference)
└── DEPLOYMENT_ROADMAP.html # Open this for full deployment guide
```

---

## 🛠️ Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript ES6**
- **Bootstrap 5** — responsive layout
- **Chart.js** — interactive graphs
- **jsPDF + autotable** — PDF generation
- **SheetJS (XLSX)** — Excel export
- **Web Crypto API** — PIN hashing (built into browser, no library)
- **LocalStorage** — offline database

---

## 📦 Packaging Types Supported

Can · Vacuum Pouch · Ready To Eat Pouch · Glass Bottle · Cup Tray · PP Bowl · PET Jar · Aluminium Tray · Aluminium Pouch · Retortable Tray

## 🔬 Retort Types Supported

Steam · Steam Air · Water Spray · Water Cascade · Water Immersion · Rotary Retort

---

## 👤 First Time Setup

1. Open the app → **Admin setup screen** appears (first time only)
2. Enter your name, email/phone, create a PIN
3. Login → OTP generated on screen → enter OTP → Dashboard opens
4. Go to **User Management** to add team members

---

## 📞 Support

For issues or feature requests, open a GitHub Issue.

---

*RETORT PRO — Built for food processing professionals*
