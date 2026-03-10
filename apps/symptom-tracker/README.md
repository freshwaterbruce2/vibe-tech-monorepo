# 🩺 Symptom Tracker

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/status-stable-green.svg)](https://github.com/freshwaterbruce2/Monorepo)

**Symptom Tracker** is a privacy-focused web application designed to help users monitor daily health metrics, log symptoms, and visualize trends over time. Built for personal use with local-first data storage, it provides a clear picture of your health journey, making it easier to identify triggers and share accurate data with healthcare providers.

> **Why use this?** Managing chronic conditions or tracking recovery can be overwhelming. This app simplifies the process by offering an intuitive interface for logging and analyzing your symptoms, with the added benefit of keeping all your sensitive health data encrypted and under your control.

## 📚 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Data Storage & Privacy](#data-storage--privacy)
- [Remote Access](#remote-access)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## ✨ Features

- **Daily Logging:** Quickly record symptoms, severity (1-10 scale), and detailed notes.
- **Multi-User Support:** Track symptoms for two people (you + your wife) from a single instance.
- **Customizable Inputs:** Track specific symptoms relevant to your condition (e.g., fatigue, pain, mood, digestion).
- **Visual Analytics:** View trends via interactive charts and graphs showing symptom frequency and severity over time.
- **Data Export:** Generate reports to share with your healthcare providers.
- **Secure & Private:** SQLite database with local storage; no cloud dependency required.
- **PWA Support:** Install as an app on Android/iOS devices for native-like experience.
- **Remote Access:** Secure access away from home using Tailscale (no port forwarding needed).
- **Zero Configuration:** Works out of the box with sensible defaults.

## 🛠 Tech Stack

**Frontend:**

- React 19 with TypeScript
- Vite (build tool)
- Tailwind CSS for styling
- Chart.js for data visualization

**Backend:**

- Node.js with Express
- SQLite (embedded database)
- TypeScript

**Other Tools:**

- PNPM 9.15.0 (monorepo package manager)
- NX (monorepo orchestration)
- Tailscale (optional secure remote access)

## 📥 Installation

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [PNPM](https://pnpm.io/) (v9 or higher)
- [Tailscale](https://tailscale.com/) (optional, for remote access)

### Setup

1. **Navigate to the project directory:**

   ```bash
   cd C:\dev\apps\symptom-tracker
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Environment Configuration:**
   The app uses default settings, but you can customize by creating a `.env` file in the project root:

   ```env
   # API Configuration
   API_PORT=5055
   HOST=127.0.0.1
   
   # Database Path (default: D:\data\symptom-tracker\symptom-tracker.db)
   DB_PATH=D:\data\symptom-tracker\symptom-tracker.db
   ```

4. **Ensure Data Directory Exists:**

   ```bash
   mkdir D:\data\symptom-tracker
   ```

## 🚀 Usage

### Running Locally

**Option 1: Run API and UI together (for local use only)**

1. **Start the API server:**

   ```bash
   pnpm --filter symptom-tracker-api dev
   ```

2. **In a new terminal, start the UI dev server:**

   ```bash
   pnpm --filter symptom-tracker dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5179`

**Option 2: Build and serve (for home network access)**

1. **Build the UI:**

   ```bash
   pnpm --filter symptom-tracker build
   ```

2. **Start the API on all interfaces:**

   ```powershell
   $env:HOST='0.0.0.0'
   pnpm --filter symptom-tracker-api dev
   ```

3. **Find your PC's IP address:**

   ```powershell
   ipconfig
   ```

   Look for the IPv4 address under your active network adapter (e.g., `192.168.1.50`)

4. **Access from other devices on the same network:**
   Open `http://192.168.1.50:5055` on your phone/tablet

### Daily Usage Guide

#### Logging a Symptom

1. Open the app and navigate to the **"Today"** tab
2. Tap **"Add Entry"**
3. Select a symptom from your list or add a new one
4. Adjust the severity slider (1-10 scale)
5. Add notes (e.g., "After eating dairy", "Stressful day at work")
6. Press **"Save"**

#### Viewing Trends

1. Go to the **"Insights"** tab
2. Select a date range (e.g., "Last 7 Days", "Last 30 Days")
3. View graphs showing symptom frequency and severity patterns
4. Look for correlations and triggers

#### Switching Users

1. Tap the user avatar/profile icon in the top-right
2. Select the other user
3. All logging and viewing is now for the selected user
4. Data is kept separate for each user

## 🗄️ Data Storage & Privacy

### Local Storage

By default, all data is stored in an encrypted SQLite database at:

```
D:\data\symptom-tracker\symptom-tracker.db
```

**Key Privacy Features:**

- ✅ **No Cloud Required:** Everything runs on your local machine
- ✅ **No Account Needed:** No registration, no passwords to remember
- ✅ **Your Data, Your Control:** Export or delete anytime
- ✅ **Encrypted Storage:** Database file is protected
- ✅ **Local Network Only:** No data leaves your home network by default

### Backing Up Your Data

Simply copy the database file:

```powershell
Copy-Item "D:\data\symptom-tracker\symptom-tracker.db" "D:\backups\symptom-tracker-backup-$(Get-Date -Format 'yyyy-MM-dd').db"
```

## 🌐 Remote Access (Away from Home)

### Recommended: Tailscale (Secure & Private)

This keeps your health data encrypted and avoids exposing your app to the public internet.

1. **Install Tailscale on:**
   - Your PC (the one running the API + holding the SQLite DB)
   - Both phones

2. **Start the API bound to all interfaces:**

   ```powershell
   $env:HOST='0.0.0.0'
   pnpm --filter symptom-tracker-api dev
   ```

3. **Find your PC's Tailscale IP:**
   - Open Tailscale app on PC
   - Look for IP like `100.x.y.z`

4. **Access from anywhere (even on cellular):**
   Open `http://100.x.y.z:5055` on your phone

**Important Notes:**

- ❌ Don't open/forward port `5055` on your router if using Tailscale
- ⏱️ Your PC must stay on (disable sleep) since it's the "server"
- 🔥 If Windows Firewall prompts, allow `node` for private networks on port `5055`

### Alternative: Port Forwarding (Not Recommended)

If you don't use Tailscale, you can forward port 5055 on your router to your PC's local IP. However, this exposes your health data to the public internet and is **not recommended**.

## 📸 Screenshots

| Dashboard | Logging | Analytics |
|:---------:|:-------:|:---------:|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Logging](./docs/screenshots/logging.png) | ![Analytics](./docs/screenshots/analytics.png) |

*Note: Add actual screenshots to `C:\dev\apps\symptom-tracker\docs\screenshots\` folder*

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. **Fork the Project**
2. **Create your Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- [Chart.js](https://www.chartjs.org/) for the amazing graphing library
- [Tailscale](https://tailscale.com/) for enabling secure remote access
- [Make a README](https://www.makeareadme.com/) for the guide on writing this documentation
- [freeCodeCamp](https://www.freecodecamp.org/news/how-to-write-a-good-readme-file/) for the inspiration
- [PNPM](https://pnpm.io/) for the fast and efficient package management

---

*Created with ❤️ by Bruce for personal health tracking*
