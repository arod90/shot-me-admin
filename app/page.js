'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);

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
    setEditingEvent({
      ...event,
      lineup: event.lineup || [],
      price_tiers: event.price_tiers || {},
    });
    setExpandedEvent(event.id);
  };

  const handleSave = async (event) => {
    const { data, error } = await supabase
      .from('events')
      .update({
        event_name: event.event_name,
        event_date: event.event_date,
        location: event.location,
        description: event.description,
        lineup: event.lineup,
        price_tiers: event.price_tiers,
        dress_code: event.dress_code,
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

  const handleLineupChange = (index, value) => {
    const newLineup = [...(editingEvent.lineup || [])];
    newLineup[index] = value;
    setEditingEvent({ ...editingEvent, lineup: newLineup });
  };

  const handleDeleteLineupItem = (index) => {
    const newLineup = editingEvent.lineup.filter((_, i) => i !== index);
    setEditingEvent({ ...editingEvent, lineup: newLineup });
  };

  const handlePriceTierChange = (index, field, value) => {
    const newPriceTiers = { ...(editingEvent.price_tiers || {}) };
    if (field === 'name') {
      const oldName = Object.keys(newPriceTiers)[index];
      const oldValue = newPriceTiers[oldName];
      delete newPriceTiers[oldName];
      newPriceTiers[value] = oldValue;
    } else {
      const name = Object.keys(newPriceTiers)[index];
      newPriceTiers[name] = value;
    }
    setEditingEvent({ ...editingEvent, price_tiers: newPriceTiers });
  };

  const handleDeletePriceTier = (tierName) => {
    const newPriceTiers = { ...editingEvent.price_tiers };
    delete newPriceTiers[tierName];
    setEditingEvent({ ...editingEvent, price_tiers: newPriceTiers });
  };

  const toggleExpand = (eventId) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
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
              className="rounded-lg p-4 shadow bg-[#151B23] cursor-pointer"
              onClick={() => toggleExpand(event.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {event.event_name}
                  </h3>
                  <p className="text-gray-400">
                    {new Date(event.event_date).toLocaleString('es-ES')}
                  </p>
                  <p className="text-gray-400">{event.location}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(event);
                    }}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(event);
                    }}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {(expandedEvent === event.id ||
                editingEvent?.id === event.id) && (
                <div className="mt-4">
                  {editingEvent?.id === event.id ? (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="event_name"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Event Name
                        </label>
                        <input
                          id="event_name"
                          className="w-full p-2 mt-1 bg-[#262C36] text-white rounded"
                          value={editingEvent.event_name}
                          onChange={(e) => handleChange(e, 'event_name')}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="event_date"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Event Date
                        </label>
                        <input
                          id="event_date"
                          className="w-full p-2 mt-1 bg-[#262C36] text-white rounded"
                          type="datetime-local"
                          value={editingEvent.event_date.slice(0, 16)}
                          onChange={(e) => handleChange(e, 'event_date')}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="location"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Location
                        </label>
                        <input
                          id="location"
                          className="w-full p-2 mt-1 bg-[#262C36] text-white rounded"
                          value={editingEvent.location}
                          onChange={(e) => handleChange(e, 'location')}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="description"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Description
                        </label>
                        <textarea
                          id="description"
                          className="w-full p-2 mt-1 bg-[#262C36] text-white rounded"
                          value={editingEvent.description}
                          onChange={(e) => handleChange(e, 'description')}
                          rows="3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Lineup
                        </label>
                        {(editingEvent.lineup || []).map((artist, index) => (
                          <div key={index} className="flex mb-2">
                            <input
                              className="flex-grow p-2 mr-2 bg-[#262C36] text-white rounded"
                              value={artist}
                              onChange={(e) =>
                                handleLineupChange(index, e.target.value)
                              }
                              placeholder="Artist name"
                            />
                            <button
                              onClick={() => handleDeleteLineupItem(index)}
                              className="bg-red-500 text-white px-2 py-1 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            setEditingEvent({
                              ...editingEvent,
                              lineup: [...(editingEvent.lineup || []), ''],
                            })
                          }
                          className="bg-green-500 text-white px-2 py-1 rounded"
                        >
                          Add Artist
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Price Tiers
                        </label>
                        {Object.entries(editingEvent.price_tiers || {}).map(
                          ([tier, price], index) => (
                            <div key={index} className="flex mb-2">
                              <input
                                className="w-1/3 p-2 mr-2 bg-[#262C36] text-white rounded"
                                value={tier}
                                onChange={(e) =>
                                  handlePriceTierChange(
                                    index,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="Tier name"
                              />
                              <input
                                className="w-1/3 p-2 mr-2 bg-[#262C36] text-white rounded"
                                type="number"
                                value={price}
                                onChange={(e) =>
                                  handlePriceTierChange(
                                    index,
                                    'price',
                                    e.target.value
                                  )
                                }
                                placeholder="Price"
                              />
                              <button
                                onClick={() => handleDeletePriceTier(tier)}
                                className="bg-red-500 text-white px-2 py-1 rounded"
                              >
                                Delete
                              </button>
                            </div>
                          )
                        )}
                        <button
                          onClick={() =>
                            setEditingEvent({
                              ...editingEvent,
                              price_tiers: {
                                ...(editingEvent.price_tiers || {}),
                                '': '',
                              },
                            })
                          }
                          className="bg-green-500 text-white px-2 py-1 rounded"
                        >
                          Add Price Tier
                        </button>
                      </div>
                      <div>
                        <label
                          htmlFor="dress_code"
                          className="block text-sm font-medium text-gray-300"
                        >
                          Dress Code
                        </label>
                        <input
                          id="dress_code"
                          className="w-full p-2 mt-1 bg-[#262C36] text-white rounded"
                          value={editingEvent.dress_code}
                          onChange={(e) => handleChange(e, 'dress_code')}
                        />
                      </div>
                      <button
                        onClick={() => handleSave(editingEvent)}
                        className="bg-green-500 text-white px-4 py-2 rounded"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="text-white">
                      <p>
                        <strong>Description:</strong> {event.description}
                      </p>
                      <p>
                        <strong>Lineup:</strong>{' '}
                        {event.lineup ? event.lineup.join(', ') : 'N/A'}
                      </p>
                      <p>
                        <strong>Price Tiers:</strong>
                      </p>
                      <ul>
                        {event.price_tiers &&
                          Object.entries(event.price_tiers).map(
                            ([tier, price], index) => (
                              <li key={index}>
                                {tier}: ${price}
                              </li>
                            )
                          )}
                      </ul>
                      <p>
                        <strong>Dress Code:</strong> {event.dress_code || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
