# CARA Backend

Backend API for the CARA Legal Assistant application, built with Node.js, Express, and MongoDB.

## Features

- User authentication with JWT
- Document upload and management
- AI-powered document analysis
- Chat functionality with Together AI

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create an `.env` file with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   TOGETHER_API_KEY=your_together_api_key
   TOGETHER_API_URL=https://api.together.xyz/v1
   ```

3. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Log in to an existing account
- `GET /api/auth/logout` - Log out
- `GET /api/auth/me` - Get current user profile

### Users

- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/updateMe` - Update user profile
- `PATCH /api/users/updatePassword` - Update user password
- `DELETE /api/users/deleteMe` - Delete user account

### AI Chat

- `POST /api/ai/chat` - Send a message to the AI assistant
- `GET /api/ai/chats` - Get all user chats
- `GET /api/ai/chats/:id` - Get a single chat
- `DELETE /api/ai/chats/:id` - Delete a chat

### Documents

- `POST /api/documents` - Upload a document
- `GET /api/documents` - Get all user documents
- `GET /api/documents/:id` - Get a single document
- `PATCH /api/documents/:id` - Update a document
- `DELETE /api/documents/:id` - Delete a document
- `POST /api/documents/:id/analyze` - Analyze a document with AI

## Data Flow

1. User signup/login: Client sends credentials to server, server validates and returns JWT token
2. Protected routes: Client includes JWT token in Authorization header
3. Document upload: Client sends multipart form data, server stores file and metadata
4. AI interaction: Server sends user query to Together API and returns response

## Technologies

- Node.js & Express
- MongoDB with Mongoose ODM
- JWT for authentication
- Together AI API for AI functionality
- Multer for file uploads # law-backend
