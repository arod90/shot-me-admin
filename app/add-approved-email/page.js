'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AddApprovedEmail() {
  const [email, setEmail] = useState('');
  const [approvedEmails, setApprovedEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState(null);

  useEffect(() => {
    fetchApprovedEmails();
  }, []);

  async function fetchApprovedEmails() {
    setLoading(true);
    const { data, error } = await supabase
      .from('approved_emails')
      .select('*')
      .order('email', { ascending: true });

    if (error) {
      console.error('Error fetching approved emails:', error);
    } else {
      setApprovedEmails(data);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { data, error } = await supabase
      .from('approved_emails')
      .insert([{ email }]);

    if (error) {
      console.error('Error adding approved email:', error);
    } else {
      console.log('Approved email added successfully:', data);
      setEmail('');
      fetchApprovedEmails();
    }
  }

  const handleEdit = (emailItem) => {
    setEditingEmail({ ...emailItem });
  };

  const handleSave = async () => {
    const { data, error } = await supabase
      .from('approved_emails')
      .update({ email: editingEmail.email })
      .eq('id', editingEmail.id);

    if (error) {
      console.error('Error updating email:', error);
    } else {
      setEditingEmail(null);
      fetchApprovedEmails();
    }
  };

  const handleDelete = async (emailItem) => {
    if (
      window.confirm('Are you sure you want to delete this approved email?')
    ) {
      const { error } = await supabase
        .from('approved_emails')
        .delete()
        .eq('id', emailItem.id);

      if (error) {
        console.error('Error deleting approved email:', error);
      } else {
        fetchApprovedEmails();
      }
    }
  };

  const handleChange = (e) => {
    setEditingEmail({ ...editingEmail, email: e.target.value });
  };

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">
        Agregar Email Aprobado
      </h2>
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex items-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-grow mr-2 rounded-md border-gray-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2"
            placeholder="Ingrese email para aprobar"
            required
          />
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Agregar Email
          </button>
        </div>
      </form>

      <h3 className="text-xl font-semibold mb-4 text-white">
        Emails Aprobados
      </h3>
      {loading ? (
        <p>Cargando emails aprobados...</p>
      ) : (
        <ul className="space-y-2">
          {approvedEmails.map((item) => (
            <li
              key={item.id}
              className="bg-[#151B23] rounded-lg p-2 flex justify-between items-center"
            >
              {editingEmail && editingEmail.id === item.id ? (
                <input
                  type="email"
                  value={editingEmail.email}
                  onChange={handleChange}
                  className="flex-grow mr-2 rounded-md border-gray-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-1 bg-[#262C36] text-white"
                />
              ) : (
                <span className="text-white">{item.email}</span>
              )}
              <div className="flex space-x-2">
                {editingEmail && editingEmail.id === item.id ? (
                  <button
                    onClick={handleSave}
                    className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
