# File Server Web Application

A modern, secure web application for managing and viewing files with support for multiple file types, built with React, TypeScript, and Node.js.

## 🌟 Features

- **Secure Authentication**

  - JWT-based authentication
  - Protected API endpoints
  - Configurable admin credentials

- **File Management**

  - Grid and list view options
  - File sorting by name, size, and date
  - Breadcrumb navigation
  - Download support for files and folders
  - Folder compression with progress tracking

- **File Type Support**

  - 🎥 Video streaming with adaptive playback
  - 🖼️ Image viewing with zoom and rotation controls
  - 📄 Text/code file viewing
  - 📁 Folder download as ZIP with progress tracking

- **Modern UI**
  - Responsive design
  - Dark/light theme support
  - Clean, intuitive interface
  - Loading states and error handling

## 📁 Project Structure

```
file-server/
├── client/                 # Frontend React application
│   ├── public/            # Static files
│   ├── src/               # Source files
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── package.json       # Client dependencies
├── server/                # Backend Node.js application
│   ├── src/              # Source files
│   └── package.json      # Server dependencies
├── package.json          # Root package.json
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/file-server.git
cd file-server
```

2. Install dependencies for both client and server:

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Create a `.env` file in the server directory:

```env
PORT=5000
FILE_STORAGE_PATH=/path/to/your/files
JWT_SECRET=your-secret-key
ADMIN_USERNAME=your-username
ADMIN_PASSWORD=your-password
```

4. Start the development servers:

```bash
# Start client (in client directory)
npm start

# Start server (in server directory)
npm start
```

The application will be available at `http://localhost:3000`

## 🛡️ Environment Variables

### Server Configuration

- `PORT`: Server port number (default: 5000)
- `FILE_STORAGE_PATH`: Absolute path to the files directory
- `JWT_SECRET`: Secret key for JWT token generation
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password

## 🔧 API Endpoints

### Authentication

- `POST /api/login`: Authenticate user and receive JWT token

### File Operations

- `GET /api/files`: List files in root directory
- `GET /api/files/*`: List files in specific directory
- `GET /api/download/*`: Download specific file
- `GET /api/stream/*`: Stream video files
- `POST /api/zip`: Create ZIP archive of a folder
- `GET /api/zip/:zipId/status`: Check ZIP creation status
- `GET /api/zip/:zipId/download`: Download created ZIP file
- `GET /api/folder-size/*`: Get folder size

## 🛠️ Technology Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- Lucide Icons
- Axios for API communication
- React Router for navigation

### Backend

- Node.js
- Express
- JWT for authentication
- File system operations
- Video streaming support
- ZIP compression

## 📝 License

This project is licensed under the [MIT License](LICENSE) - see the license file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚠️ Security Considerations

- The application implements path traversal protection
- JWT tokens are required for all protected endpoints
- File operations are restricted to the configured storage path
- Automatic cleanup of temporary ZIP files
- Environment variables for sensitive configuration
