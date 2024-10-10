'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust this import path as necessary

export default function SendNotification() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Fetch all user tokens
      const { data: users, error } = await supabase
        .from('users')
        .select('push_token')
        .not('push_token', 'is', null);

      if (error) {
        throw new Error('Error fetching user tokens: ' + error.message);
      }

      const tokens = users.map((user) => user.push_token);

      // Send notification
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens, title, body }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Notification sent successfully!');
        // Reset form
        setTitle('');
        setBody('');
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Notification Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          required
        />
      </div>
      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium text-gray-700"
        >
          Notification Body
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          rows={3}
          required
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        disabled={isLoading}
      >
        {isLoading ? 'Sending...' : 'Send Notification'}
      </button>
      {message && (
        <p
          className={
            message.includes('Error') ? 'text-red-500' : 'text-green-500'
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
