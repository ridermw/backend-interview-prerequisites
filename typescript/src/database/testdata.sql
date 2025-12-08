-- Test Data Seed Script
-- Creates sample Slack-like data for testing

-- Insert 1 workspace
INSERT INTO workspaces (name, slug) VALUES ('Test Workspace', 'test-ws');

-- Insert 20 users
INSERT INTO users (username, email, display_name, status) VALUES
('alice', 'alice@example.com', 'Alice Smith', 'active'),
('bob', 'bob@example.com', 'Bob Johnson', 'active'),
('carol', 'carol@example.com', 'Carol White', 'away'),
('dave', 'dave@example.com', 'Dave Brown', 'active'),
('eve', 'eve@example.com', 'Eve Davis', 'active'),
('frank', 'frank@example.com', 'Frank Miller', 'active'),
('grace', 'grace@example.com', 'Grace Lee', 'away'),
('henry', 'henry@example.com', 'Henry Wilson', 'active'),
('iris', 'iris@example.com', 'Iris Taylor', 'active'),
('jack', 'jack@example.com', 'Jack Anderson', 'active'),
('kate', 'kate@example.com', 'Kate Thomas', 'away'),
('leo', 'leo@example.com', 'Leo Jackson', 'active'),
('mia', 'mia@example.com', 'Mia White', 'active'),
('noah', 'noah@example.com', 'Noah Harris', 'active'),
('olivia', 'olivia@example.com', 'Olivia Martin', 'away'),
('peter', 'peter@example.com', 'Peter Thompson', 'active'),
('quinn', 'quinn@example.com', 'Quinn Garcia', 'active'),
('rachel', 'rachel@example.com', 'Rachel Martinez', 'active'),
('sam', 'sam@example.com', 'Sam Robinson', 'away'),
('tara', 'tara@example.com', 'Tara Clark', 'active');

-- Insert 5 channels
INSERT INTO channels (workspace_id, name, topic, is_private) VALUES
(1, 'general', 'General discussion', 0),
(1, 'random', 'Random off-topic chat', 0),
(1, 'engineering', 'Engineering team', 0),
(1, 'marketing', 'Marketing team', 0),
(1, 'sales', 'Sales team', 0);

-- Add ALL 20 users to general channel
INSERT INTO channel_members (channel_id, user_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
(1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
(1, 11), (1, 12), (1, 13), (1, 14), (1, 15),
(1, 16), (1, 17), (1, 18), (1, 19), (1, 20);

-- Add 4 users to random channel (users 1-4)
INSERT INTO channel_members (channel_id, user_id) VALUES
(2, 1), (2, 2), (2, 3), (2, 4);

-- Add 4 users to engineering channel (users 5-8)
INSERT INTO channel_members (channel_id, user_id) VALUES
(3, 5), (3, 6), (3, 7), (3, 8);

-- Add 4 users to marketing channel (users 9-12)
INSERT INTO channel_members (channel_id, user_id) VALUES
(4, 9), (4, 10), (4, 11), (4, 12);

-- Add 4 users to sales channel (users 13-16)
INSERT INTO channel_members (channel_id, user_id) VALUES
(5, 13), (5, 14), (5, 15), (5, 16);

-- Add some sample messages
INSERT INTO messages (channel_id, user_id, text) VALUES
(1, 1, 'Hey everyone, welcome to the workspace!'),
(1, 2, 'Thanks for having us!'),
(1, 3, 'Excited to get started'),
(1, 4, 'Looking forward to collaborating'),
(1, 5, 'Great to be here'),
(2, 1, 'Random thought: what''s everyone''s favorite coffee?'),
(2, 2, 'Oat milk lattes all the way'),
(2, 3, 'I''m more of a tea person'),
(2, 4, 'Black coffee, no sugar'),
(3, 5, 'Let''s discuss the Q1 roadmap'),
(3, 6, 'I have some ideas for the API redesign'),
(3, 7, 'Should we upgrade the database?'),
(3, 8, 'Yes, let''s talk about scaling'),
(4, 9, 'New campaign launching next week'),
(4, 10, 'Design mockups are ready for review'),
(4, 11, 'Budget looks good'),
(4, 12, 'Let''s schedule a call with the client'),
(5, 13, 'Pipeline looks strong this quarter'),
(5, 14, 'Just closed a big deal!'),
(5, 15, 'Proposal sent to prospect'),
(5, 16, 'Follow-up call scheduled');

-- Add some reactions to messages
INSERT INTO reactions (message_id, user_id, emoji) VALUES
(1, 2, '👍'), (1, 3, '👍'), (1, 4, '❤️'), (1, 5, '🚀'),
(2, 1, '😂'), (2, 3, '👍'),
(6, 2, '☕'), (6, 3, '🍵'), (6, 4, '☕'),
(7, 1, '😂'), (7, 4, '👍'),
(9, 3, '🎉'), (9, 2, '🎉'), (9, 1, '👍');
