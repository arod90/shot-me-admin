'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { format, addHours, subHours, isWithinInterval } from 'date-fns';

export default function TonightPage() {
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
  const [expandedEvent, setExpandedEvent] = useState(null);

  // Subscription refs
  const timelineSubscriptionRef = useRef(null);
  const checkinsSubscriptionRef = useRef(null);
  const reactionsSubscriptionRef = useRef(null);

  useEffect(() => {
    fetchTodaysEvents();

    const eventsSubscription = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => fetchTodaysEvents()
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      if (timelineSubscriptionRef.current) {
        timelineSubscriptionRef.current.unsubscribe();
      }
      if (checkinsSubscriptionRef.current) {
        checkinsSubscriptionRef.current.unsubscribe();
      }
      if (reactionsSubscriptionRef.current) {
        reactionsSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTimelineEvents();
      setupSubscriptions();
    }
  }, [selectedEvent]);

  const fetchTodaysEvents = async () => {
    try {
      const now = new Date();

      const { data: allEvents, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;

      const activeEvents = allEvents.filter((event) => {
        const eventDate = new Date(event.event_date);
        const eventWindow = {
          start: subHours(eventDate, 2),
          end: addHours(eventDate, 36),
        };
        return isWithinInterval(now, eventWindow);
      });

      setEvents(activeEvents || []);
      if (activeEvents?.length > 0) {
        setSelectedEvent(activeEvents[0]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSubscriptions = () => {
    if (!selectedEvent) return;

    if (timelineSubscriptionRef.current) {
      timelineSubscriptionRef.current.unsubscribe();
    }
    if (checkinsSubscriptionRef.current) {
      checkinsSubscriptionRef.current.unsubscribe();
    }
    if (reactionsSubscriptionRef.current) {
      reactionsSubscriptionRef.current.unsubscribe();
    }

    timelineSubscriptionRef.current = supabase
      .channel(`timeline-${selectedEvent.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `event_id=eq.${selectedEvent.id}`,
        },
        (payload) => {
          console.log('Timeline event change detected:', payload);
          fetchTimelineEvents();
        }
      )
      .subscribe();

    checkinsSubscriptionRef.current = supabase
      .channel(`checkins-${selectedEvent.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
          filter: `event_id=eq.${selectedEvent.id}`,
        },
        () => {
          fetchTimelineEvents();
          fetchCheckedInPeople();
        }
      )
      .subscribe();

    reactionsSubscriptionRef.current = supabase
      .channel(`reactions-${selectedEvent.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_event_reactions',
        },
        () => fetchTimelineEvents()
      )
      .subscribe();
  };

  const fetchTimelineEvents = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select(
          `
          *,
          users (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `
        )
        .eq('event_id', selectedEvent.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

          return {
            ...event,
            reactions: reactionCounts || {},
            created_at: new Date(event.created_at).getTime(),
            uniqueKey: `${event.id}-${event.created_at}`,
          };
        })
      );

      setTimelineEvents(eventsWithReactions);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    }
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
      await fetchTimelineEvents();
    } catch (error) {
      console.error('Error adding announcement:', error);
      Alert.alert('Error', 'Failed to add announcement');
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
      await fetchTimelineEvents();
    } catch (error) {
      console.error('Error adding set time:', error);
      Alert.alert('Error', 'Failed to add set time');
    }
  };

  const handleDeleteTimelineEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      await fetchTimelineEvents();
    } catch (error) {
      console.error('Error deleting timeline event:', error);
      Alert.alert('Error', 'Failed to delete event');
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
      await fetchTimelineEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!selectedEvent) {
    return <div className="no-event">No active events</div>;
  }

  return (
    <div className="h-full overflow-auto p-6 bg-[#262C36]">
      <h2 className="text-2xl font-bold mb-6 text-white">Tonight's Timeline</h2>

      <div className="flex justify-between items-center mb-6">
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
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTimelineEvent(event.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
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
