import tripService from '../services/TripService.js';

export const getTrips = async (req, res) => {
  try {
    const { date, page, limit } = req.query;
    const trips = await tripService.searchTrips({ date, page, limit });
    res.json({ success: true, trips });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTripById = async (req, res) => {
  try {
    const trip = await tripService.getTripById(req.params.id);
    res.json({ success: true, trip });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const createTrip = async (req, res) => {
  try {
    const trip = await tripService.createTrip(req.body);
    res.status(201).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
