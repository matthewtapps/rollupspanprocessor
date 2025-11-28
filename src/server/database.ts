import { Client } from 'pg';

async function initializeDb(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/testdb'
  });
  
  await client.connect();
  
  await client.query(`
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS posts;
    DROP TABLE IF EXISTS users;
    
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    INSERT INTO users (name, email) VALUES 
      ('User 1', 'user1@example.com'),
      ('User 2', 'user2@example.com'),
      ('User 3', 'user3@example.com'),
      ('User 4', 'user4@example.com'),
      ('User 5', 'user5@example.com'),
      ('User 6', 'user6@example.com'),
      ('User 7', 'user7@example.com'),
      ('User 8', 'user8@example.com'),
      ('User 9', 'user9@example.com'),
      ('User 10', 'user10@example.com');
    
    INSERT INTO posts (user_id, title, content) VALUES 
      (1, 'Post 1', 'Content 1'),
      (2, 'Post 2', 'Content 2'),
      (3, 'Post 3', 'Content 3'),
      (1, 'Post 4', 'Content 4'),
      (2, 'Post 5', 'Content 5'),
      (4, 'Post 6', 'Content 6'),
      (5, 'Post 7', 'Content 7'),
      (1, 'Post 8', 'Content 8'),
      (3, 'Post 9', 'Content 9'),
      (2, 'Post 10', 'Content 10');
    
    INSERT INTO comments (post_id, user_id, content) VALUES 
      (1, 2, 'Comment 1'), (1, 3, 'Comment 2'),
      (2, 1, 'Comment 3'), (2, 4, 'Comment 4'),
      (3, 5, 'Comment 5'), (3, 2, 'Comment 6'),
      (4, 3, 'Comment 7'), (5, 1, 'Comment 8'),
      (6, 2, 'Comment 9'), (7, 4, 'Comment 10');
  `);
  
  return client;
}

export const dbClient = await initializeDb();

export const queries = {
  selectUser: 'SELECT * FROM users WHERE id = $1',
  selectPosts: 'SELECT * FROM posts WHERE user_id = $1',
  selectComments: 'SELECT * FROM comments WHERE post_id = $1',
  countUsers: 'SELECT COUNT(*) FROM users WHERE id > $1',
  joinPostsComments: 'SELECT p.title, c.content FROM posts p JOIN comments c ON p.id = c.post_id WHERE p.user_id = $1',
};
