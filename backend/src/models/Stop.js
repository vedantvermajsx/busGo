import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  city: { type: String, required: true },
  state: { type: String },
  address: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

stopSchema.index({ lat: 1, lng: 1 });
stopSchema.index({ city: 1 });

export default mongoose.model('Stop', stopSchema);
