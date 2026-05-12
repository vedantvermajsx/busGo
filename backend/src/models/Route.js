import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
  fromStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  toStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  distanceKm: { type: Number, required: true, min: 0 },
  estimatedMinutes: { type: Number },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

routeSchema.index({ fromStopId: 1, toStopId: 1 }, { unique: true });

export default mongoose.model('Route', routeSchema);
