export type RoomType = 'Bed space' | 'Solo room' | 'Couple room' | 'Family room';

export interface RoomRecord {
  id: string;
  name: string;
  type: RoomType;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  pricePerNight: number;
}

export type BookingStatus = 'Pending' | 'Checked-in' | 'Checked-out' | 'Cancelled';

export interface BookingRecord {
  id: string;
  guestName: string;
  email: string;
  roomType: RoomType;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  status: BookingStatus;
  price: number;
  createdAt: string;
}

export interface DayBookingStat {
  date: string;
  bookings: number;
  revenue: number;
  occupancyRate: number;
}

export interface RoomOccupancyStat {
  name: string;
  occupied: number;
  available: number;
  total: number;
}
