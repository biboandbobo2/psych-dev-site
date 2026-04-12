import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import { BookingLayout } from './booking/BookingLayout';
import { StartStep } from './booking/StartStep';
import { RoomSelector } from './booking/RoomSelector';
import { DatePicker } from './booking/DatePicker';
// DurationPicker removed — duration is now selected via week schedule toggle
import { TimeSlotGrid } from './booking/TimeSlotGrid';
import { AllRoomsGrid } from './booking/AllRoomsGrid';
import { BookingCart } from './booking/BookingCart';
import { BookingConfirmation } from './booking/BookingConfirmation';
import { EventsSection } from './booking/EventsSection';
import { WeekSchedule } from './booking/WeekSchedule';
import { useRooms, useTimeSlots, useAllRoomsSlots, useBooking } from './booking/useBookingApi';
import { useWeekSchedule } from './booking/useWeekSchedule';
import { DURATION_OPTIONS } from './booking/types';
import { BOOKING_UTC_OFFSET } from '../lib/bookingCancellation';
import { CheckIcon, ChevronLeftIcon } from './booking/icons';
import type { Room, TimeSlot, CartItem, BookingStep, BookingFlow, BookingFormData, BookingResult, DurationOption } from './booking/types';

/** alteg.io returns one slot per bookable start time — each is a complete booking, not a 30-min fragment */

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'auto' });

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

function getSteps(flow: BookingFlow | null): { key: BookingStep; label: string }[] {
  if (flow === 'date-first') {
    return [
      { key: 'date', label: 'Дата' },
      { key: 'allrooms', label: 'Расписание' },
      { key: 'confirm', label: 'Подтверждение' },
    ];
  }
  // room-first
  return [
    { key: 'room', label: 'Кабинет' },
    { key: 'date', label: 'Дата' },
    { key: 'time', label: 'Время' },
    { key: 'confirm', label: 'Подтверждение' },
  ];
}

