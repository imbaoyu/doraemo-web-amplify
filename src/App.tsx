import "./App.css";
import { useEffect, useState, useRef } from "react";
import { generateClient } from "aws-amplify/api";
import { Authenticator } from "@aws-amplify/ui-react";
import { getCurrentUser } from 'aws-amplify/auth';
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "../amplify/data/resource";
import Banner from './Banner';
import Menu from './Menu';
import FileWidget from './FileWidget';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useNavigate } from 'react-router-dom';

const client = generateClient<Schema>();

marked.setOptions({ async: false });

interface Message {
  text: string;
  isUser: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  // Fetch chat history when component mounts
  const fetchChatHistory = async () => {
    try {
      const user = await getCurrentUser();
      if (!user?.username || !user?.userId) {
        console.log('No user found or missing user properties');
        return;
      }

      const { data: chatHistory } = await client.models.ChatHistory.list({
        userName: user.username,
        idx: { ge: 0 },
        filter: {
          owner: { eq: user.userId }
        }
      });

      if (!chatHistory) {
        console.log('No chat history found');
        return;
      }

      console.log('Raw chat history:', chatHistory);
      // Filter out any null items and ensure required properties exist
      const validChatHistory = chatHistory.filter(chat => 
        chat && typeof chat.idx === 'number' && 
        (typeof chat.prompt === 'string' || chat.prompt === null) &&
        (typeof chat.response === 'string' || chat.response === null)
      );

      // Convert chat history to Message format and sort by idx
      const historicalMessages = validChatHistory
        .sort((a, b) => a.idx - b.idx)
        .map(chat => ([
          { text: chat.prompt || '', isUser: true },
          { text: chat.response || '', isUser: false }
        ]))
        .flat();
      console.log('Processed chat history:', historicalMessages);
      setMessages(historicalMessages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;

    setMessages(prevMessages => [...prevMessages, { text: inputMessage, isUser: true }]);
    setInputMessage('');

    try {
      const { data } = await client.queries.SendConverseCommand({prompt: inputMessage});
      const responseText = data ?? "No response received";
      // Extract the message text from the response
      setMessages(prevMessages => [...prevMessages, { text: responseText, isUser: false }]);
    } catch (error) {
      console.error('Error calling SendConverseCommand query:', error);
      setMessages(prevMessages => [...prevMessages, { text: "Sorry, I couldn't process that request.", isUser: false }]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
        // Reset to minimum height first
        textareaRef.current.style.height = '40px';
        
        // Get the scroll height
        const scrollHeight = textareaRef.current.scrollHeight;
        
        // Set new height based on content
        textareaRef.current.style.height = 
            scrollHeight > 40 ? `${scrollHeight}px` : '40px';
        
        // Show/hide scrollbar based on content
        textareaRef.current.style.overflowY = 
            scrollHeight > 200 ? 'auto' : 'hidden';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  return (
    <Authenticator socialProviders={['google']}>
      {({ signOut, user }) => {
        if (!user) {
          navigate('/');
          return <div>Redirecting...</div>;
        }

        console.log('Authenticated user:', user);
        const userProps = {
          userId: user.userId,
          username: user.username
        };
        console.log('User props for FileWidget:', userProps);
        
        return (
          <div className="page-container">
            <Banner onSignOut={signOut} />
            <div className="content-wrapper">
              <Menu />
              <main className="content-container">
                <div className="chat-container">
                  <div className="chat-messages">
                    {messages.reduce((acc, message, index, array) => {
                      // Convert markdown to HTML synchronously
                      const markdownText = marked.parse(message.text);
                      // Sanitize the HTML
                      const sanitizedText = DOMPurify.sanitize(markdownText.toString());

                      acc.push(
                        <div key={index} className={`message ${message.isUser ? 'user' : 'assistant'}`}>
                          {message.isUser ? (
                            <p className="user-message">{message.text}</p>
                          ) : (
                            <>
                              <p className="assistant-prefix">Answer:</p>
                              <p
                                className="assistant-message"
                                dangerouslySetInnerHTML={{ __html: sanitizedText }}
                              />
                            </>
                          )}
                        </div>
                      );
                      
                      // Add separator after each complete interaction (Q&A pair)
                      if (index % 2 === 1 && index < array.length - 1) {
                        acc.push(<hr key={`sep-${index}`} className="interaction-separator" />);
                      }
                      
                      return acc;
                    }, [] as JSX.Element[])}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <div className="chat-input-wrapper">
                  <form className="chat-input-form" onSubmit={handleSubmit}>
                    <textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="chat-input"
                      placeholder="Type your message..."
                    />
                    <button type="submit" className="chat-submit">
                      Send
                    </button>
                  </form>
                </div>
              </main>
              <FileWidget user={userProps} />
            </div>
          </div>
        );
      }}
    </Authenticator>
  );
}

export default App;
