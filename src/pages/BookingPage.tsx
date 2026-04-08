import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import { BookingLayout } from './booking/BookingLayout';
import { RoomSelector } from './booking/RoomSelector';
import { DatePicker } from './booking/DatePicker';
import { TimeSlotGrid } from './booking/TimeSlotGrid';
import { BookingCart } from './booking/BookingCart';
import { BookingConfirmation } from './booking/BookingConfirmation';
import { EventsSection } from './booking/EventsSection';
import { useRooms, useTimeSlots, useBooking } from './booking/useBookingApi';
import type { Room, TimeSlot, CartItem, BookingStep, BookingFormData } from './booking/types';

const STEPS: { key: BookingStep; label: string }[] = [
  { key: 'room', label: 'Кабинет' },
  { key: 'date', label: 'Дата' },
  { key: 'time', label: 'Время' },
  { key: 'confirm', label: 'Подтверждение' },
];

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function BookingPage() {
  const [step, setStep] = useState<BookingStep>('room');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [success, setSuccess] = useState(false);

  const { rooms } = useRooms();
  const { slots, loading: slotsLoading } = useTimeSlots(selectedRoom?.id ?? null, selectedDate);
  const { book, submitting } = useBooking();

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const handleRoomSelect = useCallback((room: Room) => {
    setSelectedRoom(room);
    setSelectedDate(null);
    setStep('date');
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setStep('time');
  }, []);

  const handleToggleSlot = useCallback(
    (slot: TimeSlot) => {
      if (!selectedRoom || !selectedDate) return;
      setCart((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.room.id === selectedRoom.id && item.date === selectedDate && item.slot.time === slot.time
        );
        if (existingIndex >= 0) {
          return prev.filter((_, i) => i !== existingIndex);
        }
        return [...prev, { room: selectedRoom, date: selectedDate, slot }];
      });
    },
    [selectedRoom, selectedDate]
  );

  const handleRemoveFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirmClick = useCallback(() => {
    setStep('confirm');
  }, []);

  const handleBack = useCallback(() => {
    setStep('time');
  }, []);

  const handleSubmit = useCallback(
    async (data: BookingFormData) => {
      const bookingItems = cart.map((item) => ({
        roomId: item.room.id,
        datetime: `${item.date} ${item.slot.time}`,
      }));
      await book(bookingItems, data);
      setSuccess(true);
      setCart([]);
    },
    [cart, book]
  );

  const goToStep = useCallback(
    (targetStep: BookingStep) => {
      const targetIndex = STEPS.findIndex((s) => s.key === targetStep);
      if (targetIndex <= currentStepIndex) {
        setStep(targetStep);
      }
    },
    [currentStepIndex]
  );

  return (
    <BookingLayout>
      <Helmet>
        <title>Бронирование кабинетов — Психологический центр ДОМ</title>
        <meta
          name="description"
          content="Забронируйте кабинет в психологическом центре ДОМ для консультаций, тренингов и мероприятий."
        />
      </Helmet>

      {success ? (
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-full bg-dom-green/10 mx-auto mb-6 flex items-center justify-center"
          >
            <svg className="w-10 h-10 text-dom-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h2 className="text-3xl font-bold text-dom-gray-900 mb-3">Бронирование подтверждено!</h2>
          <p className="text-dom-gray-500 text-lg mb-8">
            Мы свяжемся с вами для подтверждения деталей.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setStep('room');
              setSelectedRoom(null);
              setSelectedDate(null);
            }}
            className="
              bg-dom-green hover:bg-dom-green-hover text-white
              font-medium px-8 py-3 rounded-xl
              transition-all duration-150
              hover:-translate-y-0.5 hover:shadow-lg
            "
          >
            Забронировать ещё
          </button>
        </div>
      ) : (
        <>
          {/* Stepper */}
          <div className="bg-white border-b border-dom-gray-200 sticky top-0 z-30">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
              <div className="flex items-center gap-2 py-4 overflow-x-auto">
                {STEPS.map((s, i) => {
                  const isActive = s.key === step;
                  const isPast = i < currentStepIndex;
                  return (
                    <button
                      key={s.key}
                      onClick={() => goToStep(s.key)}
                      disabled={i > currentStepIndex}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                        transition-all duration-150 whitespace-nowrap
                        ${isActive
                          ? 'bg-dom-green text-white'
                          : isPast
                            ? 'bg-dom-cream text-dom-green cursor-pointer hover:bg-dom-green/10'
                            : 'text-dom-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className={`
                        w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold
                        ${isActive ? 'bg-white/20 text-white' : isPast ? 'bg-dom-green text-white' : 'bg-dom-gray-200 text-dom-gray-500'}
                      `}>
                        {isPast ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {step === 'room' && (
                  <RoomSelector rooms={rooms} selectedRoom={selectedRoom} onSelect={handleRoomSelect} />
                )}
                {step === 'date' && (
                  <DatePicker selectedDate={selectedDate} onSelect={handleDateSelect} />
                )}
                {step === 'time' && selectedRoom && selectedDate && (
                  <TimeSlotGrid
                    slots={slots}
                    room={selectedRoom}
                    date={selectedDate}
                    cart={cart}
                    onToggleSlot={handleToggleSlot}
                    loading={slotsLoading}
                  />
                )}
                {step === 'confirm' && (
                  <BookingConfirmation
                    cart={cart}
                    onSubmit={handleSubmit}
                    onBack={handleBack}
                    submitting={submitting}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Cart (fixed bottom bar) — visible on time step */}
          {step === 'time' && (
            <BookingCart
              cart={cart}
              onRemove={handleRemoveFromCart}
              onConfirm={handleConfirmClick}
            />
          )}
        </>
      )}

      <EventsSection />
    </BookingLayout>
  );
}
