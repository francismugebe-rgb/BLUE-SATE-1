# HeartConnect Social Networking & Dating Platform

A full-stack social networking and dating application built with React, Express, and Socket.io.

## Features

- **Real-time Chat:** Powered by Socket.io for instant messaging.
- **Social Feed:** Create posts, like, and comment on others' content.
- **Dating Profiles:** Discover matches, follow users, and manage your dating profile.
- **Wallet & Points:** Integrated points system and wallet for premium features.
- **Multi-Database Support:** Supports MySQL with an automatic SQLite fallback for easy setup.
- **Media Uploads:** Support for image and video uploads.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd heartconnect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env
   ```
   Key variables to configure:
   - `JWT_SECRET`: A secret key for signing tokens.
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MySQL credentials (optional, falls back to SQLite).
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: For payment integration.

## Running the Application

### Development Mode

Starts the server and Vite development middleware:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Production Mode

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

## Deployment on cPanel

This project includes a `.cpanel.yml` file for automatic deployment via cPanel's Git Version Control.

1. Push your code to a repository (e.g., GitHub).
2. In cPanel, go to **Git™ Version Control** and clone your repository.
3. Ensure your cPanel account has Node.js support enabled via **Setup Node.js App**.
4. The `.cpanel.yml` file will handle copying files to your deployment path upon push.

## License

MIT