export function BookingPage() {
  const [flow, setFlow] = useState<BookingFlow | null>(null);
  const [step, setStep] = useState<BookingStep>('start');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATION_OPTIONS[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bookingResults, setBookingResults] = useState<BookingResult[] | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleRefresh, setScheduleRefresh] = useState(0);

  const { rooms } = useRooms();
  const currentServiceId = selectedDuration.serviceId;
  const currentDurationSec = selectedDuration.seconds;
  const { slots, loading: slotsLoading } = useTimeSlots(
    flow === 'room-first' ? (selectedRoom?.id ?? null) : null,
    selectedDate,
    currentServiceId,
    currentDurationSec,
  );
  const showAllRooms = flow === 'date-first' && selectedDate;
  const { slotsByRoom, loading: allRoomsSlotsLoading } = useAllRoomsSlots(
    rooms,
    showAllRooms ? selectedDate : null,
    currentServiceId,
    currentDurationSec,
  );
  const { book, submitting } = useBooking();
  const { busy: weekBusy, loading: weekLoading, weekDates } = useWeekSchedule(rooms, weekOffset, scheduleRefresh);

  // Handle ?room=ID from photos page
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const roomId = searchParams.get('room');
    if (!roomId || !rooms.length) return;
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      setFlow('room-first');
      setSelectedRoom(room);
      setSelectedDate(null);
      setSelectedDuration(DURATION_OPTIONS[0]);
      setStep('date');
      setSearchParams({}, { replace: true });
    }
  }, [rooms, searchParams, setSearchParams]);

  const steps = useMemo(() => getSteps(flow), [flow]);
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // --- Flow selection ---
  const handleFlowSelect = useCallback((f: BookingFlow) => {
    scrollTop();
    setFlow(f);
    setSelectedDuration(DURATION_OPTIONS[0]);
    if (f === 'room-first') setStep('room');
    else setStep('date');
  }, []);

  // --- Navigation ---
  const handleRoomSelect = useCallback((room: Room) => {
    scrollTop();
    setSelectedRoom(room);
    setSelectedDate(null);
    setStep('date');
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    scrollTop();
    setSelectedDate(date);
    setSelectedDuration(DURATION_OPTIONS[0]); // always reset to 1h when entering time step
    setCart([]);
    if (flow === 'room-first') {
      setStep('time');
    } else {
      setStep('allrooms');
    }
  }, [flow]);

  const handleDurationChange = useCallback((d: DurationOption) => {
    setSelectedDuration(d);
    // Clear cart when duration changes since old selections may not fit
    setCart([]);
  }, []);

  // --- Slot toggling (room-first: single room) ---
  const handleToggleSlot = useCallback(
    (slot: TimeSlot) => {
      if (!selectedRoom || !selectedDate) return;
      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.room.id === selectedRoom.id && item.date === selectedDate && item.slot.time === slot.time
        );
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        return [...prev, { room: selectedRoom, date: selectedDate, slot }];
      });
    },
    [selectedRoom, selectedDate]
  );

  // --- Slot toggling (allrooms grid) ---
  const handleAllRoomsToggle = useCallback(
    (room: Room, slot: TimeSlot) => {
      if (!selectedDate) return;
      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.room.id === room.id && item.date === selectedDate && item.slot.time === slot.time
        );
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        return [...prev, { room, date: selectedDate, slot }];
      });
    },
    [selectedDate]
  );

  // --- Quick booking from week schedule ---
  const handleScheduleSlotClick = useCallback(
    (room: Room, date: string, time: string, dur: DurationOption) => {
      scrollTop();
      const datetime = new Date(`${date}T${time}:00${BOOKING_UTC_OFFSET}`).getTime() / 1000;
      const slot: TimeSlot = { time, datetime, seanceLength: dur.seconds, available: true };
      setFlow('room-first');
      setSelectedRoom(room);
      setSelectedDate(date);
      setSelectedDuration(dur);
      setCart([{ room, date, slot }]);
      setStep('confirm');
    },
    []
  );

  const handleRemoveFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirmClick = useCallback(() => { scrollTop(); setStep('confirm'); }, []);
  const handleBack = useCallback(() => {
    scrollTop();
    if (flow === 'room-first') setStep('time');
    else setStep('allrooms');
  }, [flow]);

  // --- Booking ---
  const handleSubmit = useCallback(
    async (data: BookingFormData) => {
      const bookingItems = cart.map((item) => ({
        roomId: item.room.id,
        datetime: `${item.date}T${item.slot.time}:00${BOOKING_UTC_OFFSET}`,
        serviceId: currentServiceId,
      }));
      const results = await book(bookingItems, data);
      setBookingResults(results);
      setCart([]);
      setScheduleRefresh((n) => n + 1);
    },
    [cart, book, currentServiceId]
  );

  const goToStep = useCallback(
    (targetStep: BookingStep) => {
      const targetIndex = steps.findIndex((s) => s.key === targetStep);
      if (targetIndex <= currentStepIndex) { scrollTop(); setStep(targetStep); }
    },
    [currentStepIndex, steps]
  );

  const reset = useCallback(() => {
    scrollTop();
    setBookingResults(null);
    setFlow(null);
    setStep('start');
    setSelectedRoom(null);
    setSelectedDate(null);
    setSelectedDuration(DURATION_OPTIONS[0]);
    setCart([]);
  }, []);

  const showCartBar = step === 'time' || step === 'allrooms';

  return (
    <BookingLayout bookingStep={step}>
      <Helmet>
        <title>Бронирование кабинетов — Психологический центр ДОМ</title>
        <meta name="description" content="Забронируйте кабинет в психологическом центре ДОМ для консультаций, тренингов и мероприятий." />
      </Helmet>

      {bookingResults ? (
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-16">
          <div className="max-w-lg mx-auto text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-dom-green/10 mx-auto mb-6 flex items-center justify-center">
              <CheckIcon className="w-10 h-10 text-dom-green" />
            </motion.div>
            <h2 className="text-3xl font-bold text-dom-gray-900 mb-2">Бронирование подтверждено!</h2>
            <p className="text-dom-gray-500 mb-8">Подтверждение отправлено на email</p>
            <div className="bg-dom-cream rounded-2xl p-6 text-left mb-8 space-y-3">
              {bookingResults.map((r) => (
                <div key={r.record_id} className="flex items-center justify-between bg-white rounded-xl p-4">
                  <p className="font-medium text-dom-gray-900">Запись #{r.record_id}</p>
                  <span className="text-xs bg-dom-green/10 text-dom-green px-3 py-1 rounded-full font-medium">Подтверждено</span>
                </div>
              ))}
            </div>
            <button onClick={reset} className="bg-dom-green hover:bg-dom-green-hover text-white font-medium px-8 py-3 rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg">
              Забронировать ещё
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Stepper */}
          {step !== 'start' && (
            <div className="bg-white border-b border-dom-gray-200 sticky top-0 z-30">
              <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
                <div className="flex items-center gap-2 py-4 overflow-x-auto">
                  <button onClick={reset} className="flex items-center px-3 py-2 rounded-lg text-sm text-dom-gray-500 hover:text-dom-green hover:bg-dom-cream transition-all mr-1">
                    <ChevronLeftIcon />
                  </button>
                  {steps.map((s, i) => {
                    const isActive = s.key === step;
                    const isPast = i < currentStepIndex;
                    return (
                      <button key={s.key} onClick={() => goToStep(s.key)} disabled={i > currentStepIndex}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${isActive ? 'bg-dom-green text-white' : isPast ? 'bg-dom-cream text-dom-green cursor-pointer hover:bg-dom-green/10' : 'text-dom-gray-500 cursor-not-allowed'}`}>
                        <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${isActive ? 'bg-white/20 text-white' : isPast ? 'bg-dom-green text-white' : 'bg-dom-gray-200 text-dom-gray-500'}`}>
                          {isPast ? <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step content */}
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
            <AnimatePresence mode="wait">
              <motion.div key={step} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: 'easeInOut' }}>
                {step === 'start' && <StartStep onSelect={handleFlowSelect} />}
                {step === 'room' && <RoomSelector rooms={rooms} selectedRoom={selectedRoom} onSelect={handleRoomSelect} />}
                {step === 'date' && <DatePicker selectedDate={selectedDate} onSelect={handleDateSelect} daysAhead={28} />}
                {step === 'time' && selectedRoom && selectedDate && (
                  <TimeSlotGrid slots={slots} room={selectedRoom} date={selectedDate} cart={cart} duration={selectedDuration} onDurationChange={handleDurationChange} onToggleSlot={handleToggleSlot} loading={slotsLoading} />
                )}
                {step === 'allrooms' && selectedDate && (
                  <AllRoomsGrid rooms={rooms} date={selectedDate} slotsByRoom={slotsByRoom} duration={selectedDuration} onDurationChange={handleDurationChange} cart={cart} onToggleSlot={handleAllRoomsToggle} loading={allRoomsSlotsLoading} />
                )}
                {step === 'confirm' && <BookingConfirmation cart={cart} duration={selectedDuration} onSubmit={handleSubmit} onBack={handleBack} submitting={submitting} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {showCartBar && <BookingCart cart={cart} onRemove={handleRemoveFromCart} onConfirm={handleConfirmClick} />}
        </>
      )}

      {/* Week schedule — visible on start screen and after success */}
      {(step === 'start' || bookingResults) && (
        <WeekSchedule
          rooms={rooms}
          weekDates={weekDates}
          busy={weekBusy}
          loading={weekLoading}
          weekOffset={weekOffset}
          onWeekChange={setWeekOffset}
          onSlotClick={handleScheduleSlotClick}
        />
      )}

      <EventsSection />
    </BookingLayout>
  );
}
