import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  stops: [{
    stopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
    arrivalTime: { type: String, required: true }, // HH:mm format
  }],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  basePricePerKm: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['scheduled', 'boarding', 'on-trip', 'completed', 'cancelled'], default: 'scheduled' },
  seatsBooked: { type: Number, default: 0 },
  operatorConfirmed: { type: Boolean, default: false },
  adminApproved: { type: Boolean, default: false },
  notes: { type: String },
}, { timestamps: true });

tripSchema.index({ busId: 1, startTime: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ startTime: 1 });

export default mongoose.model('Trip', tripSchema);
