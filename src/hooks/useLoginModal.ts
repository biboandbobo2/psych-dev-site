import { useEffect, useState } from "react";

type Listener = (isOpen: boolean) => void;

type LoginModalEvents = {
  listeners: Listener[];
  isOpen: boolean;
  subscribe: (listener: Listener) => () => void;
  open: () => void;
  close: () => void;
};

const loginModalEvents: LoginModalEvents = {
  listeners: [],
  isOpen: false,
  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  },
  open() {
    this.isOpen = true;
    this.listeners.forEach((listener) => listener(true));
  },
  close() {
    this.isOpen = false;
    this.listeners.forEach((listener) => listener(false));
  },
};

export function useLoginModal() {
  const [isOpen, setIsOpen] = useState(loginModalEvents.isOpen);

  useEffect(() => loginModalEvents.subscribe(setIsOpen), []);

  return {
    isOpen,
    openModal: loginModalEvents.open.bind(loginModalEvents),
    closeModal: loginModalEvents.close.bind(loginModalEvents),
  };
}
