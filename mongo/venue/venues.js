const mongoose = require("mongoose");

const venuesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    uid: {
      type: String,
    },
    location: {
      type: String,
    },
    description: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    host_id: {
      type: String,
    },
    host_name: {
      type: String,
    },
    last_updated: {
      type: String,
      default: new Date().toISOString()
    },
    availability: {
      type: Boolean,
      default:true
    },
    sport: {
      type: String,
    },
    price:{
      type:Number,
      default:0
    },
    timings: [
      {
        timing: String,
        start: String,
        end: String,
        booked: { type: Boolean, default: false },
      },
    ],
  },
  { collection: "venues" }
);

const venueDB = mongoose.connection.useDb("venue");
const venues = venueDB.model("venues", venuesSchema);

module.exports = venues;
