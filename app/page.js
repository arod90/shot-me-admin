'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setUpcomingEvents(data);
    }
    setLoading(false);
  }

  const handleEdit = (event) => {
    setEditingEvent({ ...event });
  };

  const handleSave = async (event) => {
    const { data, error } = await supabase
      .from('events')
      .update({
        event_name: event.event_name,
        event_date: event.event_date,
        location: event.location,
      })
      .eq('id', event.id);

    if (error) {
      console.error('Error updating event:', error);
    } else {
      setEditingEvent(null);
      fetchEvents();
    }
  };

  const handleDelete = async (event) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) {
        console.error('Error deleting event:', error);
      } else {
        fetchEvents();
      }
    }
  };

  const handleChange = (e, field) => {
    setEditingEvent({ ...editingEvent, [field]: e.target.value });
  };

  return (
    <div className="h-full overflow-auto p-6 bg-[#262C36]">
      <h2 className="text-2xl font-bold mb-6 text-white">Próximos Eventos</h2>
      {loading ? (
        <p>Cargando eventos...</p>
      ) : (
        <ul className="space-y-4">
          {upcomingEvents.map((event) => (
            <li
              key={event.id}
              className="rounded-lg p-4 shadow bg-[#151B23] flex justify-between items-center"
            >
              {editingEvent && editingEvent.id === event.id ? (
                <div className="flex-grow">
                  <input
                    className="text-xl font-semibold text-white bg-[#262C36] p-1 mb-2 w-full"
                    value={editingEvent.event_name}
                    onChange={(e) => handleChange(e, 'event_name')}
                  />
                  <input
                    className="text-gray-400 bg-[#262C36] p-1 mb-2 w-full"
                    type="datetime-local"
                    value={editingEvent.event_date.slice(0, 16)}
                    onChange={(e) => handleChange(e, 'event_date')}
                  />
                  <input
                    className="text-gray-400 bg-[#262C36] p-1 w-full"
                    value={editingEvent.location}
                    onChange={(e) => handleChange(e, 'location')}
                  />
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {event.event_name}
                  </h3>
                  <p className="text-gray-400">
                    {new Date(event.event_date).toLocaleString('es-ES')}
                  </p>
                  <p className="text-gray-400">{event.location}</p>
                </div>
              )}
              <div className="flex space-x-2">
                {editingEvent && editingEvent.id === event.id ? (
                  <button
                    onClick={() => handleSave(editingEvent)}
                    className="bg-green-500 text-white px-2 py-1 rounded"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(event)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(event)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
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
