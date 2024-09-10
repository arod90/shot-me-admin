'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchEvents();
  }, []);

  return (
    <div className="h-full overflow-auto p-6 bg-[#262C36]">
      <h2 className="text-2xl font-bold mb-6 text-white">Próximos Eventos</h2>
      {loading ? (
        <p>Cargando eventos...</p>
      ) : (
        <ul className="space-y-4">
          {upcomingEvents.map((event) => (
            <li key={event.id} className=" rounded-lg p-4 shadow bg-[#151B23]">
              <h3 className="text-xl font-semibold text-white">
                {event.event_name}
              </h3>
              <p className="text-gray-400">
                {new Date(event.event_date).toLocaleString('es-ES')}
              </p>
              <p className="text-gray-400">{event.location}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
