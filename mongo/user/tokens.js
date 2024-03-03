const mongoose = require("mongoose");

const refreshTokensSchema = new mongoose.Schema(
  {
   userEmail:{
    type:String
   },
   refreshToken:{
    type:String,
    required:true
   },
   createdAt:{
    type: Date,
    default: Date.now,
    expires:"1d"
   }
  },
  { collection: "tokens" }
);

const usersDB = mongoose.connection.useDb("user");

const tokens = usersDB.model("tokens", refreshTokensSchema);

module.exports = tokens;
