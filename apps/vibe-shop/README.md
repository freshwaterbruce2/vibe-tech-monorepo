# Vibe-Shop

Vibe-Shop is a trendy automated e-commerce platform built with Next.js 15, React 19, and AI-powered product management.

## Features

- 🤖 **AI Product Classification** - Automatically categorize products using DeepSeek Chat
- ✨ **AI Description Enhancement** - Generate engaging, SEO-optimized product descriptions
- 🔍 **Trending Keywords** - AI-powered keyword research for product discovery
- 📦 **Prisma ORM** - Type-safe database management
- 🎨 **shadcn/ui** - Beautiful, accessible UI components
- ⚡ **Next.js 15** - Latest framework features with optimized performance

## AI Integration (OpenRouter)

Vibe-Shop uses [OpenRouter](https://openrouter.ai/) for unified AI access. Get your free API key at [openrouter.ai](https://openrouter.ai/).

**Default Model**: DeepSeek Chat (~$0.0003 per 1M tokens - ultra-cheap!)

### Setup

1. Copy `.env.example` to `.env`
2. Add your OpenRouter API key:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-...
   ```
3. Configure database URL (PostgreSQL required)

## Getting Started

**Install dependencies:**

```bash
pnpm install
```

**Run development server:**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

**Build for production:**

```bash
pnpm build
pnpm start
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
