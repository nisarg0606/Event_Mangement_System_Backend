const mongoose = require("mongoose");

const activitiesSchema = new mongoose.Schema(
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
    participantsLimit:{
        type:Number,
        default:100
    },
    participants_uids:{
        type:Array,
        default:[]
    },
    date:{
        type:String,
    },
    time:{
        type:String
    }
    
  },
  { collection: "activities" }
);

const activityDB = mongoose.connection.useDb("activity");
const activites = activityDB.model("activites", activitiesSchema);

module.exports = activites;
