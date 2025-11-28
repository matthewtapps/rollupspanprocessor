import { DatabaseSync } from 'node:sqlite';

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  created_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

export type QueryResult = User | Post | Comment;

export function createInMemoryDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
    
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) STRICT;
    
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) STRICT;
  `);
  
  const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
  const insertPost = db.prepare('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)');
  const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
  
  for (let i = 1; i <= 10; i++) {
    insertUser.run(`User ${i}`, `user${i}@example.com`);
  }
  
  for (let i = 1; i <= 20; i++) {
    insertPost.run(
      Math.floor(Math.random() * 10) + 1,
      `Post Title ${i}`,
      `This is the content for post ${i}`
    );
  }
  
  for (let i = 1; i <= 50; i++) {
    insertComment.run(
      Math.floor(Math.random() * 20) + 1,
      Math.floor(Math.random() * 10) + 1,
      `This is comment ${i}`
    );
  }
  
  return db;
}

export function executeQuery<T = QueryResult>(
  db: DatabaseSync, 
  query: string, 
  params: (string | number)[] = []
): T[] {
  const stmt = db.prepare(query);
  return params.length > 0 ? stmt.all(...params) as T[] : stmt.all() as T[];
}
