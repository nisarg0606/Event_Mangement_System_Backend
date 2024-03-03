const mongoose = require("mongoose");

const accountsScehma = new mongoose.Schema({
  email: {
    type: String,
  },
  uid: {
    type: String,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  role:{
    type: String,
    enum: ['Customer', 'Host']
  },
  AuthType:{
    type:String,
    enum:['OAuth','Credentials'],
    default:'Credentials'
  },
  otp_enabled:{
    type:Boolean,
    default:false
  },
  otp_verified:{
    type:Boolean,
    default:false
  },
  otp_base32:{
    type:String
  },
  otp_auth_url:{
    type:String
  },
  interested_sports:{
    type:Array
  }
},
{collection:"accounts"}
);

const userDB = mongoose.connection.useDb("user")
const accounts = userDB.model("accounts",accountsScehma)

module.exports = accounts