<div align="center">
<img width="1200" height="475" alt="Vibe-Tutor Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Vibe-Tutor: Modern AI-Powered Education App

> A cutting-edge homework management and tutoring application featuring 2025 glassmorphism design trends and AI-powered learning assistance.

## ✨ Design Highlights

**Modern UI/UX (2025 Enhancement)**

- 🎨 **Glassmorphism Design**: Semi-transparent surfaces with backdrop blur effects
- 🌈 **Vibe-Tech Branding**: Custom gradient logo with neon purple, cyan, and pink color scheme
- ⚡ **Smooth Animations**: Float, pulse, shimmer, and fade-in effects throughout the interface
- 🎯 **Interactive Elements**: Glass buttons with scale transforms and glow states
- 📱 **Responsive Layout**: Mobile-first design with touch-optimized interactions

**Key Visual Features**

- Custom SVG logo with multi-stop gradients and glow filters
- Animated dashboard cards with staggered entrance animations
- Neon text effects and gradient typography
- Enhanced focus states for accessibility
- Modernized component library with consistent glass aesthetics

## 🚀 Quick Start

**Prerequisites:** Node.js 22+ and pnpm 10.33+ from the workspace root.

1. **Install dependencies:**

   ```powershell
   cd C:\dev
   pnpm install
   ```

2. **Set up environment:**
   Create `.env.local` and add your backend AI provider keys:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

3. **Run the app:**

   ```powershell
   pnpm nx run vibe-tutor:dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173/`

## 🎯 Features

- **AI Homework Assistant**: Voice-to-text homework parsing with Gemini (primary) and OpenRouter fallback
- **Smart Dashboard**: Glass-morphic interface with animated task cards
- **Achievement System**: Gamified learning with 3D badges and progress tracking
- **AI Tutor & AI Buddy**: Separate chat contexts for homework help and friendly conversation
- **Parent Dashboard**: PIN-protected progress monitoring and reward management
- **PWA Ready**: Installable on mobile devices with offline capabilities
- **Kiosk Mode**: Lock device to single-app mode for dedicated study device (see below)

## 🔒 Kiosk Mode (Single-App Lockdown)

Turn your child's device into a **dedicated study device** by locking it to only run Vibe-Tutor. Perfect for focused learning without distractions.

**Available Methods:**

1. **Fully Single App Kiosk** (Recommended) - Secure, purpose-built solution
2. **Built-in App Pinning** (Simple) - Quick setup using Samsung's native features

**Setup Instructions:** See **[docs/KIOSK_MODE_SETUP.md](docs/KIOSK_MODE_SETUP.md)** for detailed step-by-step guides.

**Benefits:**

- Eliminates access to games, social media, and other distractions
- Creates a focused learning environment
- Gives parents peace of mind during study time
- Compatible with Samsung Galaxy A54 and similar Android devices

## 📱 Mobile Deployment

For installing Vibe-Tutor as a native Android app, see:

- **[docs/ANDROID_INSTALL_INSTRUCTIONS.md](docs/ANDROID_INSTALL_INSTRUCTIONS.md)** - Build and install APK
- **[docs/ANDROID_RELEASE_RUNBOOK.md](docs/ANDROID_RELEASE_RUNBOOK.md)** - Release build flow
- **[docs/MOBILE-TROUBLESHOOTING.md](docs/MOBILE-TROUBLESHOOTING.md)** - Common Android issues

## 📚 Documentation

- **[AI.md](AI.md)** - Development guidelines and architecture
- **[CLAUDE.md](CLAUDE.md)** - Legacy development notes
- **[docs/USER_MANUAL.md](docs/USER_MANUAL.md)** - User and parent-facing guide
- **[docs/QA_TESTING_CHECKLIST.md](docs/QA_TESTING_CHECKLIST.md)** - QA procedures

## 🤝 Contributing

This is an educational project. Contributions are welcome! Please ensure code follows the glassmorphism design patterns and maintains TypeScript type safety.

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues, questions, or feature requests, use the current monorepo on GitHub:
<https://github.com/freshwaterbruce2/vibe-tech-monorepo>.
