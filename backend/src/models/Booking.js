import mongoose from 'mongoose';

const coordSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },

  // Map-pinned coordinates (replaces stop IDs)
  fromCoords: { type: coordSchema, required: true },
  toCoords: { type: coordSchema, required: true },

  distanceKm: { type: Number, required: true },
  durationMinutes: { type: Number },
  price: { type: Number, required: true },
  basePricePerKm: { type: Number },
  numPeople: { type: Number, default: 1 },

  fareBreakdown: {
    distanceText: String,
    durationText: String,
    isFallback: Boolean,
  },

  // pending → confirmed (admin) | rejected (admin) | cancelled (user/admin) | completed
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
    default: 'pending',
  },

  seatNumbers: [{ type: Number }],
  isFullBus: { type: Boolean, default: false },
  bookingReference: { type: String, unique: true },
  
  // 4-digit pickup verification code
  verificationCode: { type: String },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },

  confirmedAt: { type: Date },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
}, { timestamps: true });

bookingSchema.pre('save', function (next) {
  if (!this.bookingReference) {
    this.bookingReference = 'BB' + Date.now().toString(36).toUpperCase();
  }
  if (!this.verificationCode) {
    // Generate random 4-digit code
    this.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
  }
  next();
});

bookingSchema.index({ userId: 1 });
bookingSchema.index({ tripId: 1 });
bookingSchema.index({ status: 1 });

export default mongoose.model('Booking', bookingSchema);
