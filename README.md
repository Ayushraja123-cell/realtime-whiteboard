# Realtime Collaborative Whiteboard 🎨

A modern, high-performance real-time collaborative whiteboard application designed for teams, educators, and creative individuals. Build dynamic diagrams, brainstorm ideas, and collaborate with your peers instantly in shared rooms.

## ✨ Features

*   **Real-time Collaboration:** See other users' cursors and drawings instantly via Socket.io.
*   **Room-Based Architecture:** Create specific rooms (e.g., `/board/marketing`) to isolate workspaces and collaborate securely with your team.
*   **Rich Drawing Tools:**
    *   Pencil (freehand drawing)
    *   Eraser
    *   Geometric Shapes (Rectangles, Circles, Lines)
    *   Text Boxes
    *   Sticky Notes
*   **AI Flowchart Generation:** Describe what you want, and an AI agent will instantly generate a structured flowchart directly onto the canvas.
*   **History & Snapshots:** Save "snapshots" of your board state and restore them at any time from the History Panel.
*   **Targeted Board Clearing:** When you click "Clear", it safely erases only *your* drawings, preserving the work of other collaborators in the room.
*   **Infinite Canvas & Resizing:** Seamlessly drag, resize, and modify elements.
*   **Dark Mode:** Built-in sleek dark mode for comfortable late-night brainstorming.

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), TailwindCSS, Socket.io-client
*   **Backend:** Node.js, Express.js, Socket.io
*   **Database:** MongoDB & Mongoose
*   **Deployment Architecture:** Unified monorepo structure where the Express backend serves the static React build for seamless single-service hosting.

## 🚀 Getting Started Locally

### Prerequisites
*   Node.js (v18+)
*   MongoDB running locally or a MongoDB Atlas connection string.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YourUsername/realtime-whiteboard.git
   cd realtime-whiteboard
   ```

2. **Install dependencies for both client and server:**
   ```bash
   npm run install-all
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `server` directory and add the following:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/realtime-whiteboard
   JWT_SECRET=your_super_secret_jwt_key
   ```

4. **Start the development servers:**
   Open two terminals:
   *   **Backend:** `cd server && npm run dev`
   *   **Frontend:** `cd client && npm run dev`

5. **Visit the app:** Open `http://localhost:5173` in your browser.

## 📦 Production Deployment

This project is configured to be deployed as a single unified service (perfect for platforms like Render or Railway).

1. Ensure your production environment has the correct environment variables set (`NODE_ENV=production` and `MONGO_URI`).
2. The deployment platform should run the build script:
   ```bash
   npm run build
   ```
3. The platform should start the app using:
   ```bash
   npm start
   ```

The Express server will automatically serve the built React files located in `client/dist`.

---
*Built with ❤️ and Antigravity*
