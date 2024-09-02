import { useEffect, useState, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import type { Schema } from "../amplify/data/resource";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (currentUser) {
      setTodos([]); // Reset todos when user changes
      const subscription = client.models.Todo.observeQuery().subscribe({
        next: (data) => setTodos([...data.items]),
      });

      return () => subscription.unsubscribe();
    }
  }, [currentUser]);

  const createTodo = useCallback(() => {
    client.models.Todo.create({ content: window.prompt("Todo content"), isDone: false });
  }, []);

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
    <Authenticator>
      {({ signOut, user }) => {
        // Update the current user when it changes
        if (user !== currentUser) {
          setCurrentUser(user);
        }

        return (
          <main>
            <h1>{user?.signInDetails?.loginId}'s todos</h1>
            <button onClick={createTodo}>+ New Item</button>
            <ul>
              {todos.map((todo) => (
                <li key={todo.id}>
                  <input
                    type="checkbox"
                    checked={todo.isDone ?? false}
                    onChange={() => toggleTodo(todo.id, todo.isDone ?? false)}
                  />
                  <span style={{ textDecoration: todo.isDone ? 'line-through' : 'none' }}>
                    {todo.content}
                  </span>
                  <button onClick={() => deleteTodo(todo.id)}>Delete</button>
                </li>
              ))}
            </ul>
            <button onClick={signOut}>Sign out</button>
          </main>
        );
      }}
    </Authenticator>
  );
}

export default App;
