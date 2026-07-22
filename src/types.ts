export interface Shipment {
  id: string;
  customer_name: string;
  client_phone: string | null;
  client_photo_url: string | null;
  origin: string;
  destination: string;
  status: string;
  payment_methods?: string;
  created_at: string;
  claimed_by: string | null;
  updates?: ShipmentUpdate[];
  product_photos?: string[];
  weight?: string;
  dimensions?: string;
  estimated_delivery?: string;
  shipping_cost?: string;
  content_description?: string;
}

export interface ShipmentUpdate {
  id: number;
  shipment_id: string;
  status: string;
  location: string;
  photo_url: string | null;
  notes: string | null;
  timestamp: string;
}

export interface Ticket {
  id: number;
  customer_email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface Flight {
  id: number;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
}

export interface FlightBooking {
  id: number;
  flight_id: number;
  user_id: number;
  passenger_name: string;
  passport_number?: string;
  status: string;
  booking_date: string;
  airline?: string;
  flight_number?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
  price?: number;
}
