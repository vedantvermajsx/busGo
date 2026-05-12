import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Loader2, ArrowRight, X, Check, Clock, PartyPopper, Calendar, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import MapPicker from '../components/MapPicker.jsx';
import tripApi from '../services/TripApi.js';
import bookingApi from '../services/BookingApi.js';

export default function BookingConfirm() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [allTrips, setAllTrips] = useState([]);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [fareInfo, setFareInfo] = useState(null);
  const [locations, setLocations] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [busType, setBusType] = useState('AC');
  const [numPeople, setNumPeople] = useState(1);
  const [nearestStops, setNearestStops] = useState({ from: null, to: null });
  const [isFullBus, setIsFullBus] = useState(false);

  const [selectedSeat, setSelectedSeat] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [fetchingSeats, setFetchingSeats] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  const [movingStep, setMovingStep] = useState(false);

  const [step, setStep] = useState(1); // 1: Map, 2: Details, 3: Seat, 4: Fare

  const refreshSeats = () => setLastRefreshed(Date.now());

  const goToStep = (nextStep) => {
    setMovingStep(true);
    if (nextStep === 3) refreshSeats();
    setTimeout(() => {
      setStep(nextStep);
      setMovingStep(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 600);
  };

  useEffect(() => {
    if (step === 3 && trip?._id) {
      setFetchingSeats(true);
      // We don't reset selectedSeat here anymore to allow "refresh" without clearing selection
      // But we will clear selection if the trip changed
      bookingApi.getBookedSeats(trip._id)
        .then(d => {
          setBookedSeats(d.seats || []);
          // Clear any selected seats that are now booked
          setSelectedSeat(prev => prev.filter(s => !(d.seats || []).includes(s)));
        })
        .catch(() => toast.error('Failed to load seat map'))
        .finally(() => setFetchingSeats(false));
    }
  }, [step, trip?._id, lastRefreshed]);

  // Reset selection if trip changes
  useEffect(() => {
    setSelectedSeat([]);
  }, [trip?._id]);

  useEffect(() => {
    // Find all available trips for the selected date
    setLoading(true);
    tripApi.searchTrips(selectedDate)
      .then(d => {
        setAllTrips(d.trips || []);
      })
      .catch(() => toast.error('Service currently unavailable'))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => {
    if (allTrips.length === 0) return;

    // Filter trips by busType
    const matchingTypeTrips = allTrips.filter(t => t.busId?.type === busType);
    
    // Find a trip with enough seats
    let bestTrip = null;
    
    if (isFullBus) {
      bestTrip = matchingTypeTrips.find(t => t.seatsBooked === 0);
    } else {
      bestTrip = matchingTypeTrips.find(t => (t.busId?.capacity - t.seatsBooked) >= numPeople);
    }

    if (bestTrip) {
      setTrip(bestTrip);
    } else {
      setTrip(null);
    }
  }, [allTrips, busType, numPeople, isFullBus]);

  const handleBook = async () => {
    if (!locations?.from || !locations?.to) {
      toast.error('Please select pickup and drop-off locations.');
      return;
    }
    setSubmitting(true);
    const totalSeats = isFullBus ? (trip?.busId?.capacity || 1) : Number(numPeople);
    let totalPrice = (fareInfo?.price || 0) * totalSeats;
    
    totalPrice = Math.ceil(totalPrice / 10) * 10;

    try {
      const res = await bookingApi.createBooking({
        tripId: trip?._id ?? null,
        fromLat: locations.from.lat,
        fromLng: locations.from.lng,
        toLat: locations.to.lat,
        toLng: locations.to.lng,
        fromAddress: locations.from.address,
        toAddress: locations.to.address,
        numPeople: totalSeats,
        price: totalPrice,
        seatNumbers: isFullBus ? [] : selectedSeat,
        isFullBus,
      });
      setBooking(res.booking);
      toast.success('Booking Successful!');
      setTimeout(() => navigate('/my-bookings'), 3000);
    } catch (e) {
      toast.error(e.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (booking && canvasRef.current) {
      const myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true
      });

      const duration = 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 10, spread: 180, ticks: 60, zIndex: 0 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 20 * (timeLeft / duration);
        myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        myConfetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 150);

      return () => clearInterval(interval);
    }
  }, [booking]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
    </div>
  );

  if (booking) return (
    <div className="max-w-md mx-auto px-6 py-20 text-center relative overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-0" />
      <div className="relative z-10">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-20" />
          <PartyPopper className="w-12 h-12 text-emerald-600 relative z-10" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-4">Your Bus is Booked Successfully!</h2>
        <p className="text-slate-500 mb-8 text-lg leading-relaxed">
          Pack your bags! Your seat for {numPeople} {numPeople > 1 ? 'people' : 'person'} has been reserved. We've notified the operator and you'll receive a confirmation call shortly.
        </p>

        {booking.verificationCode && (
          <div className="mb-10 p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl transition-all duration-300">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Your Verification OTP</p>
            <div className="flex items-center justify-center gap-4">
              {booking.verificationCode.split('').map((digit, i) => (
                <div key={i} className="w-12 h-16 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                  <span className="text-3xl font-black text-white font-mono">{digit}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-4">Provide this code to the admin/driver at pickup.</p>
          </div>
        )}

        <div className="space-y-4">
          <button onClick={() => navigate('/my-bookings')} className="btn-primary w-full py-4 text-lg">
            Track My Journey
          </button>
          <p className="text-xs text-slate-400 font-medium">Redirecting to your bookings in a few seconds...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Linear Progress */}
      <div className="flex items-center gap-4 mb-12">
        {(isFullBus ? [1, 2, 4] : [1, 2, 3, 4]).map((i, index, arr) => (
          <div key={i} className="flex items-center gap-4 flex-1 last:flex-none">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-colors ${step >= i ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-300'}`}>
              {index + 1}
            </div>
            {index < arr.length - 1 && <div className={`h-1 flex-1 rounded-full transition-colors ${step >= arr[index+1] ? 'bg-slate-900' : 'bg-slate-50'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="text-left">
              <h1 className="text-4xl font-black text-slate-900 mb-2">Select Route</h1>
              <p className="text-slate-500 font-medium">Pin your pickup and drop-off on the map.</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <button 
                onClick={() => setIsFullBus(false)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isFullBus ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Individual Seat
              </button>
              <button 
                onClick={() => setIsFullBus(true)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isFullBus ? 'bg-slate-900 shadow-lg text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Full Bus
              </button>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden ring-1 ring-slate-800 border-slate-800 shadow-2xl">
            <MapPicker
              tripId={trip?._id}
              basePricePerKm={trip?.basePricePerKm}
              stops={trip?.stops || []}
              isFullBus={isFullBus}
              onFareUpdate={setFareInfo}
              onLocationsChange={setLocations}
              onNearestStopUpdate={(type, nearest) => setNearestStops(p => ({ ...p, [type]: nearest }))}
            />
          </div>
          {locations?.from && locations?.to && (
            <div className="flex flex-col gap-4">
              {!isFullBus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nearestStops.from && (
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nearby Pickup</p>
                      <p className="font-bold text-white">{nearestStops.from.stop?.stopId?.name || 'Unknown Stop'}</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size="12" /> Reach by {nearestStops.from.stop?.arrivalTime}
                      </p>
                    </div>
                  )}
                  {nearestStops.to && (
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nearby Drop-off</p>
                      <p className="font-bold text-white">{nearestStops.to.stop?.stopId?.name || 'Unknown Stop'}</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size="12" /> Arrival at {nearestStops.to.stop?.arrivalTime}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button
              onClick={() => goToStep(2)} 
              disabled={movingStep || (locations?.from && locations?.to && !trip)}
              className="btn-primary flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {movingStep ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'} 
              {!movingStep && <ArrowRight className="w-5 h-5 transition-transform" />}
            </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-12 max-w-2xl">
          <div className="text-left">
            <h1 className="text-4xl font-black text-slate-900 mb-2">Your Details</h1>
            <p className="text-slate-500 font-medium">Tell us about your journey.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Bus Comfort</label>
              <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                {['AC', 'Non-AC'].map(t => (
                  <button
                    key={t}
                    onClick={() => setBusType(t)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${busType === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-800 hover:text-slate-600'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Journey Date</label>
              <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-transparent focus-within:border-slate-200 focus-within:bg-white transition-all">
                <Calendar className="w-5 h-5 text-slate-400" />
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 font-bold text-slate-900 bg-transparent border-none focus:outline-none cursor-pointer" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Number of People</label>
              <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-1">
                <button onClick={() => setNumPeople(Math.max(1, numPeople - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-colors text-slate-800">
                  -
                </button>
                <input type='number' min="1" className="flex-1 text-center font-bold text-slate-900 bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={numPeople} onChange={(e) => setNumPeople(Math.max(1, Number(e.target.value)))} />
                <button onClick={() => setNumPeople(numPeople + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-colors text-slate-800">
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Fleet Availability</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Available Section */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                  <Check className="w-3 h-3" /> Available Buses
                </p>
                {allTrips.filter(t => 
                   t.busId?.type === busType && 
                   (isFullBus ? t.seatsBooked === 0 : (t.busId?.capacity - t.seatsBooked) >= numPeople)
                 ).map(t => (
                   <button 
                     key={t._id} 
                     onClick={() => setTrip(t)}
                     className={`w-full text-left p-4 rounded-2xl border transition-all ${trip?._id === t._id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-900 hover:border-slate-300'}`}
                   >
                     <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                         <div className="relative">
                           <Bus className={`w-5 h-5 ${trip?._id === t._id ? 'text-white' : 'text-slate-400'}`} />
                         </div>
                         <div>
                           <p className="text-xs font-black">{t.busId?.vehicleNumber}</p>
                           <p className={`text-[10px] font-bold ${trip?._id === t._id ? 'text-slate-400' : 'text-slate-500'}`}>{t.busId?.capacity - t.seatsBooked} seats left</p>
                         </div>
                       </div>
                       {trip?._id === t._id && <Check className="w-4 h-4 text-emerald-400" />}
                     </div>
                   </button>
                 ))}
                {allTrips.filter(t => t.busId?.type === busType && (isFullBus ? t.seatsBooked === 0 : (t.busId?.capacity - t.seatsBooked) >= numPeople)).length === 0 && (
                  <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No buses matching your requirements.</p>
                )}
              </div>

              {/* Booked Section */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <X className="w-3 h-3" /> Fully Booked / Unavailable
                </p>
                {allTrips.filter(t => 
                  t.busId?.type === busType && 
                  (isFullBus ? t.seatsBooked > 0 : (t.busId?.capacity - t.seatsBooked) < numPeople)
                ).map(t => (
                  <div key={t._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 opacity-60 grayscale">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Bus className="w-5 h-5 text-slate-300" />
                        <div>
                          <p className="text-xs font-black text-slate-400">{t.busId?.vehicleNumber}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {isFullBus ? 'Seats already taken' : `Only ${t.busId?.capacity - t.seatsBooked} seats left`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-slate-50">
            <button onClick={() => goToStep(1)} disabled={movingStep} className="text-slate-800 font-bold flex items-center gap-2 hover:text-slate-900 transition-colors">
              Back
            </button>
            <button
              onClick={() => isFullBus ? goToStep(4) : goToStep(3)}
              disabled={movingStep || !trip}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {movingStep ? <Loader2 className="w-5 h-5 animate-spin" /> : (isFullBus ? 'Review Booking' : 'Choose Seat')} 
              {!movingStep && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="text-left">
              <h1 className="text-4xl font-black text-slate-900 mb-2">Select Your Seat</h1>
              <p className="text-slate-500 font-medium">Choose a preferred seat for your journey.</p>
            </div>
            
            <div className="bg-slate-900 px-6 py-4 rounded-3xl text-white flex items-center gap-4 shadow-xl">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Assigned Bus</p>
                <p className="text-lg font-black tracking-tight leading-none">{trip?.busId?.vehicleNumber}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* Bus Layout */}
            <div className="flex-1 bg-slate-50 p-8 rounded-[3rem] border border-slate-100 max-w-md mx-auto">
              <div className="w-full aspect-[1/2] bg-white rounded-[2rem] shadow-inner p-6 flex flex-col relative">
                {/* Steering Wheel Area */}
                <div className="flex justify-between items-center mb-12 px-4 opacity-30">
                  <div className="w-10 h-10 rounded-full border-4 border-slate-300 flex items-center justify-center">
                    <div className="w-1 h-6 bg-slate-300 rounded-full rotate-45" />
                  </div>
                  <div className="w-12 h-10 bg-slate-200 rounded-lg" />
                </div>

                {fetchingSeats ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    {Array.from({ length: trip?.busId?.capacity || 40 }).map((_, i) => {
                      const seatNum = i + 1;
                      const isBooked = bookedSeats.includes(seatNum);
                      const isSelected = selectedSeat.includes(seatNum);
                      
                      // Create a gap for the aisle
                      const isAisle = i % 4 === 2;
                      
                      return (
                        <div key={i} className={`flex items-center justify-center ${isAisle ? 'mr-4' : ''}`}>
                          <button
                            disabled={isBooked}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSeat(selectedSeat.filter(s => s !== seatNum));
                              } else if (selectedSeat.length < numPeople) {
                                setSelectedSeat([...selectedSeat, seatNum]);
                              } else {
                                toast.error(`You can only select ${numPeople} seats`);
                              }
                            }}
                            className={`
                              w-10 h-10 rounded-xl font-bold text-xs transition-all transform
                              ${isBooked ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 
                                isSelected ? 'bg-slate-900 text-white scale-110 shadow-lg' : 
                                'bg-white border-2 border-slate-100 text-slate-600 hover:border-slate-900 hover:text-slate-900'}
                            `}
                          >
                            {seatNum}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Legend & Summary */}
            <div className="lg:w-72 space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Legend</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-white border-2 border-slate-100" />
                    <span className="text-xs font-bold text-slate-600">Available</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-slate-100" />
                    <span className="text-xs font-bold text-slate-600">Booked</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded bg-slate-900" />
                    <span className="text-xs font-bold text-slate-600">Selected</span>
                  </div>
                </div>

                <button 
                  onClick={refreshSeats}
                  disabled={fetchingSeats}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${fetchingSeats ? 'animate-spin' : ''}`} />
                  Refresh Availability
                </button>
              </div>

              {selectedSeat.length > 0 && (
                <div className="bg-slate-900 p-6 rounded-3xl text-white animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Selected Seat{selectedSeat.length > 1 ? 's' : ''}</p>
                  <p className="text-3xl font-black">
                    {selectedSeat.sort((a, b) => a - b).map(s => `#${s}`).join(', ')}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {selectedSeat.length === numPeople 
                      ? `All ${numPeople} seats selected` 
                      : `Select ${numPeople - selectedSeat.length} more seat${numPeople - selectedSeat.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-slate-50">
            <button onClick={() => goToStep(2)} disabled={movingStep} className="text-slate-800 font-bold flex items-center gap-2 hover:text-slate-900 transition-colors">
              Back
            </button>
            <button
              disabled={selectedSeat.length !== numPeople || movingStep}
              onClick={() => goToStep(4)}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {movingStep ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Selection'} 
              {!movingStep && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {step === 4 && !booking && (
        <div className="space-y-12">
          <div className="text-left">
            <h1 className="text-4xl font-black text-slate-900 mb-2">Final Review</h1>
            <p className="text-slate-500 font-medium">Review your journey details and confirm booking.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="card !p-8 border-slate-100 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">From</p>
                      <p className="font-bold text-slate-900 text-lg leading-tight">{locations?.from?.address}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">To</p>
                      <p className="font-bold text-slate-900 text-lg leading-tight">{locations?.to?.address}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Journey Date</p>
                      <p className="font-bold text-slate-900">{new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="space-y-8 pl-8 border-l border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Bus Details</p>
                      <p className="font-bold text-slate-900 leading-none">{trip?.busId?.vehicleNumber}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{trip?.busId?.type} • {trip?.busId?.operatorName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Passengers</p>
                      <p className="font-bold text-slate-900">
                        {isFullBus ? `Full Bus (${trip?.busId?.capacity} Seats)` : `${numPeople} Person${numPeople > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">
                        {isFullBus ? 'Booking Type' : `Selected Seat${selectedSeat.length > 1 ? 's' : ''}`}
                      </p>
                      <p className="font-bold text-slate-900">
                        {isFullBus ? 'Private Charter' : selectedSeat.sort((a, b) => a - b).map(s => `#${s}`).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Fare</p>
                <p className="text-5xl font-black mb-1">₹{Math.ceil(((fareInfo?.price || 0) * (isFullBus ? (trip?.busId?.capacity || 1) : numPeople)) / 10) * 10}</p>
                <p className="text-xs text-slate-400 mb-2">{fareInfo?.distanceText} Journey</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-8">
                  ₹{fareInfo?.price} × {isFullBus ? `${trip?.busId?.capacity} (Full Bus)` : `${numPeople} Person${numPeople > 1 ? 's' : ''}`}
                </p>
                
                <button
                  onClick={handleBook}
                  disabled={submitting || movingStep}
                  className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm & Book
                </button>
              </div>
              <button onClick={() => isFullBus ? goToStep(2) : goToStep(3)} disabled={movingStep} className="w-full text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
                Change Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {booking && (
        <div className="max-w-2xl mx-auto py-12 text-center animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
            <PartyPopper className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4">Booking Successful!</h1>
          <p className="text-slate-500 font-medium mb-12">Your journey is confirmed. Redirecting to your bookings...</p>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white text-left shadow-2xl relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Booking Reference</p>
                  <p className="text-2xl font-mono font-black text-white">{booking.bookingReference}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bus Number Plate</p>
                  <p className="text-2xl font-black text-white tracking-tight">{trip?.busId?.vehicleNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 border-t border-white/10 pt-10">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pickup Point</p>
                  <p className="font-bold text-slate-200 line-clamp-2">{booking.fromCoords?.address}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Drop-off Point</p>
                  <p className="font-bold text-slate-200 line-clamp-2">{booking.toCoords?.address}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Seats</p>
                  <p className="text-xl font-black text-white">
                    {booking.isFullBus ? 'Full Bus' : booking.seatNumbers.map(s => `#${s}`).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-xl font-black text-emerald-400">₹{booking.price}</p>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/my-bookings')}
            className="mt-12 text-slate-400 font-bold hover:text-slate-900 transition-colors flex items-center gap-2 mx-auto"
          >
            Go to My Bookings <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
