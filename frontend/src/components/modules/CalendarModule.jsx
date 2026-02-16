import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Target, Calendar as CalendarIcon, AlertCircle, Focus, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import ModuleHeader from './ModuleHeader';

// Event types with colors
const EVENT_TYPES = {
  meeting: { label: 'Schůzka', color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500' },
  focus: { label: 'Fokus', color: 'bg-purple-500', textColor: 'text-purple-400', borderColor: 'border-purple-500' },
  deadline: { label: 'Deadline', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500' },
  reminder: { label: 'Připomínka', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500' }
};

const VIEWS = {
  day: 'Denní',
  week: 'Týdenní',
  month: 'Měsíční'
};

const DAYS_CZ = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const MONTHS_CZ = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

// Helper to get Monday of the week
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Helper to format date for storage
const formatDateKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const CalendarModule = () => {
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(() => {
    // Initialize from localStorage immediately
    const stored = localStorage.getItem('steward_calendar_events');
    return stored ? JSON.parse(stored) : [];
  });
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(9);
  const [draggedEvent, setDraggedEvent] = useState(null);

  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('steward_calendar_events', JSON.stringify(events));
  }, [events]);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting',
    project: ''
  });

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openNewEventForm = (date, hour = 9) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setFormData({
      title: '',
      date: formatDateKey(date),
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime: `${String(hour + 1).padStart(2, '0')}:00`,
      type: 'meeting',
      project: ''
    });
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const openEditEventForm = (event, e) => {
    e.stopPropagation();
    setFormData({
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      project: event.project || ''
    });
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = () => {
    if (!formData.title.trim()) return;

    if (editingEvent) {
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id ? { ...e, ...formData } : e
      ));
    } else {
      const newEvent = {
        id: `event-${Date.now()}`,
        ...formData
      };
      setEvents(prev => [...prev, newEvent]);
    }
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = () => {
    if (editingEvent) {
      setEvents(prev => prev.filter(e => e.id !== editingEvent.id));
      setShowEventForm(false);
      setEditingEvent(null);
    }
  };

  const handleDragStart = (event, e) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (date, hour, e) => {
    e.preventDefault();
    if (draggedEvent) {
      const duration = getEventDuration(draggedEvent);
      const newStartHour = hour;
      const newEndHour = newStartHour + duration;
      
      setEvents(prev => prev.map(ev => 
        ev.id === draggedEvent.id 
          ? {
              ...ev,
              date: formatDateKey(date),
              startTime: `${String(newStartHour).padStart(2, '0')}:00`,
              endTime: `${String(Math.min(newEndHour, 23)).padStart(2, '0')}:00`
            }
          : ev
      ));
      setDraggedEvent(null);
    }
  };

  const getEventDuration = (event) => {
    const start = parseInt(event.startTime.split(':')[0]);
    const end = parseInt(event.endTime.split(':')[0]);
    return end - start;
  };

  const getEventsForDate = (date) => {
    const dateKey = formatDateKey(date);
    return events.filter(e => e.date === dateKey);
  };

  const getEventsForHour = (date, hour) => {
    const dateKey = formatDateKey(date);
    return events.filter(e => {
      if (e.date !== dateKey) return false;
      const startHour = parseInt(e.startTime.split(':')[0]);
      return startHour === hour;
    });
  };

  // Render functions for different views
  const renderDayView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
    
    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="text-center py-2 border-b border-cyan-500/20">
          <span className="text-lg font-medium text-white">
            {currentDate.getDate()}. {MONTHS_CZ[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          {hours.map(hour => {
            const hourEvents = getEventsForHour(currentDate, hour);
            return (
              <div 
                key={hour}
                className="flex border-b border-cyan-500/10 min-h-[60px] hover:bg-cyan-500/5 cursor-pointer transition-colors"
                onClick={() => openNewEventForm(currentDate, hour)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(currentDate, hour, e)}
              >
                <div className="w-16 flex-shrink-0 text-xs text-gray-500 p-2 border-r border-cyan-500/10">
                  {hour}:00
                </div>
                <div className="flex-1 p-1 relative">
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={(e) => handleDragStart(event, e)}
                      onClick={(e) => openEditEventForm(event, e)}
                      className={`absolute inset-x-1 rounded px-2 py-1 text-xs cursor-pointer hover:opacity-80 transition-opacity ${EVENT_TYPES[event.type]?.color || 'bg-cyan-500'}`}
                      style={{ 
                        height: `${getEventDuration(event) * 60 - 4}px`,
                        zIndex: 10
                      }}
                    >
                      <div className="font-medium text-white truncate">{event.title}</div>
                      <div className="text-white/70">{event.startTime} - {event.endTime}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const monday = getMonday(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);
    const today = formatDateKey(new Date());

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex border-b border-cyan-500/20">
          <div className="w-16 flex-shrink-0"></div>
          {days.map((day, i) => {
            const isToday = formatDateKey(day) === today;
            return (
              <div 
                key={i} 
                className={`flex-1 text-center py-2 border-l border-cyan-500/10 ${isToday ? 'bg-cyan-500/10' : ''}`}
              >
                <div className="text-xs text-gray-400">{DAYS_CZ[i]}</div>
                <div className={`text-lg font-medium ${isToday ? 'text-cyan-400' : 'text-white'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        {/* Time grid */}
        <div className="flex-1 overflow-auto">
          {hours.map(hour => (
            <div key={hour} className="flex min-h-[50px] border-b border-cyan-500/10">
              <div className="w-16 flex-shrink-0 text-xs text-gray-500 p-1 border-r border-cyan-500/10">
                {hour}:00
              </div>
              {days.map((day, i) => {
                const hourEvents = getEventsForHour(day, hour);
                const isToday = formatDateKey(day) === today;
                return (
                  <div
                    key={i}
                    className={`flex-1 border-l border-cyan-500/10 p-0.5 hover:bg-cyan-500/5 cursor-pointer transition-colors relative ${isToday ? 'bg-cyan-500/5' : ''}`}
                    onClick={() => openNewEventForm(day, hour)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(day, hour, e)}
                  >
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => handleDragStart(event, e)}
                        onClick={(e) => openEditEventForm(event, e)}
                        className={`absolute inset-x-0.5 rounded px-1 py-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity ${EVENT_TYPES[event.type]?.color || 'bg-cyan-500'}`}
                        style={{ 
                          height: `${getEventDuration(event) * 50 - 2}px`,
                          zIndex: 10
                        }}
                      >
                        <div className="font-medium text-white truncate text-[10px]">{event.title}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();
    const today = formatDateKey(new Date());

    const cells = [];
    for (let i = 0; i < startDay; i++) {
      cells.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(new Date(year, month, i));
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-cyan-500/20">
          {DAYS_CZ.map(day => (
            <div key={day} className="text-center py-2 text-xs text-gray-400">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {cells.map((date, i) => {
            const isToday = date && formatDateKey(date) === today;
            const dayEvents = date ? getEventsForDate(date) : [];
            return (
              <div
                key={i}
                className={`border-b border-r border-cyan-500/10 p-1 min-h-[80px] ${date ? 'hover:bg-cyan-500/5 cursor-pointer' : 'bg-gray-900/30'} transition-colors ${isToday ? 'bg-cyan-500/10' : ''}`}
                onClick={() => date && openNewEventForm(date)}
              >
                {date && (
                  <>
                    <div className={`text-sm mb-1 ${isToday ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => openEditEventForm(event, e)}
                          className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${EVENT_TYPES[event.type]?.color || 'bg-cyan-500'} text-white`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-gray-400">+{dayEvents.length - 3} dalších</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col text-gray-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-cyan-500/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="text-xs text-cyan-400 hover:bg-cyan-500/10"
          >
            Dnes
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7 text-gray-400 hover:text-cyan-400">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7 text-gray-400 hover:text-cyan-400">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-white ml-2">
            {MONTHS_CZ[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-cyan-500/10 rounded-lg p-0.5">
          {Object.entries(VIEWS).map(([key, label]) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => setView(key)}
              data-testid={`calendar-view-${key}`}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                view === key 
                  ? 'bg-cyan-500 text-white' 
                  : 'text-gray-400 hover:text-cyan-400'
              }`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-hidden">
        {view === 'day' && renderDayView()}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0f1d35] border border-cyan-500/30 rounded-xl p-4 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {editingEvent ? 'Upravit událost' : 'Nová událost'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEventForm(false)}
                className="h-7 w-7 text-gray-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Název</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Název události"
                  className="bg-cyan-500/5 border-cyan-500/20 text-white text-sm"
                  data-testid="event-title-input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Datum</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-cyan-500/5 border-cyan-500/20 text-white text-sm"
                    data-testid="event-date-input"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Typ</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-md text-white text-sm p-2"
                    data-testid="event-type-select"
                  >
                    {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key} className="bg-[#0f1d35]">{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Od</label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="bg-cyan-500/5 border-cyan-500/20 text-white text-sm"
                    data-testid="event-start-time"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Do</label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="bg-cyan-500/5 border-cyan-500/20 text-white text-sm"
                    data-testid="event-end-time"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Projekt (volitelné)</label>
                <Input
                  value={formData.project}
                  onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                  placeholder="Název projektu"
                  className="bg-cyan-500/5 border-cyan-500/20 text-white text-sm"
                  data-testid="event-project-input"
                />
              </div>

              {/* Type color preview */}
              <div className="flex items-center gap-2 pt-1">
                <div className={`w-3 h-3 rounded-full ${EVENT_TYPES[formData.type]?.color}`}></div>
                <span className={`text-xs ${EVENT_TYPES[formData.type]?.textColor}`}>
                  {EVENT_TYPES[formData.type]?.label}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                {editingEvent && (
                  <Button
                    variant="ghost"
                    onClick={handleDeleteEvent}
                    data-testid="event-delete-btn"
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Smazat
                  </Button>
                )}
                <div className="flex-1"></div>
                <Button
                  variant="ghost"
                  onClick={() => setShowEventForm(false)}
                  data-testid="event-cancel-btn"
                  className="text-gray-400 hover:bg-cyan-500/10"
                >
                  Zrušit
                </Button>
                <Button
                  onClick={handleSaveEvent}
                  data-testid="event-save-btn"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {editingEvent ? 'Uložit' : 'Vytvořit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarModule;
