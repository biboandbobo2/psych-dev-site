import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { PaywallGuard } from './PaywallGuard';
import { useAuthStore } from '../stores/useAuthStore';

vi.mock('../lib/firebase', () => ({ auth: {}, db: {}, googleProvider: {} }));

const student = { uid: 'u1', email: 'student@test' } as unknown as User;

describe('PaywallGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: student,
      loading: false,
      userRole: null,
      courseAccess: null,
      groupGrantedCourses: {},
    });
  });

  it('снимает замок, когда courseAccess приходит после первого рендера', () => {
    render(
      <PaywallGuard courseType="development">
        <div>видео</div>
      </PaywallGuard>
    );
    expect(screen.getByText('Доступно при оплате курса')).toBeInTheDocument();

    // Снапшот users/{uid} приезжает уже после loading=false — как при F5.
    act(() => {
      useAuthStore.setState({ courseAccess: { development: true } });
    });
    expect(screen.getByText('видео')).toBeInTheDocument();
  });

  it('снимает замок, когда доступ приходит через группу', () => {
    render(
      <PaywallGuard courseType="clinical">
        <div>видео</div>
      </PaywallGuard>
    );
    expect(screen.getByText('Доступно при оплате курса')).toBeInTheDocument();

    act(() => {
      useAuthStore.setState({ groupGrantedCourses: { clinical: true } });
    });
    expect(screen.getByText('видео')).toBeInTheDocument();
  });
});
