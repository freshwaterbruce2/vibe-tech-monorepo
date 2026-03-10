import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import '@/styles/calendar.css';
import { invoke } from '@tauri-apps/api/core';
import { format } from 'date-fns';
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Calendar, Views, dateFnsLocalizer, View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import {
    getDay,
    parse,
    startOfWeek
} from 'date-fns';
import { enUS } from 'date-fns/locale';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
}

interface BackendEvent {
  id: string;
  title: string;
  description: string;
  date: string;
}

const CalendarPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '' });

  const fetchEvents = useCallback(async () => {
    try {
      const backendEvents = await invoke<BackendEvent[]>('get_calendar_events');
      const parsedEvents = backendEvents.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start: new Date(e.date),
        end: new Date(new Date(e.date).getTime() + 60 * 60 * 1000), // 1 hour default
      }));
      setEvents(parsedEvents);
    } catch (e) {
      console.error('Failed to fetch events:', e);
      toast({ title: 'Error', description: 'Failed to load events', variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEvents();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setSelectedEvent(null);
    setNewEvent({ title: '', description: '' });
    setIsDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedSlot(null);
    setNewEvent({ title: event.title, description: event.description });
    setIsDialogOpen(true);
  }, []);

  const handleSaveEvent = async () => {
    if (newEvent.title.trim() === '') return;

    const eventDate = selectedSlot?.start ?? selectedEvent?.start ?? new Date();
    const eventToSave = {
      id: selectedEvent?.id ?? Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description,
      date: eventDate.toISOString(),
    };

    try {
      await invoke('add_calendar_event', { event: eventToSave });
      void fetchEvents();
      setIsDialogOpen(false);
      setNewEvent({ title: '', description: '' });
      toast({
        title: selectedEvent ? 'Event updated' : 'Event added',
        description: `"${eventToSave.title}" has been ${selectedEvent ? 'updated' : 'added'} to your calendar`,
      });
    } catch (e) {
      console.error('Failed to save event:', e);
      toast({ title: 'Error', description: 'Failed to save event', variant: 'destructive' });
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await invoke('delete_calendar_event', { id: selectedEvent.id });
      void fetchEvents();
      setIsDialogOpen(false);
      toast({
        title: 'Event removed',
        description: `"${selectedEvent.title}" has been removed from your calendar`,
        variant: 'destructive',
      });
    } catch (e) {
      console.error('Failed to delete event:', e);
      toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
    }
  };

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(currentDate);
    if (action === 'TODAY') {
      setCurrentDate(new Date());
    } else if (action === 'PREV') {
      if (currentView === Views.MONTH) {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (currentView === Views.WEEK) {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
      setCurrentDate(newDate);
    } else {
      if (currentView === Views.MONTH) {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (currentView === Views.WEEK) {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      setCurrentDate(newDate);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <CalendarCheck className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Calendar</h1>
              <p className="text-gray-400 text-sm">Plan and manage your schedule</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setSelectedSlot({ start: new Date(), end: new Date() });
              setSelectedEvent(null);
              setNewEvent({ title: '', description: '' });
              setIsDialogOpen(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>

        {/* Custom Navigation */}
        <div className="flex items-center justify-between mb-4 bg-black/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('PREV')}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('TODAY')}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate('NEXT')}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="text-xl font-semibold text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h2>

          <div className="flex items-center gap-1">
            {[
              { key: Views.MONTH, label: 'Month' },
              { key: Views.WEEK, label: 'Week' },
              { key: Views.DAY, label: 'Day' },
              { key: Views.AGENDA, label: 'Agenda' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={currentView === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView(key)}
                className={
                  currentView === key
                    ? 'bg-purple-600 text-white'
                    : 'border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-purple-500/20 p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 'calc(100vh - 300px)', minHeight: 500 }}
            view={currentView}
            onView={(view: View) => setCurrentView(view)}
            date={currentDate}
            onNavigate={(date: Date) => setCurrentDate(date)}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent as (event: unknown) => void}
            popup
            toolbar={false}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          />
        </div>

        {/* Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gray-950 border-purple-500/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-purple-300">
                {selectedEvent ? 'Edit Event' : 'New Event'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedSlot
                  ? `Creating event for ${format(selectedSlot.start, 'MMMM d, yyyy')}`
                  : selectedEvent
                  ? `Editing event on ${format(selectedEvent.start, 'MMMM d, yyyy')}`
                  : 'Fill in the event details'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm text-gray-300">
                  Title
                </label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                  className="bg-gray-900 border-purple-500/30 text-white focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm text-gray-300">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event description (optional)"
                  className="bg-gray-900 border-purple-500/30 text-white focus:border-purple-500 min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              {selectedEvent && (
                <Button
                  variant="destructive"
                  onClick={() => void handleDeleteEvent()}
                  className="mr-auto"
                >
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-purple-500/30 text-purple-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveEvent()}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {selectedEvent ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CalendarPage;
