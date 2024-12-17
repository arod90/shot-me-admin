'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function Tonight() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [setTime, setSetTime] = useState({
    description: '',
    scheduledTime: '',
  });
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    fetchTodaysEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTimelineEvents();
      subscribeToTimelineUpdates();
    }
  }, [selectedEvent]);

  const fetchTodaysEvents = async () => {
    // Get current time
    const now = new Date();

    // Set up start and end times
    let startTime = new Date();
    let endTime = new Date();

    // If current time is between midnight and 3 PM, look back to previous day at 6 PM
    if (now.getHours() >= 0 && now.getHours() <= 15) {
      startTime.setDate(startTime.getDate() - 1); // Go back one day
      startTime.setHours(18, 0, 0, 0); // 6 PM previous day
      endTime.setHours(15, 0, 0, 0); // 3 PM current day
    } else {
      // If current time is after 3 PM, look at today 6 PM to tomorrow 3 PM
      startTime.setHours(18, 0, 0, 0); // 6 PM today
      endTime.setDate(endTime.getDate() + 1); // Go forward one day
      endTime.setHours(15, 0, 0, 0); // 3 PM next day
    }

    console.log('Fetching events between:', startTime, 'and', endTime);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', startTime.toISOString())
      .lte('event_date', endTime.toISOString())
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }

    console.log('Found events:', data);
    setEvents(data || []);

    if (data && data.length > 0) {
      setSelectedEvent(data[0]);
    }
    setLoading(false);
  };

  const fetchTimelineEvents = async () => {
    if (!selectedEvent) return;

    const { data, error } = await supabase
      .from('timeline_events')
      .select(
        `
        *,
        users (id, first_name, last_name)
      `
      )
      .eq('event_id', selectedEvent.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching timeline events:', error);
      return;
    }

    // Also fetch reactions for each timeline event
    const eventsWithReactions = await Promise.all(
      data.map(async (event) => {
        const { data: reactions } = await supabase
          .from('timeline_event_reactions')
          .select('reaction')
          .eq('timeline_event_id', event.id);

        const reactionCounts = reactions?.reduce((acc, curr) => {
          acc[curr.reaction] = (acc[curr.reaction] || 0) + 1;
          return acc;
        }, {});

        return { ...event, reactions: reactionCounts };
      })
    );

    setTimelineEvents(eventsWithReactions);
  };

  const subscribeToTimelineUpdates = () => {
    const subscription = supabase
      .channel('timeline_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `event_id=eq.${selectedEvent.id}`,
        },
        () => {
          fetchTimelineEvents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('timeline_events').insert({
        event_id: selectedEvent.id,
        description: announcement,
        event_type: 'announcement',
        event_category: 'announcement',
      });

      if (error) throw error;
      setAnnouncement('');
      fetchTimelineEvents();
    } catch (error) {
      console.error('Error adding announcement:', error);
    }
  };

  const getCurrentDateWithTime = (timeString) => {
    const today = new Date();
    const [hours, minutes] = timeString.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return today.toISOString();
  };

  const handleAddSetTime = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('timeline_events').insert({
        event_id: selectedEvent.id,
        description: setTime.description,
        event_type: 'set_time',
        event_category: 'set_time',
        scheduled_for: setTime.scheduledTime,
        is_scheduled: true,
      });

      if (error) throw error;
      setSetTime({ description: '', scheduledTime: '' });
      fetchTimelineEvents();
    } catch (error) {
      console.error('Error adding set time:', error);
    }
  };

  const handleDeleteTimelineEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
      } else {
        fetchTimelineEvents();
      }
    }
  };

  const handleEditTimelineEvent = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({
          description: editingEvent.description,
          scheduled_for:
            editingEvent.event_category === 'set_time'
              ? editingEvent.scheduled_for
              : null,
        })
        .eq('id', editingEvent.id);

      if (error) throw error;
      setEditingEvent(null);
      fetchTimelineEvents();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  return (
    <div className="h-full overflow-auto p-6 bg-[#262C36]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Tonight's Timeline</h2>
        <select
          className="bg-[#151B23] text-white p-2 rounded"
          value={selectedEvent?.id || ''}
          onChange={(e) => {
            const event = events.find((ev) => ev.id === e.target.value);
            setSelectedEvent(event);
          }}
        >
          <option value="">Select Event</option>
          {events?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.event_name} -{' '}
              {format(new Date(event.event_date), 'h:mm a')}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <div className="grid grid-cols-2 gap-6">
          {/* Forms Section */}
          <div className="space-y-6">
            {/* Announcement Form */}
            <div className="bg-[#151B23] p-4 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">
                {editingEvent?.event_category === 'announcement'
                  ? 'Edit Announcement'
                  : 'Add Announcement'}
              </h3>
              <form
                onSubmit={
                  editingEvent?.event_category === 'announcement'
                    ? handleEditTimelineEvent
                    : handleAddAnnouncement
                }
                className="space-y-4"
              >
                <textarea
                  value={
                    editingEvent?.event_category === 'announcement'
                      ? editingEvent.description
                      : announcement
                  }
                  onChange={(e) =>
                    editingEvent?.event_category === 'announcement'
                      ? setEditingEvent((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      : setAnnouncement(e.target.value)
                  }
                  className="w-full p-2 bg-[#262C36] text-white rounded"
                  placeholder="Enter announcement..."
                  rows={3}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-[#FF5252] text-white px-4 py-2 rounded hover:bg-opacity-90"
                  >
                    {editingEvent?.event_category === 'announcement'
                      ? 'Update Announcement'
                      : 'Post Announcement'}
                  </button>
                  {editingEvent?.event_category === 'announcement' && (
                    <button
                      type="button"
                      onClick={() => setEditingEvent(null)}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-opacity-90"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Set Time Form */}
            <div className="bg-[#151B23] p-4 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">
                {editingEvent?.event_category === 'set_time'
                  ? 'Edit DJ Set Time'
                  : 'Add DJ Set Time'}
              </h3>
              <form
                onSubmit={
                  editingEvent?.event_category === 'set_time'
                    ? handleEditTimelineEvent
                    : handleAddSetTime
                }
                className="space-y-4"
              >
                <input
                  type="text"
                  value={
                    editingEvent?.event_category === 'set_time'
                      ? editingEvent.description
                      : setTime.description
                  }
                  onChange={(e) =>
                    editingEvent?.event_category === 'set_time'
                      ? setEditingEvent((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      : setSetTime((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                  }
                  className="w-full p-2 bg-[#262C36] text-white rounded"
                  placeholder="DJ/Artist name..."
                  required
                />
                <input
                  type="time"
                  value={
                    editingEvent?.event_category === 'set_time'
                      ? new Date(editingEvent.scheduled_for).toLocaleTimeString(
                          'en-US',
                          { hour12: false, hour: '2-digit', minute: '2-digit' }
                        )
                      : setTime.scheduledTime
                  }
                  onChange={(e) => {
                    const newTime = getCurrentDateWithTime(e.target.value);
                    editingEvent?.event_category === 'set_time'
                      ? setEditingEvent((prev) => ({
                          ...prev,
                          scheduled_for: newTime,
                        }))
                      : setSetTime((prev) => ({
                          ...prev,
                          scheduledTime: newTime,
                        }));
                  }}
                  className="w-full p-2 bg-[#262C36] text-white rounded"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-[#FF5252] text-white px-4 py-2 rounded hover:bg-opacity-90"
                  >
                    {editingEvent?.event_category === 'set_time'
                      ? 'Update Set Time'
                      : 'Add Set Time'}
                  </button>
                  {editingEvent?.event_category === 'set_time' && (
                    <button
                      type="button"
                      onClick={() => setEditingEvent(null)}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-opacity-90"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-[#151B23] p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Timeline</h3>
            <div className="space-y-4">
              {timelineEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg ${
                    event.event_category === 'announcement'
                      ? 'bg-[#FF5252] bg-opacity-20'
                      : 'bg-[#262C36]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white">{event.description}</p>
                      {event.scheduled_for && (
                        <p className="text-[#FF5252] text-sm mt-1">
                          {format(new Date(event.scheduled_for), 'h:mm a')}
                        </p>
                      )}
                      <p className="text-gray-400 text-sm mt-1">
                        {format(new Date(event.created_at), 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {event.reactions &&
                        Object.entries(event.reactions).length > 0 && (
                          <div className="flex gap-2">
                            {Object.entries(event.reactions).map(
                              ([reaction, count]) => (
                                <span
                                  key={reaction}
                                  className="bg-[#333333] px-2 py-1 rounded-full text-sm"
                                >
                                  {reaction} {count}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingEvent(event)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTimelineEvent(event.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
