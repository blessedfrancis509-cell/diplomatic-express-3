import React, { useState, useEffect } from "react";
import { Package, Truck, MessageSquare, X, Camera, LogOut, History, User as UserIcon, FileText, Download, Printer, ShieldCheck, MapPin, ChevronRight, Plane, Plus, Trash2, QrCode, AlertCircle, Check, Settings, Image, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Shipment, Ticket, User } from "../types";
import { openReceiptWindow, downloadReceipt } from "../lib/receipt";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<"shipments" | "cs" | "flights" | "receipts" | "bookings" | "news">("shipments");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingFlight, setIsAddingFlight] = useState(false);
  const [newFlight, setNewFlight] = useState({
    airline: "",
    flight_number: "",
    origin: "",
    destination: "",
    departure_time: "",
    arrival_time: "",
    price: "",
    available_seats: "100"
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const selectedTicketRef = React.useRef<Ticket | null>(null);
  
  useEffect(() => {
    selectedTicketRef.current = selectedTicket;
  }, [selectedTicket]);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState<any>({});
  const [showReceiptGen, setShowReceiptGen] = useState(false);
  const [receiptData, setReceiptData] = useState({
    type: "package" as "package" | "flight",
    trackingId: "",
    deliveryDate: "",
    senderName: "",
    senderAddress: "",
    receiverName: "",
    receiverEmail: "",
    receiverAddress: "",
    origin: "",
    content: "Parcel 📦",
    weight: "",
    estDelivery: "",
    paymentStatus: "NOT AVAILABLE",
    quantity: "1",
    action: "In Progress ♻️",
    shippingFee: "",
    ownerPhotoUrl: "",
    paymentMethods: [] as { name: string; details: string }[],
    // Flight specific fields
    flightNumber: "",
    airline: "",
    departureTime: "",
    arrivalTime: "",
    seatNumber: "",
    gate: "",
    class: "Economy",
    destination: ""
  });
  const [newShipment, setNewShipment] = useState({ id: "", customer_name: "", client_phone: "", origin: "", destination: "", status: "Pending", weight: "", dimensions: "", estimated_delivery: "", shipping_cost: "", content_description: "" });
  const [clientPhoto, setClientPhoto] = useState<File | null>(null);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<any | null>(null);
  const [isViewingShipment, setIsViewingShipment] = useState(false);
  const [isViewingFlight, setIsViewingFlight] = useState(false);
  const [viewingShipmentData, setViewingShipmentData] = useState<any>(null);
  const [viewingFlightData, setViewingFlightData] = useState<any>(null);
  const [isEditingShipment, setIsEditingShipment] = useState(false);
  const [editShipmentData, setEditShipmentData] = useState({ customer_name: "", client_phone: "", origin: "", destination: "", weight: "", dimensions: "", estimated_delivery: "", shipping_cost: "", content_description: "" });
  const [updateData, setUpdateData] = useState({ 
    status: "Warehouse", 
    location: "", 
    notes: "",
    paymentMethods: [] as { name: string, details: string }[],
    customsAmount: "",
    customsCurrency: "USD"
  });
  const [newUpdatePaymentMethod, setNewUpdatePaymentMethod] = useState({ name: "", details: "" });
  const [flightUpdateData, setFlightUpdateData] = useState({ status: "Scheduled", location: "", notes: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: "", details: "" });
  const [copied, setCopied] = useState(false);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [editingNews, setEditingNews] = useState<any | null>(null);
  const [newsForm, setNewsForm] = useState({ title: "", summary: "", content: "", category: "General", is_published: 1 });
  const [newsImage, setNewsImage] = useState<File | null>(null);

  const calculateDaysOld = (dateStr: string) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setPersistenceStatus(data.persistence);
      }
    } catch (err) {
      console.error("Fetch health error:", err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchShipments();
    fetchTickets();
    fetchLogs();
    fetchUsers();
    fetchFlights();
    fetchAdminBookings();
    fetchPaymentAccount();
    fetchNews();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "NEW_TICKET") {
        setTickets(prev => [message.data, ...prev]);
      } else if (message.type === "TICKET_REPLY") {
        setReplies(prev => {
          // Only add if it's for the currently selected ticket and not already there
          if (selectedTicketRef.current && selectedTicketRef.current.id === Number(message.data.ticket_id)) {
            // Check if already exists to avoid duplicates (since handleReply also fetches)
            if (prev.some(r => r.id === message.data.id)) return prev;
            return [...prev, message.data];
          }
          return prev;
        });
      } else if (message.type === "SHIPMENT_UPDATE") {
        fetchShipments();
      }
    };

    return () => ws.close();
  }, []); // Removed selectedTicket from dependencies to prevent unnecessary refetches

  // Refetch replies when selectedTicket changes
  useEffect(() => {
    if (selectedTicket) {
      fetchReplies(selectedTicket.id);
    }
  }, [selectedTicket]);

  const [persistenceStatus, setPersistenceStatus] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState(() => localStorage.getItem("admin_secret") || "admin12345");
  const [isVerifyingSecret, setIsVerifyingSecret] = useState(false);

  const handleVerifySecret = async () => {
    if (!adminSecret.trim()) {
      alert("Please enter an Admin Secret first.");
      return;
    }
    setIsVerifyingSecret(true);
    try {
      const res = await fetch(`/api/admin/verify?admin_user=${user.username}`, {
        headers: { 'x-admin-secret': adminSecret.trim() }
      });
      const data = await handleResponse(res, "Verify secret");
      alert(data.message || "Admin secret verified successfully!");
      fetchUsers();
      fetchLogs();
    } catch (err: any) {
      console.error("Verify secret error:", err);
      alert(err.message);
    } finally {
      setIsVerifyingSecret(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("admin_secret", adminSecret);
  }, [adminSecret]);

  const fetchViewingShipment = async (id: string) => {
    try {
      const res = await fetch(`/api/shipments/${id}`);
      const data = await handleResponse(res, "Fetch viewing shipment");
      setViewingShipmentData(data);
    } catch (err: any) {
      console.error("Fetch viewing shipment error:", err);
    }
  };

  const fetchViewingFlight = async (id: number) => {
    try {
      const flight = flights.find(f => f.id === id);
      if (!flight) return;
      const res = await fetch(`/api/flights/track/${flight.flight_number}`);
      const data = await handleResponse(res, "Fetch viewing flight");
      setViewingFlightData(data);
    } catch (err: any) {
      console.error("Fetch viewing flight error:", err);
    }
  };

  const handleResponse = async (res: Response, errorPrefix: string) => {
    if (res.status === 403) {
      throw new Error("Unauthorized: Check your Admin Secret. It must match the server's ADMIN_SECRET.");
    }

    const contentType = res.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error(`${errorPrefix} - Non-JSON response body (${res.status}):`, text.substring(0, 500));
      throw new Error(`Server returned non-JSON response (${res.status}). Check server logs.`);
    }

    if (!res.ok) {
      throw new Error(data.error || `${errorPrefix} failed`);
    }
    return data;
  };

  const fetchUsers = async () => {
    if (!adminSecret.trim()) return;
    try {
      const res = await fetch(`/api/users?admin_user=${user.username}`, {
        headers: { 'x-admin-secret': adminSecret.trim() }
      });
      const data = await handleResponse(res, "Fetch users");
      setUsers(data);
    } catch (err: any) {
      console.error("Fetch users error:", err);
    }
  };

  const fetchShipments = async () => {
    try {
      const res = await fetch("/api/shipments");
      const data = await handleResponse(res, "Fetch shipments");
      setShipments(data);
      
      // If we are viewing a shipment, refresh its data too
      if (isViewingShipment && viewingShipmentData) {
        fetchViewingShipment(viewingShipmentData.id);
      }
    } catch (err: any) {
      console.error("Fetch shipments error:", err);
    }
  };

  const fetchFlights = async () => {
    try {
      const res = await fetch("/api/flights");
      const data = await handleResponse(res, "Fetch flights");
      setFlights(data);
    } catch (err: any) {
      console.error("Fetch flights error:", err);
    }
  };

  const fetchAdminBookings = async () => {
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: { "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminBookings(data);
      }
    } catch (err) {
      console.error("Fetch bookings error:", err);
    }
  };

  const fetchPaymentAccount = async () => {
    try {
      const res = await fetch("/api/settings/payment-account");
      if (res.ok) setPaymentAccount(await res.json());
    } catch (err) {
      console.error("Fetch payment account error:", err);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/news/all", {
        headers: { "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
      });
      if (res.ok) setNewsItems(await res.json());
    } catch (err) {
      console.error("Fetch news error:", err);
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", newsForm.title);
      formData.append("summary", newsForm.summary);
      formData.append("content", newsForm.content);
      formData.append("category", newsForm.category);
      formData.append("is_published", String(newsForm.is_published));
      if (newsImage) formData.append("image", newsImage);

      const isEdit = !!editingNews;
      const url = isEdit ? `/api/news/${editingNews.id}` : "/api/news";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
        body: formData,
      });
      if (res.ok) {
        setShowNewsForm(false);
        setEditingNews(null);
        setNewsForm({ title: "", summary: "", content: "", category: "General", is_published: 1 });
        setNewsImage(null);
        fetchNews();
      }
    } catch (err: any) {
      alert("Failed to save news: " + err.message);
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!confirm("Delete this news article?")) return;
    try {
      const res = await fetch(`/api/news/${id}`, {
        method: "DELETE",
        headers: { "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
      });
      if (res.ok) fetchNews();
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleApproveBooking = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
      });
      if (res.ok) fetchAdminBookings();
    } catch (err) {
      console.error("Approve booking error:", err);
    }
  };

  const handleRejectBooking = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
      });
      if (res.ok) fetchAdminBookings();
    } catch (err) {
      console.error("Reject booking error:", err);
    }
  };

  const handleAddFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret.trim()
        },
        body: JSON.stringify({ 
          ...newFlight, 
          price: Number(newFlight.price), 
          available_seats: Number(newFlight.available_seats), 
          admin_user: user.username 
        }),
      });

      await handleResponse(res, "Add flight");
      setIsAddingFlight(false);
      setNewFlight({ airline: "", flight_number: "", origin: "", destination: "", departure_time: "", arrival_time: "", price: "", available_seats: "100" });
      fetchFlights();
      fetchLogs();
    } catch (err: any) {
      console.error("Add flight error:", err);
      alert(`Failed to add flight: ${err.message}`);
    }
  };

  const handleDeleteFlight = async (id: number) => {
    if (!confirm("Are you sure you want to delete this flight? All bookings will be lost.")) return;
    try {
      const res = await fetch(`/api/flights/${id}?admin_user=${user.username}`, { 
        method: "DELETE",
        headers: { "x-admin-secret": adminSecret.trim() }
      });

      await handleResponse(res, "Delete flight");
      fetchFlights();
      fetchLogs();
    } catch (err: any) {
      console.error("Delete flight error:", err);
      alert(`Failed to delete flight: ${err.message}`);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets");
      const data = await handleResponse(res, "Fetch tickets");
      setTickets(data);
    } catch (err: any) {
      console.error("Fetch tickets error:", err);
    }
  };

  const fetchLogs = async () => {
    if (!adminSecret.trim()) return;
    try {
      const res = await fetch(`/api/admin/logs?admin_user=${user.username}`, {
        headers: { 'x-admin-secret': adminSecret.trim() }
      });
      const data = await handleResponse(res, "Fetch logs");
      setLogs(data);
    } catch (err: any) {
      console.error("Fetch logs error:", err);
    }
  };

  const handleAddShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newShipment.id.trim().toUpperCase();
    if (!cleanId) {
      alert("Please enter a Tracking ID.");
      return;
    }

    const formData = new FormData();
    formData.append("id", cleanId);
    formData.append("customer_name", newShipment.customer_name);
    formData.append("client_phone", newShipment.client_phone);
    formData.append("origin", newShipment.origin);
    formData.append("destination", newShipment.destination);
    formData.append("status", newShipment.status);
    formData.append("admin_user", user.username);
    if (newShipment.weight) formData.append("weight", newShipment.weight);
    if (newShipment.dimensions) formData.append("dimensions", newShipment.dimensions);
    if (newShipment.estimated_delivery) formData.append("estimated_delivery", newShipment.estimated_delivery);
    if (newShipment.shipping_cost) formData.append("shipping_cost", newShipment.shipping_cost);
    if (newShipment.content_description) formData.append("content_description", newShipment.content_description);
    
    if (clientPhoto) formData.append("client_photo", clientPhoto);
    productPhotos.forEach((p) => formData.append("product_photos", p));

    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "x-admin-secret": adminSecret.trim() },
        body: formData,
      });

      await handleResponse(res, "Add shipment");
      setIsAdding(false);
      setNewShipment({ id: "", customer_name: "", client_phone: "", origin: "", destination: "", status: "Pending", weight: "", dimensions: "", estimated_delivery: "", shipping_cost: "", content_description: "" });
      setClientPhoto(null);
      setProductPhotos([]);
      fetchShipments();
      fetchLogs();
    } catch (err: any) {
      console.error("Add shipment error:", err);
      alert(`Failed to create consignment: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    try {
      const formData = new FormData();
      formData.append("status", updateData.status);
      formData.append("location", updateData.location);
      formData.append("notes", updateData.notes);
      formData.append("admin_user", user.username);
      if (updateData.paymentMethods.length > 0) {
        formData.append("payment_methods", JSON.stringify(updateData.paymentMethods));
      }
      if (updateData.customsAmount) {
        formData.append("customs_amount", updateData.customsAmount);
      }
      if (updateData.customsCurrency) {
        formData.append("customs_currency", updateData.customsCurrency);
      }
      if (photo) formData.append("photo", photo);

      const res = await fetch(`/api/shipments/${selectedShipment.id}/updates`, {
        method: "POST",
        headers: { "x-admin-secret": adminSecret.trim() },
        body: formData,
      });

      await handleResponse(res, "Update status");
      setSelectedShipment(null);
      setUpdateData({ status: "Warehouse", location: "", notes: "", paymentMethods: [], customsAmount: "", customsCurrency: "USD" });
      setPhoto(null);
      fetchShipments();
      fetchLogs();
    } catch (err: any) {
      console.error("Update status error:", err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleEditShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    try {
      const res = await fetch(`/api/shipments/${selectedShipment.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret.trim()
        },
        body: JSON.stringify({ ...editShipmentData, admin_user: user.username }),
      });

      await handleResponse(res, "Edit shipment");
      setIsEditingShipment(false);
      setSelectedShipment(null);
      fetchShipments();
      fetchLogs();
    } catch (err: any) {
      console.error("Edit shipment error:", err);
      alert(`Failed to edit shipment: ${err.message}`);
    }
  };

  const handleDeleteShipment = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete shipment ${id}? This will remove all updates and photos.`)) return;

    try {
      const res = await fetch(`/api/shipments/${id}?admin_user=${user.username}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminSecret.trim() },
      });

      await handleResponse(res, "Delete shipment");
      setSelectedShipment(null);
      fetchShipments();
      fetchLogs();
    } catch (err: any) {
      console.error("Delete shipment error:", err);
      alert(err.message);
    }
  };

  const fetchReplies = async (ticketId: number) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/replies`);
      const data = await handleResponse(res, "Fetch replies");
      setReplies(data);
    } catch (err: any) {
      console.error("Fetch replies error:", err);
    }
  };

  const handleUpdateFlightStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlight) return;

    try {
      const res = await fetch(`/api/flights/${selectedFlight.id}/updates`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret.trim()
        },
        body: JSON.stringify({ ...flightUpdateData, admin_user: user.username }),
      });

      await handleResponse(res, "Update flight status");
      setSelectedFlight(null);
      setFlightUpdateData({ status: "Scheduled", location: "", notes: "" });
      fetchFlights();
      fetchLogs();
    } catch (err: any) {
      console.error("Update flight status error:", err);
      alert(err.message);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!newReply && !replyImage)) return;
    try {
      const formData = new FormData();
      formData.append("sender_username", user.username);
      if (newReply) formData.append("message", newReply);
      if (replyImage) formData.append("image", replyImage);

      const res = await fetch(`/api/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        body: formData,
      });
      
      await handleResponse(res, "Reply to ticket");
      setNewReply("");
      setReplyImage(null);
      fetchReplies(selectedTicket.id);
    } catch (err: any) {
      console.error("Reply error:", err);
      alert(err.message);
    }
  };

  const handleOwnerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptData({ ...receiptData, ownerPhotoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addPaymentMethod = () => {
    if (newPaymentMethod.name && newPaymentMethod.details) {
      setReceiptData({
        ...receiptData,
        paymentMethods: [...receiptData.paymentMethods, newPaymentMethod]
      });
      setNewPaymentMethod({ name: "", details: "" });
    }
  };

  const removePaymentMethod = (index: number) => {
    const updated = [...receiptData.paymentMethods];
    updated.splice(index, 1);
    setReceiptData({ ...receiptData, paymentMethods: updated });
  };

  const openReceiptGenWithShipment = (s: Shipment) => {
    setReceiptData({
      ...receiptData,
      type: "package",
      trackingId: s.id,
      receiverName: s.customer_name,
      origin: s.origin,
      receiverAddress: s.destination,
      action: s.status,
      deliveryDate: new Date().toISOString().split('T')[0]
    });
    setShowReceiptGen(true);
  };

  const openReceiptGenWithFlight = (f: any) => {
    setReceiptData({
      ...receiptData,
      type: "flight",
      flightNumber: f.flight_number,
      airline: f.airline,
      origin: f.origin,
      destination: f.destination,
      departureTime: f.departure_time,
      arrivalTime: f.arrival_time,
      shippingFee: `$${f.price}`,
      deliveryDate: new Date(f.departure_time).toISOString().split('T')[0]
    });
    setShowReceiptGen(true);
  };

  return (
    <div className="py-12 md:py-20 max-w-7xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-secondary flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg shadow-brand-secondary/20 uppercase shrink-0">
            {user.username[0]}
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-brand-primary tracking-tight">Diplomatic <span className="text-brand-secondary">Xpress</span></h2>
            <p className="text-xs md:text-base text-slate-500">Logged in as <span className="font-bold text-brand-secondary">{user.username}</span></p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-4 w-full lg:w-auto">
          <div className="relative group col-span-2 sm:col-span-1 sm:flex-1 md:flex-none flex gap-2">
            <div className="relative flex-1">
              <input 
                type="password" 
                placeholder="Admin Secret" 
                value={adminSecret} 
                onChange={(e) => setAdminSecret(e.target.value)}
                className="input py-2 px-4 text-xs w-full md:w-32 focus:md:w-48 transition-all"
              />
              <div className="absolute -top-8 left-0 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Required if ADMIN_SECRET is set on server
              </div>
            </div>
            <button 
              onClick={handleVerifySecret}
              disabled={isVerifyingSecret}
              title="Verify Admin Secret"
              className="p-2 bg-slate-100 hover:bg-brand-primary hover:text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isVerifyingSecret ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
            </button>
          </div>
          <button onClick={() => setShowUsers(true)} className="btn-outline flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <UserIcon size={16} />
            <span className="text-xs md:text-sm font-bold">Users</span>
          </button>
          <button onClick={() => setShowLogs(true)} className="btn-outline flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <History size={16} />
            <span className="text-xs md:text-sm font-bold">Logs</span>
          </button>
          <button onClick={() => setShowSettings(true)} className="btn-outline flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <Settings size={16} />
            <span className="text-xs md:text-sm font-bold">Settings</span>
          </button>
          <button onClick={() => setShowReceiptGen(true)} className="btn-outline flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <FileText size={16} />
            <span className="text-xs md:text-sm font-bold">Receipt</span>
          </button>
          <button onClick={() => setIsAdding(true)} className="btn-primary col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-2 md:py-3 px-3 md:px-4">
            <Package size={16} />
            <span className="text-xs md:text-sm font-bold">New Consignment</span>
          </button>
          <button onClick={onLogout} className="p-2 md:p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 flex items-center justify-center">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
            <History size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-primary">30-Day Activity & Data Retention Policy Active</p>
            <p className="text-[10px] text-slate-500 font-medium">System automatically cleans up activity logs, shipments, and flights older than 30 days every 30 days.</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-white border border-brand-primary/20 rounded-lg">
          <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Storage Status: Optimized</span>
        </div>
      </div>

      <div className="flex border-b border-slate-100 mb-8 overflow-x-auto scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
        <button 
          onClick={() => setActiveAdminTab("shipments")}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative ${activeAdminTab === "shipments" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Consignments
          {activeAdminTab === "shipments" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveAdminTab("cs")}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative flex items-center gap-2 ${activeAdminTab === "cs" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Customer Service
          {tickets.some(t => t.status === 'Open') && <span className="w-2 h-2 bg-brand-secondary rounded-full animate-pulse" />}
          {activeAdminTab === "cs" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveAdminTab("flights")}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative flex items-center gap-2 ${activeAdminTab === "flights" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Flights
          {activeAdminTab === "flights" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveAdminTab("receipts")}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative flex items-center gap-2 ${activeAdminTab === "receipts" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Receipts
          {activeAdminTab === "receipts" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
        <button 
          onClick={() => { setActiveAdminTab("bookings"); fetchAdminBookings(); }}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative flex items-center gap-2 ${activeAdminTab === "bookings" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          Bookings
          {adminBookings.some((b: any) => b.payment_status === "pending") && <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
          {activeAdminTab === "bookings" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
        <button 
          onClick={() => { setActiveAdminTab("news"); fetchNews(); }}
          className={`px-8 py-4 font-black uppercase tracking-widest text-sm transition-all relative flex items-center gap-2 ${activeAdminTab === "news" ? "text-brand-secondary" : "text-slate-400 hover:text-brand-primary"}`}
        >
          News
          {activeAdminTab === "news" && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-1 bg-brand-secondary rounded-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {activeAdminTab === "shipments" && (
          <div className="space-y-8">
            <div className="card">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Truck size={24} className="text-brand-secondary" />
                  Active Consignments
                </h3>
                <div className="flex items-center gap-4">
                  <button onClick={fetchShipments} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-brand-secondary/10 hover:text-brand-secondary transition-all">
                    <History size={16} />
                  </button>
                  <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">{shipments.length} Total</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                      <th className="pb-4 font-bold">ID</th>
                      <th className="pb-4 font-bold">Customer</th>
                      <th className="pb-4 font-bold">Destination</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 font-bold">Claimed By</th>
                      <th className="pb-4 font-bold text-center">Age (Days)</th>
                      <th className="pb-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {shipments.map((s) => {
                      const age = calculateDaysOld(s.created_at);
                      const isOld = age >= 30;
                      return (
                        <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-5 font-mono font-black text-brand-secondary">{s.id}</td>
                          <td className="py-5 font-medium">{s.customer_name}</td>
                          <td className="py-5 text-slate-500">{s.destination}</td>
                           <td className="py-5">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              s.status === "Delivered" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                            }`}>
                              {s.status}
                            </span>
                            {s.status === "Customs" && (
                              <div className="mt-2">
                                {s.payment_proof_url && !s.payment_confirmed ? (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Proof Uploaded</span>
                                    <div className="flex gap-1 mt-1">
                                      <button
                                        onClick={async () => {
                                          if (!window.confirm("Confirm payment for this shipment?")) return;
                                          const res = await fetch(`/api/shipments/${s.id}/confirm-payment`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret.trim(), "x-admin-user": user.username }
                                          });
                                          if (res.ok) { fetchShipments(); fetchLogs(); }
                                        }}
                                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (!window.confirm("Reject this payment proof?")) return;
                                          const res = await fetch(`/api/shipments/${s.id}/reject-payment`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret.trim(), "x-admin-user": user.username }
                                          });
                                          if (res.ok) { fetchShipments(); fetchLogs(); }
                                        }}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                ) : s.payment_confirmed ? (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Payment Confirmed</span>
                                ) : s.customs_amount ? (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Awaiting Proof</span>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="py-5">
                            {s.claimed_by ? (
                              <span className="text-xs font-bold text-brand-secondary">@{s.claimed_by}</span>
                            ) : (
                              <span className="text-xs text-slate-300 italic">Unclaimed</span>
                            )}
                          </td>
                          <td className="py-5 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isOld ? "bg-amber-100 text-amber-700" : "text-slate-400"
                            }`}>
                              {age}d
                            </span>
                            {isOld && (
                              <div className="inline-block ml-1" title="Shipment has exceeded 30 days">
                                <AlertCircle size={10} className="text-amber-500 animate-pulse" />
                              </div>
                            )}
                          </td>
                          <td className="py-5 text-right">
                            <div className="flex justify-end gap-3">
                              <button 
                                onClick={() => openReceiptGenWithShipment(s)}
                                className="text-brand-secondary font-bold text-sm hover:underline"
                              >
                                Receipt
                              </button>
                              <button 
                                onClick={() => {
                                  fetchViewingShipment(s.id);
                                  setIsViewingShipment(true);
                                }}
                                className="text-slate-400 font-bold text-sm hover:text-brand-secondary"
                              >
                                View
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedShipment(s);
                                  setEditShipmentData({
                                    customer_name: s.customer_name,
                                    client_phone: s.client_phone || "",
                                    origin: s.origin,
                                    destination: s.destination,
                                    weight: s.weight || "",
                                    dimensions: s.dimensions || "",
                                    estimated_delivery: s.estimated_delivery || "",
                                    shipping_cost: s.shipping_cost || "",
                                    content_description: s.content_description || ""
                                  });
                                  setIsEditingShipment(true);
                                }}
                                className="text-slate-400 font-bold text-sm hover:text-brand-primary"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedShipment(s);
                                  setUpdateData({
                                    status: s.status,
                                    location: "",
                                    notes: "",
                                    paymentMethods: s.payment_methods ? JSON.parse(s.payment_methods) : [],
                                    customsAmount: s.customs_amount || "",
                                    customsCurrency: s.customs_currency || "USD"
                                  });
                                }}
                                className="text-brand-secondary font-bold text-sm hover:underline"
                              >
                                Update Status
                              </button>
                              <button 
                                onClick={() => handleDeleteShipment(s.id)}
                                className="text-red-400 font-bold text-sm hover:text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === "cs" && (
          <div className="space-y-8">
            <div className="card">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <MessageSquare size={24} className="text-brand-secondary" />
                Customer Service Portal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tickets.map((t) => (
                  <div key={t.id} onClick={() => { setSelectedTicket(t); setReplyImage(null); fetchReplies(t.id); }} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary transition-all cursor-pointer group hover:shadow-lg hover:shadow-brand-secondary/5">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                        t.status === 'Open' ? 'bg-brand-secondary text-white border-brand-secondary' : 'bg-white text-slate-400 border-slate-100'
                      }`}>{t.status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(t.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newStatus = t.status === 'Open' ? 'Resolved' : 'Open';
                            fetch(`/api/tickets/${t.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: newStatus }),
                            }).then(() => {
                              setTickets(prev => prev.map(ticket => ticket.id === t.id ? { ...ticket, status: newStatus } : ticket));
                            });
                          }}
                          className={`text-[10px] font-black px-2 py-0.5 rounded border transition-all ${
                            t.status === 'Open'
                              ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              : "text-amber-600 border-amber-200 hover:bg-amber-50"
                          }`}
                        >
                          {t.status === 'Open' ? 'Resolve' : 'Reopen'}
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-brand-primary mb-2 group-hover:text-brand-secondary transition-colors">{t.subject}</h4>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed">{t.message}</p>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{t.customer_email}</span>
                      <span className="text-xs font-bold text-brand-secondary">View & Reply →</span>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div className="col-span-full text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <MessageSquare size={32} />
                    </div>
                    <p className="text-slate-400 font-bold">No customer messages yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === "flights" && (
          <div className="space-y-8">
            <div className="card">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Plane size={24} className="text-brand-secondary" />
                  Flight Management
                </h3>
                <button onClick={() => setIsAddingFlight(true)} className="btn-primary flex items-center gap-2 py-2 px-4">
                  <Plane size={16} />
                  Add Flight
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                      <th className="pb-4 font-bold">Airline / Flight</th>
                      <th className="pb-4 font-bold">Route</th>
                      <th className="pb-4 font-bold">Departure</th>
                      <th className="pb-4 font-bold">Status</th>
                      <th className="pb-4 font-bold">Price</th>
                      <th className="pb-4 font-bold">Seats</th>
                      <th className="pb-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {flights.map((f) => (
                      <tr key={f.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-5">
                          <p className="font-bold text-brand-primary">{f.airline}</p>
                          <p className="text-xs text-slate-400">{f.flight_number}</p>
                        </td>
                        <td className="py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-primary">{f.origin}</span>
                            <ChevronRight size={12} className="text-slate-300" />
                            <span className="font-bold text-brand-secondary">{f.destination}</span>
                          </div>
                        </td>
                        <td className="py-5">
                          <p className="text-sm font-bold text-brand-primary">{new Date(f.departure_time).toLocaleString()}</p>
                        </td>
                        <td className="py-5">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            f.status === "Landed" ? "bg-emerald-100 text-emerald-700" : 
                            f.status === "In-Air" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="py-5">
                          <div className="space-y-1">
                            {f.cabins ? f.cabins.map((c: any) => (
                              <p key={c.class} className="text-xs font-bold text-slate-500">
                                <span className="uppercase text-[10px]">{c.label}:</span> <span className="text-brand-primary">${c.price.toLocaleString()}</span>
                              </p>
                            )) : (
                              <p className="font-black text-brand-primary">${f.price}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-5">
                          <p className="text-sm font-bold text-slate-500">{f.available_seats} left</p>
                        </td>
                        <td className="py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => openReceiptGenWithFlight(f)}
                              className="text-brand-secondary font-bold text-sm hover:underline"
                            >
                              Receipt
                            </button>
                            <button 
                              onClick={() => {
                                fetchViewingFlight(f.id);
                                setIsViewingFlight(true);
                              }}
                              className="text-slate-400 font-bold text-sm hover:text-brand-primary"
                            >
                              History
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedFlight(f);
                                setFlightUpdateData({ status: f.status, location: "", notes: "" });
                              }}
                              className="text-brand-primary font-bold text-sm hover:underline"
                            >
                              Update
                            </button>
                            <button 
                              onClick={() => handleDeleteFlight(f.id)}
                              className="text-red-400 hover:text-red-600 font-bold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === "receipts" && (
          <div className="space-y-8">
            <div className="card">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={24} className="text-brand-secondary" />
                  Receipt Management
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center space-y-4 group hover:border-brand-secondary/30 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
                    <Package size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Consignment Receipt</h4>
                    <p className="text-sm text-slate-500">Generate a professional receipt for package shipments and logistics.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setReceiptData({ ...receiptData, type: "package" });
                      setShowReceiptGen(true);
                    }}
                    className="btn-primary w-full py-3"
                  >
                    Quick Generate
                  </button>
                </div>

                <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center space-y-4 group hover:border-brand-primary/30 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Plane size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Flight Booking Receipt</h4>
                    <p className="text-sm text-slate-500">Generate a professional receipt for flight bookings and travel services.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setReceiptData({ ...receiptData, type: "flight" });
                      setShowReceiptGen(true);
                    }}
                    className="btn-primary w-full py-3 bg-brand-primary hover:bg-brand-primary/90"
                  >
                    Quick Generate
                  </button>
                </div>
              </div>

              <div className="mt-12 p-6 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                <div className="flex items-center gap-2 text-brand-primary font-bold mb-2">
                  <AlertCircle size={16} />
                  <span>Administrative Note</span>
                </div>
                <p className="text-sm text-slate-600">
                  Receipts generated through this module are automatically formatted with the company branding and security watermarks. 
                  Always ensure the Tracking ID matches the one in the database for consistency.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === "bookings" && (
          <div className="space-y-8">
            <div className="card">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Plane size={24} className="text-brand-secondary" />
                  Flight Bookings
                </h3>
                <div className="flex items-center gap-4">
                  <button onClick={fetchAdminBookings} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-brand-secondary/10 hover:text-brand-secondary transition-all">
                    <History size={16} />
                  </button>
                  <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">{adminBookings.length} Total</span>
                </div>
              </div>

              {adminBookings.filter((b: any) => b.payment_status === "pending").length > 0 && (
                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                  <p className="text-sm font-black text-amber-700 uppercase tracking-wider mb-1">Pending Approvals</p>
                  <p className="text-xs text-amber-600">{adminBookings.filter((b: any) => b.payment_status === "pending").length} booking(s) waiting for payment confirmation.</p>
                </div>
              )}

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                      <th className="pb-4 font-bold">ID</th>
                      <th className="pb-4 font-bold">Passenger</th>
                      <th className="pb-4 font-bold">Flight</th>
                      <th className="pb-4 font-bold">Route</th>
                      <th className="pb-4 font-bold">Cabin</th>
                      <th className="pb-4 font-bold">Amount</th>
                      <th className="pb-4 font-bold">Payment</th>
                      <th className="pb-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {adminBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">No bookings yet</td>
                      </tr>
                    ) : (
                      adminBookings.map((booking: any) => (
                        <tr key={booking.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-mono font-black text-brand-secondary">#{booking.id}</td>
                          <td className="py-4">
                            <p className="font-bold text-sm text-brand-primary">{booking.passenger_name}</p>
                            {booking.username && <p className="text-[10px] text-slate-400">@{booking.username}</p>}
                          </td>
                          <td className="py-4 font-bold text-sm">{booking.flight_number}</td>
                          <td className="py-4 text-sm text-slate-600">{booking.origin} → {booking.destination}</td>
                          <td className="py-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                              booking.cabin_class === "private_jet" ? "bg-purple-100 text-purple-700" :
                              booking.cabin_class === "first_class" ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {booking.cabin_class === "private_jet" ? "Private Jet" : booking.cabin_class === "first_class" ? "First Class" : "Economy"}
                            </span>
                          </td>
                          <td className="py-4 font-black text-sm text-brand-secondary">${booking.price?.toLocaleString()}</td>
                          <td className="py-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                              booking.payment_status === "confirmed" ? "bg-emerald-100 text-emerald-600" :
                              booking.payment_status === "rejected" ? "bg-red-100 text-red-600" :
                              "bg-amber-100 text-amber-600"
                            }`}>
                              {booking.payment_status === "confirmed" ? "Confirmed" : booking.payment_status === "rejected" ? "Rejected" : "Pending"}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {booking.payment_status === "pending" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveBooking(booking.id)}
                                  className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-1"
                                >
                                  <Check size={12} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectBooking(booking.id)}
                                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all flex items-center gap-1"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-bold">{booking.payment_status === "confirmed" ? "Approved" : "Rejected"}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {adminBookings.length === 0 ? (
                <div className="md:hidden text-center py-10 text-slate-400 font-bold">No bookings yet</div>
              ) : (
                <div className="md:hidden space-y-3">
                  {adminBookings.map((booking: any) => (
                    <div key={booking.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-brand-secondary text-sm">#{booking.id}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            booking.cabin_class === "private_jet" ? "bg-purple-100 text-purple-700" :
                            booking.cabin_class === "first_class" ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {booking.cabin_class === "private_jet" ? "Private Jet" : booking.cabin_class === "first_class" ? "First Class" : "Economy"}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          booking.payment_status === "confirmed" ? "bg-emerald-100 text-emerald-600" :
                          booking.payment_status === "rejected" ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-600"
                        }`}>
                          {booking.payment_status === "confirmed" ? "Confirmed" : booking.payment_status === "rejected" ? "Rejected" : "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-brand-primary">{booking.passenger_name}</p>
                          <p className="text-xs text-slate-500">{booking.flight_number} &middot; {booking.origin} → {booking.destination}</p>
                        </div>
                        <p className="font-black text-brand-secondary">${booking.price?.toLocaleString()}</p>
                      </div>
                      {booking.payment_status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveBooking(booking.id)} className="flex-1 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1">
                            <Check size={12} /> Approve
                          </button>
                          <button onClick={() => handleRejectBooking(booking.id)} className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1">
                            <X size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeAdminTab === "news" && (
          <div className="card space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl md:text-2xl font-black text-brand-primary tracking-tight flex items-center gap-2">
                <Newspaper size={24} className="text-brand-secondary" />
                News Management
              </h3>
              <button
                onClick={() => { setEditingNews(null); setNewsForm({ title: "", summary: "", content: "", category: "General", is_published: 1 }); setNewsImage(null); setShowNewsForm(true); }}
                className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
              >
                <Plus size={16} />
                New Article
              </button>
            </div>

            {newsItems.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Newspaper size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 font-bold">No articles yet</p>
                <p className="text-xs text-slate-300 mt-1">Create your first news article to share updates with users.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newsItems.map((item: any) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-secondary/20 transition-all">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-200" referrerPolicy="no-referrer" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded-full">{item.category}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${item.is_published ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                          {item.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-brand-primary truncate">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setEditingNews(item); setNewsForm({ title: item.title, summary: item.summary || "", content: item.content, category: item.category, is_published: item.is_published }); setNewsImage(null); setShowNewsForm(true); }}
                          className="text-[10px] font-bold text-brand-secondary hover:underline"
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDeleteNews(item.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewsForm && (
          <div className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4" onClick={() => setShowNewsForm(false)}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white w-full md:max-w-lg md:rounded-[2rem] rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-black text-brand-primary">{editingNews ? "Edit Article" : "New Article"}</h3>
                <button onClick={() => setShowNewsForm(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"><X size={20} className="text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveNews} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Title</label>
                  <input className="input" required placeholder="Article title" value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Category</label>
                  <select className="input" value={newsForm.category} onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}>
                    {["Company News", "Industry Updates", "Logistics Tips", "Promotions", "General"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Summary</label>
                  <input className="input" placeholder="Brief summary (optional)" value={newsForm.summary} onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Content</label>
                  <textarea className="input min-h-[160px]" required placeholder="Full article content..." value={newsForm.content} onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Cover Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setNewsImage(e.target.files?.[0] || null)} className="text-sm font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-secondary/10 file:text-brand-secondary hover:file:bg-brand-secondary/20" />
                  {editingNews?.image_url && !newsImage && <p className="text-[10px] text-slate-400">Current image will be kept if no new image selected.</p>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Published</label>
                  <button
                    type="button"
                    onClick={() => setNewsForm({ ...newsForm, is_published: newsForm.is_published ? 0 : 1 })}
                    className={`w-12 h-6 rounded-full transition-all relative ${newsForm.is_published ? "bg-brand-secondary" : "bg-slate-200"}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-all ${newsForm.is_published ? "left-6" : "left-0.5"}`} />
                  </button>
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-lg">{editingNews ? "Update Article" : "Publish Article"}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showReceiptGen && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setShowReceiptGen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Receipt Generator</h3>
                <div className="flex gap-4 items-center">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setReceiptData({...receiptData, type: 'package'})}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${receiptData.type === 'package' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      Package
                    </button>
                    <button 
                      onClick={() => setReceiptData({...receiptData, type: 'flight'})}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${receiptData.type === 'flight' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      Flight
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const receiptEl = document.getElementById('printable-receipt');
                      if (!receiptEl) return;
                      const html = `<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Receipt</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter',Arial,sans-serif;padding:16px;color:#1e3a8a;background:#f8fafc;}.receipt-wrap{max-width:700px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}@media print{body{padding:0;background:#fff;}.receipt-wrap{box-shadow:none;border-radius:0;}}</style></head><body><div class="receipt-wrap">${receiptEl.innerHTML}</div><script>window.onload=function(){window.print();}</script></body></html>`;
                      const opened = openReceiptWindow(html, "Receipt");
                      if (!opened) downloadReceipt(html, "receipt.html");
                    }} className="btn-outline py-2 px-4 flex items-center gap-2">
                      <Download size={16} /> Download
                    </button>
                    <button onClick={() => window.print()} className="btn-outline py-2 px-4 flex items-center gap-2">
                      <Printer size={16} /> Print
                    </button>
                    <button onClick={() => setShowReceiptGen(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {receiptData.type === 'package' ? (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Basic Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Tracking ID</label>
                          <input className="input py-2" value={receiptData.trackingId} onChange={(e) => setReceiptData({...receiptData, trackingId: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Delivery Date</label>
                          <input type="date" className="input py-2" value={receiptData.deliveryDate} onChange={(e) => setReceiptData({...receiptData, deliveryDate: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Sender Name</label>
                        <input className="input py-2" value={receiptData.senderName} onChange={(e) => setReceiptData({...receiptData, senderName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Sender Address</label>
                        <input className="input py-2" value={receiptData.senderAddress} onChange={(e) => setReceiptData({...receiptData, senderAddress: e.target.value})} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Receiver Info</h4>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Receiver Name</label>
                        <input className="input py-2" value={receiptData.receiverName} onChange={(e) => setReceiptData({...receiptData, receiverName: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Receiver Email</label>
                        <input className="input py-2" value={receiptData.receiverEmail} onChange={(e) => setReceiptData({...receiptData, receiverEmail: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Receiver Address</label>
                        <input className="input py-2" value={receiptData.receiverAddress} onChange={(e) => setReceiptData({...receiptData, receiverAddress: e.target.value})} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Flight Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Flight Number</label>
                          <input className="input py-2" value={receiptData.flightNumber} onChange={(e) => setReceiptData({...receiptData, flightNumber: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Airline</label>
                          <input className="input py-2" value={receiptData.airline} onChange={(e) => setReceiptData({...receiptData, airline: e.target.value})} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Origin</label>
                          <input className="input py-2" value={receiptData.origin} onChange={(e) => setReceiptData({...receiptData, origin: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Destination</label>
                          <input className="input py-2" value={receiptData.destination} onChange={(e) => setReceiptData({...receiptData, destination: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-primary border-b pb-2">Passenger & Schedule</h4>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Passenger Name</label>
                        <input className="input py-2" value={receiptData.receiverName} onChange={(e) => setReceiptData({...receiptData, receiverName: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Departure</label>
                          <input type="datetime-local" className="input py-2" value={receiptData.departureTime} onChange={(e) => setReceiptData({...receiptData, departureTime: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Arrival</label>
                          <input type="datetime-local" className="input py-2" value={receiptData.arrivalTime} onChange={(e) => setReceiptData({...receiptData, arrivalTime: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-4 md:col-span-2">
                  <h4 className="font-bold text-brand-primary border-b pb-2">{receiptData.type === 'package' ? 'Consignment' : 'Booking'} Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {receiptData.type === 'package' ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Origin</label>
                          <input className="input py-2" value={receiptData.origin} onChange={(e) => setReceiptData({...receiptData, origin: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Content</label>
                          <input className="input py-2" value={receiptData.content} onChange={(e) => setReceiptData({...receiptData, content: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Weight</label>
                          <input className="input py-2" value={receiptData.weight} onChange={(e) => setReceiptData({...receiptData, weight: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Est. Delivery</label>
                          <input className="input py-2" value={receiptData.estDelivery} onChange={(e) => setReceiptData({...receiptData, estDelivery: e.target.value})} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Seat Number</label>
                          <input className="input py-2" placeholder="12A" value={receiptData.seatNumber} onChange={(e) => setReceiptData({...receiptData, seatNumber: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Gate</label>
                          <input className="input py-2" placeholder="B4" value={receiptData.gate} onChange={(e) => setReceiptData({...receiptData, gate: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Class</label>
                          <select className="input py-2" value={receiptData.class} onChange={(e) => setReceiptData({...receiptData, class: e.target.value})}>
                            <option>Economy</option>
                            <option>Premium Economy</option>
                            <option>Business</option>
                            <option>First Class</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Booking Ref</label>
                          <input className="input py-2" placeholder="BK-XXXX" value={receiptData.trackingId} onChange={(e) => setReceiptData({...receiptData, trackingId: e.target.value})} />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Payment Status</label>
                      <input className="input py-2" value={receiptData.paymentStatus} onChange={(e) => setReceiptData({...receiptData, paymentStatus: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Quantity</label>
                      <input className="input py-2" value={receiptData.quantity} onChange={(e) => setReceiptData({...receiptData, quantity: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Action/Status</label>
                      <input className="input py-2" value={receiptData.action} onChange={(e) => setReceiptData({...receiptData, action: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">{receiptData.type === 'package' ? 'Shipping Fee' : 'Ticket Price'}</label>
                      <input className="input py-2" value={receiptData.shippingFee} onChange={(e) => setReceiptData({...receiptData, shippingFee: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Owner Photo</label>
                      <input type="file" className="input py-2 text-xs" accept="image/*" onChange={handleOwnerPhotoChange} />
                    </div>
                  </div>

                  {receiptData.type === 'package' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-brand-primary flex items-center gap-2">
                        <ShieldCheck size={18} className="text-brand-secondary" />
                        Payment Methods (Customs Only)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Method Name</label>
                          <input className="input py-2" placeholder="e.g. Bitcoin" value={newPaymentMethod.name} onChange={(e) => setNewPaymentMethod({...newPaymentMethod, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Details/Address</label>
                          <input className="input py-2" placeholder="e.g. Wallet Address" value={newPaymentMethod.details} onChange={(e) => setNewPaymentMethod({...newPaymentMethod, details: e.target.value})} />
                        </div>
                        <div className="flex items-end">
                          <button onClick={addPaymentMethod} className="btn-primary w-full py-2 flex items-center justify-center gap-2">
                            <Plus size={16} /> Add
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {receiptData.paymentMethods.map((pm, idx) => (
                          <div key={idx} className="bg-slate-100 px-3 py-2 rounded-xl flex items-center gap-3 border border-slate-200">
                            <div className="text-xs">
                              <p className="font-black text-brand-primary uppercase">{pm.name}</p>
                              <p className="text-slate-500 font-mono truncate max-w-[150px]">{pm.details}</p>
                            </div>
                            <button onClick={() => removePaymentMethod(idx)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Preview (Printable) */}
              <div id="printable-receipt" className="bg-white p-12 border border-slate-200 rounded-lg shadow-sm font-sans text-slate-800 relative overflow-hidden">
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible; }
                    #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
                  }
                `}} />
                
                <div>
                  {receiptData.type === 'package' ? (
                    <>
                      {/* Header Section - Blue Header */}
                      <div className="bg-brand-primary p-8 text-white rounded-t-2xl flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                            <Truck className="text-white" size={28} />
                          </div>
                          <div>
                            <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-tighter">Diplomatic <span className="text-brand-secondary">Xpress</span></h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Logistics & Courier</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-white/70 tracking-widest mb-1">Tracking Number</p>
                          <p className="text-2xl font-black text-white font-mono">{receiptData.trackingId || "---"}</p>
                        </div>
                      </div>

                      <div className="px-4">
                        <div className="flex justify-between items-center mb-12">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Consignment Receipt</p>
                            <p className="text-sm font-medium text-slate-500 italic">"Global reach, local touch."</p>
                          </div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date: {receiptData.deliveryDate || new Date().toLocaleDateString()}</p>
                        </div>

                        {/* Address Grid */}
                        <div className="grid grid-cols-2 gap-16 mb-12">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                              <div className="w-2 h-2 rounded-full bg-brand-secondary" />
                              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Shipper Details</h3>
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-black text-brand-primary">{receiptData.senderName || "---"}</p>
                              <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{receiptData.senderAddress || "---"}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Consignee Details</h3>
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-black text-brand-primary">{receiptData.receiverName || "---"}</p>
                              <p className="text-sm font-bold text-brand-secondary">{receiptData.receiverEmail || "---"}</p>
                              <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{receiptData.receiverAddress || "---"}</p>
                              {receiptData.ownerPhotoUrl && (
                                <div className="mt-4">
                                  <img 
                                    src={receiptData.ownerPhotoUrl} 
                                    alt="Owner" 
                                    className="w-24 h-24 rounded-xl object-cover border-2 border-slate-100 shadow-sm"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Main Content Table */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden mb-12">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Origin</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Weight</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="px-6 py-8">
                                  <p className="font-black text-brand-primary mb-1">{receiptData.content || "General Cargo"}</p>
                                  <p className="text-xs text-slate-400 italic">Status: {receiptData.action || "In Transit"}</p>
                                </td>
                                <td className="px-6 py-8 text-center font-bold text-slate-600">{receiptData.origin || "---"}</td>
                                <td className="px-6 py-8 text-center font-bold text-slate-600">{receiptData.weight || "---"}</td>
                                <td className="px-6 py-8 text-right font-black text-brand-primary text-xl">{receiptData.quantity || "1"}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="bg-slate-50/50 p-8 grid grid-cols-2 gap-8 border-t border-slate-200">
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Status</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  receiptData.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>{receiptData.paymentStatus || "PENDING"}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Delivery</span>
                                <span className="text-sm font-black text-brand-primary">{receiptData.estDelivery || "---"}</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center items-end space-y-2">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Shipping Fee</p>
                              <p className="text-4xl font-black text-brand-primary tracking-tighter">{receiptData.shippingFee || "---"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Payment Methods (Conditional) */}
                        {receiptData.action.toLowerCase().includes('custom') && receiptData.paymentMethods.length > 0 && (
                          <div className="mb-12 bg-amber-50/50 p-8 rounded-2xl border border-amber-100">
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
                              <ShieldCheck size={14} /> Required Payment Methods for Customs Clearance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {receiptData.paymentMethods.map((pm, idx) => (
                                <div key={idx} className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pm.name}</p>
                                  <p className="text-sm font-mono text-brand-primary break-all bg-white p-2 rounded-lg border border-amber-100">{pm.details}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Flight Ticket Design (Original Boarding Pass Style) */}
                      <div className="border-4 border-brand-primary rounded-3xl overflow-hidden bg-white shadow-xl">
                        <div className="bg-brand-primary p-6 text-white flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Plane size={32} className="text-brand-secondary" />
                            <div>
                              <h1 className="text-2xl font-black uppercase tracking-tighter">Diplomatic <span className="text-brand-secondary">Xpress</span> Airways</h1>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Boarding Pass & E-Ticket</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase opacity-60">Flight Number</p>
                            <p className="text-2xl font-black tracking-tighter">{receiptData.flightNumber || "---"}</p>
                          </div>
                        </div>
                        
                        <div className="p-8">
                          <div className="grid grid-cols-3 gap-8 mb-8">
                            <div className="col-span-2 space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passenger Name</p>
                              <p className="text-xl font-black text-brand-primary uppercase">{receiptData.receiverName || "---"}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</p>
                              <p className="text-xl font-black text-brand-primary">{receiptData.deliveryDate || new Date().toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-8 bg-slate-50 p-8 rounded-2xl border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
                            <div className="space-y-1">
                              <p className="text-4xl font-black text-brand-primary tracking-tighter">{receiptData.origin || "---"}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{receiptData.origin || "Origin"}</p>
                            </div>
                            <div className="flex-1 flex flex-col items-center px-8">
                              <div className="w-full flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand-primary" />
                                <div className="flex-1 border-t-2 border-dashed border-slate-200 relative">
                                  <Plane size={20} className="text-brand-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="w-2 h-2 rounded-full border-2 border-brand-primary" />
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Flight Duration: ---</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-4xl font-black text-brand-primary tracking-tighter">{receiptData.destination || "---"}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{receiptData.destination || "Destination"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-8 mb-8 border-b border-slate-100 pb-8">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gate</p>
                              <p className="text-lg font-black text-brand-primary">{receiptData.gate || "TBA"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Boarding</p>
                              <p className="text-lg font-black text-brand-primary">---</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seat</p>
                              <p className="text-lg font-black text-brand-primary">{receiptData.seatNumber || "---"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class</p>
                              <p className="text-lg font-black text-brand-primary uppercase">{receiptData.class || "Economy"}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="flex items-center gap-4">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <QrCode size={64} className="text-brand-primary" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booking Ref: {receiptData.trackingId || "---"}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price: {receiptData.shippingFee || "---"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                              <ShieldCheck size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest">Valid for Travel • Non-Transferable</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Footer Section (Common) */}
                  <div className="grid grid-cols-3 gap-8 items-end pt-8 border-t border-slate-100 mt-8">
                    <div className="col-span-2 space-y-4">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                          <ShieldCheck size={20} className="text-brand-secondary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Security Verification</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">This document is digitally signed and verified by Diplomatic Xpress Logistics. Any alteration of this receipt is strictly prohibited and punishable by law.</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-4">
                      <div className="inline-block border-b-2 border-slate-200 px-8 pb-2 relative">
                        <p className="text-2xl font-signature text-brand-primary absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap transform -rotate-2">Diplomatic Xpress</p>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4">Authorized Signature</p>
                      </div>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Logistics Operations Dept.</p>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-slate-50 flex justify-between items-center">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">© 2026 Diplomatic Xpress Logistics. All rights reserved.</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Generated: {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showUsers && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4"
            onClick={() => setShowUsers(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white md:bg-white w-full md:max-w-2xl md:rounded-[2rem] rounded-t-[2rem] max-h-[85vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 shrink-0">
                <h3 className="text-xl md:text-2xl font-black text-brand-primary tracking-tight">Registered Users ({users.length})</h3>
                <button onClick={() => setShowUsers(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-all"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-widest">
                        <th className="pb-4 font-bold">Username</th>
                        <th className="pb-4 font-bold">Email</th>
                        <th className="pb-4 font-bold">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-bold text-brand-primary">{u.username}</td>
                          <td className="py-4 text-slate-500">{u.email}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              u.role === 'admin' ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {users.map((u) => (
                    <div key={u.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-brand-primary text-sm">{u.username}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-brand-secondary/10 text-brand-secondary' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold truncate">{u.email}</p>
                    </div>
                  ))}
                </div>
                {users.length === 0 && (
                  <div className="text-center py-10 text-slate-400 font-bold">No users registered yet.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showLogs && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setShowLogs(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">System Activity Logs</h3>
                <button onClick={() => setShowLogs(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-4">
                    <div>
                      <p className="text-sm font-bold text-brand-primary">{log.action}</p>
                      <p className="text-xs text-slate-400">By <span className="text-brand-secondary font-bold">{log.username}</span></p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-10 text-slate-400">No activity logged yet.</div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Payment Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-slate-500">Configure the payment account details that will be shown to users when they book flights. Users will see these instructions to complete their payment.</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Bank / Payment Provider</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Chase Bank, PayPal, Wise"
                      value={paymentAccount.bank_name || ""}
                      onChange={(e) => setPaymentAccount({ ...paymentAccount, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Account Holder Name</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Diplomatic Xpress Logistics"
                      value={paymentAccount.account_name || ""}
                      onChange={(e) => setPaymentAccount({ ...paymentAccount, account_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Account Number / IBAN / Wallet</label>
                    <input 
                      className="input" 
                      placeholder="e.g. 1234567890 or IBAN..."
                      value={paymentAccount.account_number || ""}
                      onChange={(e) => setPaymentAccount({ ...paymentAccount, account_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Routing / Sort Code / SWIFT (Optional)</label>
                    <input 
                      className="input" 
                      placeholder="e.g. CHASUS33"
                      value={paymentAccount.routing_number || ""}
                      onChange={(e) => setPaymentAccount({ ...paymentAccount, routing_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Reference / Note</label>
                    <input 
                      className="input" 
                      placeholder="e.g. Include booking reference in payment"
                      value={paymentAccount.payment_note || ""}
                      onChange={(e) => setPaymentAccount({ ...paymentAccount, payment_note: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/settings/payment-account", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
                        body: JSON.stringify(paymentAccount),
                      });
                      if (res.ok) alert("Payment settings saved!");
                    } catch { alert("Failed to save."); }
                  }} 
                  className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Save Payment Settings
                </button>
                {paymentAccount.bank_name && (
                  <button 
                    onClick={async () => {
                      if (!confirm("Remove all payment details? Users will no longer see payment instructions.")) return;
                      try {
                        const res = await fetch("/api/settings/payment-account", {
                          method: "DELETE",
                          headers: { "x-admin-user": user.username, "x-admin-secret": adminSecret.trim() },
                        });
                        if (res.ok) { setPaymentAccount({}); alert("Payment details removed."); }
                      } catch { alert("Failed to remove."); }
                    }}
                    className="btn-outline py-4 px-6 text-red-500 hover:bg-red-50 border-red-200 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Remove
                  </button>
                )}
                </div>

                {paymentAccount.bank_name && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Preview — What users will see:</p>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-brand-primary">{paymentAccount.bank_name}</p>
                      <p className="text-slate-500">{paymentAccount.account_name}</p>
                      <p className="text-slate-500 font-mono">{paymentAccount.account_number}</p>
                      {paymentAccount.routing_number && <p className="text-slate-400 text-xs">{paymentAccount.routing_number}</p>}
                      {paymentAccount.payment_note && <p className="text-brand-secondary text-xs italic mt-2">{paymentAccount.payment_note}</p>}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isViewingShipment && viewingShipmentData && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => { setIsViewingShipment(false); setViewingShipmentData(null); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-secondary/10 text-brand-secondary rounded-xl flex items-center justify-center">
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-brand-primary tracking-tight">Shipment Details</h3>
                    <p className="text-sm font-mono font-bold text-brand-secondary">{viewingShipmentData.id}</p>
                  </div>
                </div>
                <button onClick={() => { setIsViewingShipment(false); setViewingShipmentData(null); }} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                    <p className="font-bold text-brand-primary">{viewingShipmentData.customer_name}</p>
                    <p className="text-xs text-slate-500">{viewingShipmentData.client_phone}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Route</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-brand-primary">{viewingShipmentData.origin}</span>
                      <ChevronRight size={14} className="text-slate-300" />
                      <span className="font-bold text-brand-secondary">{viewingShipmentData.destination}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                    <span className="px-3 py-1 bg-brand-secondary text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {viewingShipmentData.status}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Claimed By</p>
                    <p className="font-bold text-brand-primary">{viewingShipmentData.claimed_by || "Unclaimed"}</p>
                  </div>
                </div>
              </div>

              {viewingShipmentData.client_photo_url && (
                <div className="mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                    <img src={viewingShipmentData.client_photo_url} alt="Client" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Client Identity Photo</p>
                    <p className="text-xs text-indigo-600 font-bold">Verified for this shipment</p>
                  </div>
                </div>
              )}

              {viewingShipmentData.product_photos && viewingShipmentData.product_photos.length > 0 && (
                <div className="mb-8 space-y-4">
                  <h4 className="text-lg font-black text-brand-primary tracking-tight flex items-center gap-2">
                    <Camera size={20} className="text-brand-secondary" />
                    Product Images
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    {viewingShipmentData.product_photos.map((photo: string, i: number) => (
                      <div key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                        <img src={photo} alt={`Product ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h4 className="text-lg font-black text-brand-primary tracking-tight flex items-center gap-2">
                  <History size={20} className="text-brand-secondary" />
                  Transit Timeline
                </h4>
                <div className="space-y-6 border-l-2 border-slate-100 ml-3 pl-6">
                  {viewingShipmentData.updates?.map((update: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[1.85rem] top-1 w-3 h-3 rounded-full bg-brand-secondary border-2 border-white shadow-sm" />
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-brand-primary">{update.status}</p>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(update.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={12} />
                          {update.location}
                        </p>
                        {update.notes && <p className="text-xs text-slate-400 italic">"{update.notes}"</p>}
                      </div>
                    </div>
                  ))}
                  {(!viewingShipmentData.updates || viewingShipmentData.updates.length === 0) && (
                    <p className="text-sm text-slate-400 italic">No updates recorded yet.</p>
                  )}
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => {
                    setSelectedShipment(viewingShipmentData);
                    setIsViewingShipment(false);
                  }}
                  className="btn-primary flex-1 py-3"
                >
                  Update Status
                </button>
                <button 
                  onClick={() => {
                    setEditShipmentData({
                      customer_name: viewingShipmentData.customer_name,
                      client_phone: viewingShipmentData.client_phone || "",
                      origin: viewingShipmentData.origin,
                      destination: viewingShipmentData.destination,
                      weight: viewingShipmentData.weight || "",
                      dimensions: viewingShipmentData.dimensions || "",
                      estimated_delivery: viewingShipmentData.estimated_delivery || "",
                      shipping_cost: viewingShipmentData.shipping_cost || "",
                      content_description: viewingShipmentData.content_description || ""
                    });
                    setSelectedShipment(viewingShipmentData);
                    setIsEditingShipment(true);
                    setIsViewingShipment(false);
                  }}
                  className="btn-outline flex-1 py-3"
                >
                  Edit Details
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isEditingShipment && selectedShipment && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => { setIsEditingShipment(false); setSelectedShipment(null); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Edit Shipment: {selectedShipment.id}</h3>
                <button onClick={() => { setIsEditingShipment(false); setSelectedShipment(null); }} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleEditShipment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Customer Name</label>
                  <input required className="input" value={editShipmentData.customer_name} onChange={(e) => setEditShipmentData({ ...editShipmentData, customer_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Phone</label>
                  <input required className="input" value={editShipmentData.client_phone} onChange={(e) => setEditShipmentData({ ...editShipmentData, client_phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Origin</label>
                    <input required className="input" value={editShipmentData.origin} onChange={(e) => setEditShipmentData({ ...editShipmentData, origin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Destination</label>
                    <input required className="input" value={editShipmentData.destination} onChange={(e) => setEditShipmentData({ ...editShipmentData, destination: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Weight (kg)</label>
                    <input className="input" value={editShipmentData.weight} onChange={(e) => setEditShipmentData({ ...editShipmentData, weight: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Dimensions</label>
                    <input className="input" value={editShipmentData.dimensions} onChange={(e) => setEditShipmentData({ ...editShipmentData, dimensions: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Cost ($)</label>
                    <input className="input" value={editShipmentData.shipping_cost} onChange={(e) => setEditShipmentData({ ...editShipmentData, shipping_cost: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Content</label>
                    <input className="input" value={editShipmentData.content_description} onChange={(e) => setEditShipmentData({ ...editShipmentData, content_description: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Est. Delivery</label>
                    <input type="date" className="input" value={editShipmentData.estimated_delivery} onChange={(e) => setEditShipmentData({ ...editShipmentData, estimated_delivery: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-lg">Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}

        {selectedTicket && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Ticket: {selectedTicket.subject}</h3>
                <button onClick={() => { setSelectedTicket(null); setReplyImage(null); }} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase mb-2">Original Message</p>
                  <p className="text-sm text-slate-600">{selectedTicket.message}</p>
                </div>
                <div className="space-y-4">
                  {replies.map((r) => (
                    <div key={r.id} className={`p-4 rounded-xl border ${r.sender_username === "Admin" ? "bg-indigo-50 border-indigo-100 ml-8" : "bg-white border-slate-100 mr-8"}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-brand-secondary uppercase">{r.sender_username}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleString()}</span>
                      </div>
                      {r.message && <p className="text-sm text-slate-600">{r.message}</p>}
                      {r.image_url && (
                        <div className="mt-3">
                          <img
                            src={r.image_url}
                            alt="Attached"
                            className="rounded-xl border border-slate-200 max-w-full max-h-64 object-contain shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {replyImage && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Image size={16} className="text-brand-secondary shrink-0" />
                    <span className="text-xs font-bold text-slate-500 truncate flex-1">{replyImage.name}</span>
                    <button type="button" onClick={() => setReplyImage(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">Remove</button>
                  </div>
                )}
                <form onSubmit={handleReply} className="flex gap-4 items-center">
                  <label className="shrink-0 p-3 rounded-xl bg-slate-100 text-slate-400 hover:bg-brand-secondary/10 hover:text-brand-secondary cursor-pointer transition-all">
                    <Image size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setReplyImage(e.target.files?.[0] || null)} />
                  </label>
                  <input className="input flex-1" placeholder="Type your reply..." value={newReply} onChange={(e) => setNewReply(e.target.value)} />
                  <button type="submit" disabled={!newReply && !replyImage} className="btn-primary px-8 disabled:opacity-50">Reply</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isViewingFlight && viewingFlightData && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setIsViewingFlight(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="card w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Flight History: {viewingFlightData.flight_number}</h3>
                <button onClick={() => setIsViewingFlight(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {viewingFlightData.updates?.map((u: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="px-2 py-0.5 bg-brand-secondary/10 text-brand-secondary text-[10px] font-black rounded uppercase">{u.status}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(u.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 mb-1">{u.location || "No location provided"}</p>
                    {u.notes && <p className="text-sm text-slate-500 italic">"{u.notes}"</p>}
                  </div>
                ))}
                {(!viewingFlightData.updates || viewingFlightData.updates.length === 0) && (
                  <p className="text-center py-10 text-slate-400 font-bold">No history available.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {selectedFlight && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedFlight(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Update Flight: {selectedFlight.flight_number}</h3>
                <button onClick={() => setSelectedFlight(null)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleUpdateFlightStatus} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Status</label>
                  <select className="input" value={flightUpdateData.status} onChange={(e) => setFlightUpdateData({ ...flightUpdateData, status: e.target.value })}>
                    <option>Scheduled</option>
                    <option>Delayed</option>
                    <option>Boarding</option>
                    <option>Taxiing</option>
                    <option>Taking Off</option>
                    <option>In-Air</option>
                    <option>Descending</option>
                    <option>Landing</option>
                    <option>Landed</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Current Location</label>
                  <input className="input" placeholder="e.g. Over Atlantic Ocean" value={flightUpdateData.location} onChange={(e) => setFlightUpdateData({ ...flightUpdateData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</label>
                  <textarea className="input min-h-[100px]" placeholder="Additional details..." value={flightUpdateData.notes} onChange={(e) => setFlightUpdateData({ ...flightUpdateData, notes: e.target.value })} />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setSelectedFlight(null)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Update Flight</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingFlight && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setIsAddingFlight(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Add New Flight</h3>
                <button onClick={() => setIsAddingFlight(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleAddFlight} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 pb-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Airline</label>
                    <input required className="input" placeholder="Xpress Airways" value={newFlight.airline} onChange={(e) => setNewFlight({ ...newFlight, airline: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Flight Number</label>
                    <input required className="input" placeholder="XP-123" value={newFlight.flight_number} onChange={(e) => setNewFlight({ ...newFlight, flight_number: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Origin</label>
                    <input required className="input" placeholder="New York (JFK)" value={newFlight.origin} onChange={(e) => setNewFlight({ ...newFlight, origin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Destination</label>
                    <input required className="input" placeholder="London (LHR)" value={newFlight.destination} onChange={(e) => setNewFlight({ ...newFlight, destination: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Departure Time</label>
                    <input required type="datetime-local" className="input" value={newFlight.departure_time} onChange={(e) => setNewFlight({ ...newFlight, departure_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Arrival Time</label>
                    <input required type="datetime-local" className="input" value={newFlight.arrival_time} onChange={(e) => setNewFlight({ ...newFlight, arrival_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Price ($)</label>
                    <input required type="number" className="input" placeholder="599" value={newFlight.price} onChange={(e) => setNewFlight({ ...newFlight, price: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Seats</label>
                    <input required type="number" className="input" placeholder="100" value={newFlight.available_seats} onChange={(e) => setNewFlight({ ...newFlight, available_seats: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsAddingFlight(false)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Add Flight</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setIsAdding(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-black text-brand-primary tracking-tight">New Consignment</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleAddShipment} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tracking ID</label>
                    <div className="flex gap-2">
                      <input required className="input" placeholder="LOGI-XXXXX" value={newShipment.id} onChange={(e) => setNewShipment({ ...newShipment, id: e.target.value })} />
                      <button type="button" onClick={() => setNewShipment({ ...newShipment, id: 'LOGI-' + Math.random().toString(36).substring(2, 10).toUpperCase() })} className="btn-outline px-3 py-2 text-xs">Gen</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Customer Name</label>
                    <input required className="input" placeholder="John Doe" value={newShipment.customer_name} onChange={(e) => setNewShipment({ ...newShipment, customer_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Phone (Optional)</label>
                    <input className="input" placeholder="+1 234 567 890" value={newShipment.client_phone} onChange={(e) => setNewShipment({ ...newShipment, client_phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Photo</label>
                    <input type="file" className="input text-xs" onChange={(e) => setClientPhoto(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Origin</label>
                    <input required className="input" placeholder="New York, NY" value={newShipment.origin} onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Destination</label>
                    <input required className="input" placeholder="London, UK" value={newShipment.destination} onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Weight (kg)</label>
                    <input className="input" placeholder="e.g. 5.2" value={newShipment.weight} onChange={(e) => setNewShipment({ ...newShipment, weight: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Dimensions (cm)</label>
                    <input className="input" placeholder="e.g. 30x20x15" value={newShipment.dimensions} onChange={(e) => setNewShipment({ ...newShipment, dimensions: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Shipping Cost ($)</label>
                    <input className="input" placeholder="e.g. 49.99" value={newShipment.shipping_cost} onChange={(e) => setNewShipment({ ...newShipment, shipping_cost: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Content Description</label>
                    <input className="input" placeholder="e.g. Electronics, Documents" value={newShipment.content_description} onChange={(e) => setNewShipment({ ...newShipment, content_description: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Est. Delivery Date</label>
                    <input type="date" className="input" value={newShipment.estimated_delivery} onChange={(e) => setNewShipment({ ...newShipment, estimated_delivery: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Initial Status</label>
                  <select className="input" value={newShipment.status} onChange={(e) => setNewShipment({ ...newShipment, status: e.target.value })}>
                    <option>Pending</option>
                    <option>Warehouse</option>
                    <option>Shipping</option>
                    <option>Courier 1</option>
                    <option>Courier 2</option>
                    <option>Courier 3</option>
                    <option>In Transit</option>
                    <option>Customs</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Product Photos (Max 5)</label>
                  <input 
                    type="file" 
                    multiple 
                    className="input text-xs" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setProductPhotos(files.slice(0, 5));
                    }} 
                  />
                  <p className="text-[10px] text-slate-400">{productPhotos.length} photos selected</p>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Create Consignment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {selectedShipment && !isEditingShipment && (
          <div 
            className="fixed inset-0 bg-brand-primary/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedShipment(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-brand-primary tracking-tight">Update: {selectedShipment.id}</h3>
                <button onClick={() => setSelectedShipment(null)} className="text-slate-400 hover:text-brand-primary"><X size={28} /></button>
              </div>
              <form onSubmit={handleUpdateStatus} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Status</label>
                  <select className="input" value={updateData.status} onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}>
                    <option>Warehouse</option>
                    <option>Shipping</option>
                    <option>Courier 1</option>
                    <option>Courier 2</option>
                    <option>Courier 3</option>
                    <option>In Transit</option>
                    <option>Customs</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Current Location</label>
                  <input className="input" placeholder="Distribution Hub A" value={updateData.location} onChange={(e) => setUpdateData({ ...updateData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</label>
                  <textarea className="input h-24" placeholder="Update details..." value={updateData.notes} onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })} />
                </div>

                {updateData.status === "Customs" && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-sm font-black text-brand-primary flex items-center gap-2">
                      <ShieldCheck size={18} className="text-brand-secondary" />
                      Customs Payment Details
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</label>
                        <input 
                          className="input py-2 text-xs" 
                          type="number"
                          step="0.01"
                          placeholder="e.g. 1500.00" 
                          value={updateData.customsAmount}
                          onChange={(e) => setUpdateData({...updateData, customsAmount: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Currency</label>
                        <select 
                          className="input py-2 text-xs" 
                          value={updateData.customsCurrency}
                          onChange={(e) => setUpdateData({...updateData, customsCurrency: e.target.value})}
                        >
                          {["USD", "EUR", "GBP", "NGN", "CAD", "AUD", "JPY", "CNY", "ZAR", "GHS", "KES", "INR"].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <h4 className="text-sm font-black text-brand-primary flex items-center gap-2 mt-2">
                      <ShieldCheck size={18} className="text-brand-secondary" />
                      Payment Methods
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        className="input py-2 text-xs" 
                        placeholder="Method (e.g. Bitcoin)" 
                        value={newUpdatePaymentMethod.name}
                        onChange={(e) => setNewUpdatePaymentMethod({...newUpdatePaymentMethod, name: e.target.value})}
                      />
                      <input 
                        className="input py-2 text-xs" 
                        placeholder="Details/Address" 
                        value={newUpdatePaymentMethod.details}
                        onChange={(e) => setNewUpdatePaymentMethod({...newUpdatePaymentMethod, details: e.target.value})}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        if (newUpdatePaymentMethod.name && newUpdatePaymentMethod.details) {
                          setUpdateData({
                            ...updateData,
                            paymentMethods: [...updateData.paymentMethods, newUpdatePaymentMethod]
                          });
                          setNewUpdatePaymentMethod({ name: "", details: "" });
                        }
                      }}
                      className="btn-primary w-full py-2 text-xs"
                    >
                      Add Payment Method
                    </button>
                    <div className="space-y-2">
                      {updateData.paymentMethods.map((pm, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 text-xs">
                          <span className="font-bold">{pm.name}: <span className="font-mono text-slate-500">{pm.details}</span></span>
                          <button 
                            type="button"
                            onClick={() => {
                              const newMethods = [...updateData.paymentMethods];
                              newMethods.splice(idx, 1);
                              setUpdateData({ ...updateData, paymentMethods: newMethods });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Proof Photo</label>
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-2xl p-8 cursor-pointer hover:border-brand-secondary transition-all bg-slate-50/50">
                    <Camera size={32} className="text-slate-300" />
                    <span className="text-sm font-bold text-slate-500">{photo ? photo.name : "Click to upload photo"}</span>
                    <input type="file" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setSelectedShipment(null)} className="btn-outline flex-1 py-4">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-4 text-lg">Update Status</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
