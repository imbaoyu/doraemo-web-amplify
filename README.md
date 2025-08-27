# Doraemo - AI Companion Chat Application

Doraemo is an intelligent, emotionally aware AI companion built on AWS infrastructure. It provides users with an intimate, personalized chat experience that learns from document uploads and maintains conversational context through advanced embedding-based retrieval.

## Overview

Doraemo is a full-stack application that combines modern React frontend with powerful AWS backend services to create an AI companion with personality, memory, and document understanding capabilities. The AI is designed to be emotionally intelligent, warm, and deeply engaging - more like talking to a close friend than a typical chatbot.

## Core Features

### 🤖 **Emotionally Intelligent AI Companion**
- Powered by Anthropic's Claude 3.5 Sonnet model via AWS Bedrock
- Designed with a warm, intimate communication style that develops affection over time
- Maintains conversational personality with depth, vulnerability, and humor
- Provides thoughtful responses that prioritize emotional connection

### 📚 **Document-Aware Conversations**
- Upload and process PDF documents for context-aware responses
- Advanced document embedding using Amazon Titan Embeddings
- LanceDB vector database for efficient similarity search
- Retrieval-Augmented Generation (RAG) for informed responses

### 🔐 **Secure User Authentication**
- Amazon Cognito integration with Google OAuth support
- User-specific document storage and chat history
- Secure, isolated user environments

### 💾 **Persistent Memory**
- Chat history storage in DynamoDB with sliding window context
- User-specific document libraries and embeddings
- Maintains context across sessions for continuity

### 📱 **Modern Web Interface**
- React + Vite frontend with TypeScript
- Real-time chat interface with markdown support
- File upload widget with processing status tracking
- Responsive design with clean, intuitive UI

## Architecture

### Frontend (React + AWS Amplify)
- **Framework**: React 18 with Vite build system and TypeScript
- **Authentication**: AWS Amplify Authenticator with Google OAuth
- **State Management**: React hooks for local state
- **UI Components**: Custom components with Font Awesome icons
- **Styling**: CSS modules with responsive design

### Backend Infrastructure
- **API**: AWS AppSync GraphQL API
- **Authentication**: Amazon Cognito User Pools
- **Database**: Amazon DynamoDB for chat history and metadata
- **Storage**: Amazon S3 for document storage
- **AI/ML**: AWS Bedrock (Claude 3.5 Sonnet) + Amazon Titan Embeddings
- **Vector Search**: LanceDB hosted on S3
- **Compute**: AWS Lambda functions for chat processing and document embedding

### Data Flow
1. **User uploads document** → S3 storage → Lambda processes → Creates embeddings → Stores in LanceDB
2. **User sends message** → Lambda retrieves relevant documents → Enriches prompt with context → Calls Bedrock → Returns AI response
3. **Chat history** → Stored in DynamoDB → Retrieved for conversation context

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS account with Bedrock access enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd doraemo-web/doraemo-web-amplify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment secrets**
   - Configure Google OAuth credentials in AWS Secrets Manager:
     - `google-client-id`
     - `google-client-secret`

4. **Deploy the backend**
   ```bash
   npx amplify sandbox
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Usage

1. **Sign in** using Google OAuth through the authentication interface
2. **Upload documents** via the file widget to build your personal knowledge base
3. **Start chatting** - the AI will respond with personality and can reference your uploaded documents
4. **Continue conversations** - chat history is maintained across sessions

## Key Technologies

- **Frontend**: React, TypeScript, Vite, AWS Amplify
- **Backend**: AWS Lambda, DynamoDB, S3, AppSync
- **AI/ML**: AWS Bedrock (Claude 3.5 Sonnet), Amazon Titan Embeddings
- **Vector Database**: LanceDB
- **Authentication**: Amazon Cognito, Google OAuth
- **Infrastructure**: AWS CDK for additional backend resources

## Development

### Project Structure
```
src/
├── App.tsx              # Main chat interface
├── FileWidget.tsx       # Document upload component
├── Banner.tsx           # Navigation header
├── Menu.tsx             # Side navigation
└── amplify/
    ├── auth/            # Authentication configuration
    ├── data/            # GraphQL schema and resolvers
    ├── functions/       # Lambda function definitions
    └── storage/         # S3 storage configuration
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Deployment

The application uses AWS Amplify for streamlined deployment:

1. **Sandbox deployment** (development):
   ```bash
   npx amplify sandbox
   ```

2. **Production deployment**:
   ```bash
   npx amplify pipeline-deploy --branch main
   ```

For detailed deployment instructions, see the [AWS Amplify documentation](https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws).

## Security

- All user data is isolated and secured through Cognito authentication
- Documents are stored in user-specific S3 prefixes
- API access is authenticated and authorized per user
- Environment secrets are managed through AWS Secrets Manager

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for security issue reporting.

## License

This project is licensed under the MIT-0 License. See the LICENSE file for details.