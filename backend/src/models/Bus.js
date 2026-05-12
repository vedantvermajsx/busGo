import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  operatorName: { type: String, required: true },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  capacity: { type: Number, required: true, min: 1 },
  type: { type: String, enum: ['AC', 'Non-AC', 'Sleeper', 'Semi-Sleeper', 'Mini'], default: 'Non-AC' },
  amenities: [{ type: String }],
  isActive: { type: Boolean, default: true },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date }
  },
  status: { type: String, enum: ['available', 'on-trip', 'maintenance', 'inactive'], default: 'available' },
}, { timestamps: true });

busSchema.index({ status: 1 });

export default mongoose.model('Bus', busSchema);
