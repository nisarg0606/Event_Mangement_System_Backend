const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  customer_uid: {
    type: String,
  },
  venue_uid: {
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
{collection:"bookings"}
);

const recordsDB = mongoose.connection.useDb("records")
const accounts = recordsDB.model("accounts",bookingSchema)

module.exports = accounts