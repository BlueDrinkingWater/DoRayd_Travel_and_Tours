import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DataService from './services/DataService.jsx';

const CalendarBooking = ({ serviceId, onDateSelect, onBookedDatesChange }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (serviceId) {
      fetchBookedDates();
    }
  }, [serviceId]);

  const fetchBookedDates = async () => {
    try {
        const response = await DataService.getAvailability(serviceId);
        if (response.success) {
            setBookedDates(response.data.bookedDates);
            if (onBookedDatesChange) {
                onBookedDatesChange(response.data.bookedDates);
            }
        }
    } catch (error) {
        console.error('Error fetching availability:', error);
    }
  };

  const isDateBooked = (date) => {
    // --- UPDATED FIX: Create a timezone-safe YYYY-MM-DD string ---
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    // --- END OF FIX ---
    return bookedDates.includes(dateString);
  };

  const handleDateSelect = (day) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    // UPDATED: This corrects the timezone issue
    const timezoneOffset = selected.getTimezoneOffset() * 60000;
    const newSelectedDate = new Date(selected.getTime() - timezoneOffset);

    setSelectedDate(newSelectedDate);
    if (onDateSelect) {
      onDateSelect(newSelectedDate.toISOString().split('T')[0]);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) { days.push(<div key={`empty-${i}`} />); }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isBooked = isDateBooked(date);
        const isPast = date < today;
        const isSelected = selectedDate && date.toDateString() === new Date(selectedDate).toDateString();

        let buttonClass = 'p-2 text-center rounded-full transition-colors text-sm ';
        buttonClass += (isBooked || isPast) ? 'bg-gray-200 text-gray-400 cursor-not-allowed line-through' :
                       isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-100';

        days.push(
            <button key={day} disabled={isBooked || isPast} onClick={() => handleDateSelect(day)} type="button" className={buttonClass}>
                {day}
            </button>
        );
    }
    return days;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-center">
        Select Start Date
      </h3>
      
      <div>
        <div className="flex items-center justify-between mb-3 px-2">
            <button type="button" onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100"><ChevronLeft size={20} /></button>
            <h4 className="font-semibold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
            <button type="button" onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
      </div>
    </div>
  );
};

export default CalendarBooking;