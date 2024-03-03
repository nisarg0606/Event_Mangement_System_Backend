const mongoose = require("mongoose");

const activityBookingSchema = new mongoose.Schema({
  customer_uid: {
    type: String,
  },
  activity_uid: {
    type: String,
  },
  host_uid:{
    type:String
  },
  booking_date:{
    type:String
  },
  booking_time_slot:{
    type:String
  },
  
},
{collection:"activityBookings"}
);

const recordsDB = mongoose.connection.useDb("records")
const activityBookings = recordsDB.model("activityBookings",activityBookingSchema)

module.exports = activityBookings