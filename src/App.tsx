import "./App.css";
import { useEffect, useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import { Authenticator } from "@aws-amplify/ui-react";
import { getCurrentUser, fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "../amplify/data/resource";
import Banner from './Banner';

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const [, setIsAuthenticated] = useState(false);
  const [, setShowAuth] = useState(false);
  const [newTodoContent, setNewTodoContent] = useState("");

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    }
  }

  async function fetchAttributes() {
    try {
      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
    } catch (error) {
      console.error('Error fetching user attributes:', error);
    }
  }

  useEffect(() => {
    if (currentUser) {
      setTodos([]); // Reset todos when user changes
      const subscription = client.models.Todo.observeQuery().subscribe({
        next: (data) => setTodos([...data.items]),
      });

      return () => subscription.unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    if(currentUser) {
      fetchAttributes();
    }
  }, [currentUser]);

  const createTodo = useCallback(() => {
    if (newTodoContent.trim()) {
      client.models.Todo.create({ content: newTodoContent, isDone: false });
      setNewTodoContent("");
    }
  }, [newTodoContent]);

  const deleteTodo = useCallback((id: string) => {
    client.models.Todo.delete({ id });
  }, []);

  const toggleTodo = useCallback((id: string, currentIsDone: boolean) => {
    client.models.Todo.update({
      id: id,
      isDone: !currentIsDone
    }).catch(error => {
      console.error("Error updating todo:", error);
    });
  }, []);

  return (
    <Authenticator socialProviders={['google']}>
      {({ signOut, user }) => {
        if (user && !currentUser) {
          setCurrentUser(user);
          setShowAuth(true);
          console.log("is logged in");
        }
        
        return (
          <main>
            <Banner 
              onSignOut={() => {
                signOut?.();
                setShowAuth(false);
                setCurrentUser(null);
              }} 
            />
            <div className="todo-input-container">
              <input
                className="todo-input"
                type="text"
                value={newTodoContent}
                onChange={(e) => setNewTodoContent(e.target.value)}
                placeholder="Enter new todo"
              />
              <button onClick={createTodo}>Add Todo</button>
            </div>
            <div className="todo-grid">
              {todos.map((todo) => (
                <div key={todo.id} className="todo-tile">
                  <button className="delete-button" onClick={() => deleteTodo(todo.id)}>×</button>
                  <div className="todo-content">
                    <input
                      type="checkbox"
                      checked={todo.isDone ?? false}
                      onChange={() => toggleTodo(todo.id, todo.isDone ?? false)}
                    />
                    <span className="todo-text" style={{ textDecoration: todo.isDone ? 'line-through' : 'none' }}>
                      {todo.content}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </main>
        );
      }}
    </Authenticator>
  );
}

export default App;
