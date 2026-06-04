import { UserRoleRecord, RoomRecord, BookingRecord, DayBookingStat, RoomOccupancyStat } from './types';

// Default roles list
export const DEFAULT_USERS: UserRoleRecord[] = [
  {
    id: 'user-1',
    name: 'Maria Santos',
    email: 'maria.santos@ak-seafarers.com',
    role: 'Admin',
    status: 'Active',
    lastActive: '2026-06-03 13:45',
    permissions: ['all_access', 'manage_users', 'manage_rooms', 'manage_bookings', 'view_revenue'],
  },
  {
    id: 'user-2',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@ak-seafarers.com',
    role: 'Manager',
    status: 'Active',
    lastActive: '2026-06-03 14:01',
    permissions: ['manage_rooms', 'manage_bookings', 'view_revenue', 'edit_roles'],
  },
  {
    id: 'user-3',
    name: 'Alvin Dimaculangan',
    email: 'alvin.d@ak-seafarers.com',
    role: 'Staff',
    status: 'Active',
    lastActive: '2026-06-03 13:10',
    permissions: ['manage_bookings', 'view_rooms'],
  },
  {
    id: 'user-4',
    name: 'Lita Soreno',
    email: 'lita.s@ak-seafarers.com',
    role: 'Housekeeper',
    status: 'Active',
    lastActive: '2026-06-03 11:20',
    permissions: ['view_rooms', 'update_cleaning_status'],
  },
  {
    id: 'user-5',
    name: 'Capt. Roberto Diaz',
    email: 'roberto.diaz@seamail.com',
    role: 'Seafarer',
    status: 'Active',
    lastActive: '2026-06-02 09:15',
    permissions: ['view_own_booking', 'request_service'],
  },
  {
    id: 'user-6',
    name: 'Engr. Jomar Reyes',
    email: 'jomar.reyes@seamail.com',
    role: 'Seafarer',
    status: 'Inactive',
    lastActive: '2026-05-28 16:30',
    permissions: ['view_own_booking'],
  }
];

// All rooms start at 30 total, 0 occupied, 30 available
export const DEFAULT_ROOMS: RoomRecord[] = [
  {
    id: 'room-1',
    name: 'Shared Dorm A (Bed space)',
    type: 'Bed space',
    totalRooms: 30,
    occupiedRooms: 0,
    availableRooms: 30,
    pricePerNight: 500,
  },
  {
    id: 'room-2',
    name: 'Standard Cabin 101 (Solo room)',
    type: 'Solo room',
    totalRooms: 30,
    occupiedRooms: 0,
    availableRooms: 30,
    pricePerNight: 1200,
  },
  {
    id: 'room-3',
    name: 'Executive Couple Suite B (Couple room)',
    type: 'Couple room',
    totalRooms: 30,
    occupiedRooms: 0,
    availableRooms: 30,
    pricePerNight: 2200,
  }
];

// No bookings — fresh start
export const DEFAULT_BOOKINGS: BookingRecord[] = [];

// Flat/zero chart data — fresh start
export const DEFAULT_BOOKING_STATS: DayBookingStat[] = [
  { date: 'Jun 04', bookings: 0, revenue: 0, occupancyRate: 0 },
  { date: 'Jun 05', bookings: 0, revenue: 0, occupancyRate: 0 },
  { date: 'Jun 06', bookings: 0, revenue: 0, occupancyRate: 0 },
  { date: 'Jun 07', bookings: 0, revenue: 0, occupancyRate: 0 },
  { date: 'Jun 08', bookings: 0, revenue: 0, occupancyRate: 0 },
  { date: 'Jun 09', bookings: 0, revenue: 0, occupancyRate: 0 },
  { date: 'Jun 10', bookings: 0, revenue: 0, occupancyRate: 0 },
];

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage for key "${key}":`, error);
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Error writing localStorage for key "${key}":`, error);
  }
};