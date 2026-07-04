# CollabBoard – Real-Time Collaborative Whiteboard 🎨

A modern, high-performance real-time collaborative whiteboard application designed for teams, educators, and creative individuals. Draw, brainstorm, and collaborate with your peers instantly in shared rooms.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)](https://realtime-whiteboard-f8om.onrender.com)

## ✨ Features

- **Real-time Collaboration** — See other users' cursors and drawings instantly via WebSockets.
- **Room-Based Architecture** — Create isolated rooms (e.g., `/board/marketing`) and collaborate securely with your team.
- **Rich Drawing Tools** — Pencil, Eraser, Rectangles, Circles, Lines, Text Boxes, and Sticky Notes.
- **AI Flowchart Generation** — Describe what you want in plain English, and the integrated Gemini AI generates a structured flowchart directly onto the canvas.
- **History & Snapshots** — Save snapshots of your board state and restore them at any time from the History Panel.
- **Scoped Board Clearing** — "Clear" safely erases only *your* drawings, preserving the work of other collaborators.
- **Drag, Resize & Edit** — Seamlessly select, move, resize, and modify any element on the canvas.
- **Dark Mode** — Built-in sleek dark mode for comfortable late-night brainstorming.
- **JWT Authentication** — Secure user registration and login with encrypted passwords.

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React.js, Vite, TailwindCSS, Socket.io-client |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB, Mongoose |
| **Auth & Security** | JSON Web Tokens (JWT), Bcrypt.js, Rate Limiting |
| **AI** | Google Gemini Generative AI API |
| **Deployment** | Render, MongoDB Atlas |

## 📂 Project Structure

```
realtime-whiteboard/
│
├── client/                          # Frontend (React + Vite)
│   ├── public/                      # Static public assets (favicon, icons)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AiModal.jsx          # AI flowchart generation modal
│   │   │   ├── Canvas.jsx           # Core HTML5 Canvas rendering engine
│   │   │   ├── ConfirmDialog.jsx    # Reusable confirmation dialog
│   │   │   ├── Cursors.jsx          # Live multi-user cursor display
│   │   │   ├── ErrorBoundary.jsx    # React error boundary wrapper
│   │   │   ├── HistoryPanel.jsx     # Board snapshot history panel
│   │   │   ├── Login.jsx            # User authentication form
│   │   │   ├── TemplatesModal.jsx   # Board templates selector
│   │   │   ├── Toast.jsx            # Toast notification system
│   │   │   └── Toolbar.jsx          # Drawing tools & controls toolbar
│   │   ├── assets/                  # Images and static assets
│   │   ├── App.jsx                  # Root component with routing
│   │   ├── Board.jsx                # Main board logic & socket management
│   │   ├── Dashboard.jsx            # User dashboard & room management
│   │   ├── index.css                # Global styles
│   │   └── main.jsx                 # Application entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # Backend (Node.js + Express)
│   ├── models/
│   │   ├── Board.js                 # Board schema (strokes, versions)
│   │   └── User.js                  # User schema (auth credentials)
│   ├── index.js                     # Express server, REST APIs, Socket.io
│   └── package.json
│
├── .gitignore
├── LICENSE                          # MIT License
├── package.json                     # Root scripts for unified deployment
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) running locally, or a MongoDB Atlas connection string

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ayushraja123-cell/realtime-whiteboard.git
   cd realtime-whiteboard
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables:**
   Create a `.env` file inside the `server/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/realtime-whiteboard
   JWT_SECRET=your_secret_key_here
   ```

4. **Start the development servers:**
   Open two terminals:
   ```bash
   # Terminal 1 — Backend
   cd server && npm run dev

   # Terminal 2 — Frontend
   cd client && npm run dev
   ```

5. **Open the app:** Visit [http://localhost:5173](http://localhost:5173) in your browser.

## 📦 Deployment

This project is configured as a unified monorepo — the Express backend serves the built React frontend in production. Perfect for single-service platforms like Render or Railway.

| Setting | Value |
|---------|-------|
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Environment Variables** | `NODE_ENV=production`, `MONGO_URI=<your_atlas_uri>` |

## 📄 License

This project is licensed under the [MIT License](LICENSE).
