# Jarvis Buddy Agent

A modern, full-featured web application built with cutting-edge technologies for managing and interacting with intelligent agents.

## 🚀 Tech Stack

- **Frontend Framework**: React 19.2.0 with TypeScript
- **Routing**: TanStack React Router
- **State Management**: TanStack React Query
- **Build Tool**: Vite + Cloudflare
- **UI Components**: Radix UI with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Maps**: Leaflet & React Leaflet
- **Charts**: Recharts
- **Styling**: Tailwind CSS 4.2.1
- **Language**: TypeScript (96.6%), CSS (3%), JavaScript (0.4%)

## 📋 Features

- **Component Library**: Rich set of pre-built UI components using Radix UI
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Form Management**: Robust form handling with validation
- **Data Visualization**: Charts and maps integration
- **Real-time Interactions**: React Query for efficient data fetching and caching
- **Type Safety**: Full TypeScript support throughout the application
- **Code Quality**: ESLint and Prettier configured for consistent code style

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/Bush-Steven/jarvis-buddy-agent.git

# Navigate to the project directory
cd jarvis-buddy-agent

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev

# Run linting
npm run lint

# Format code with Prettier
npm run format
```

### Production

```bash
# Build for production
npm run build

# Build development version
npm run build:dev

# Preview production build
npm run preview
```

## 📁 Project Structure

```
jarvis-buddy-agent/
├── src/                    # Source code
├── dist/                   # Production build output
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

## 🎨 Key Dependencies

### UI & Styling
- `@radix-ui/*` - Headless UI component library
- `tailwindcss` - Utility-first CSS framework
- `lucide-react` - Icon library
- `sonner` - Toast notifications

### Forms & Validation
- `react-hook-form` - Flexible form management
- `@hookform/resolvers` - Form validation resolvers
- `zod` - TypeScript-first schema validation

### Data & Visualization
- `@tanstack/react-query` - Data fetching and caching
- `recharts` - Composable charting library
- `leaflet` & `react-leaflet` - Mapping library

### Utilities
- `date-fns` - Modern date utility library
- `clsx` - Utility for constructing className strings
- `embla-carousel-react` - Carousel component

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## 🔧 Configuration

- **TypeScript**: Configured with strict mode enabled
- **ESLint**: Using latest ESLint with React hooks rules
- **Prettier**: Automatic code formatting on save
- **Vite**: Optimized for fast development and production builds

## 📦 Build & Deployment

The project is configured to work with Cloudflare through the `@cloudflare/vite-plugin`. It's built with Vite for optimal performance.

```bash
# Build for deployment
npm run build
```

The output will be in the `dist/` directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License (or specify your preferred license).

## 👤 Author

**Bush-Steven**
- GitHub: [@Bush-Steven](https://github.com/Bush-Steven)

## 🙋 Support

If you encounter any issues or have questions, please open an issue on the [GitHub repository](https://github.com/Bush-Steven/jarvis-buddy-agent/issues).

---

**Last Updated**: April 27, 2026
