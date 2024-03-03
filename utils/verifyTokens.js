const jwt = require("jsonwebtoken");
const tokens = require("../mongo/user/tokens");

const verifyRefreshToken = async (refreshToken) => {
  const privateKey = process.env.REFRESH_TOKEN_PRIVATE_KEY;

  return new Promise((resolve, reject) => {
    let token = tokens.findOne({ refreshToken: refreshToken });
    if (token) {
      jwt.verify(refreshToken, privateKey, (err, tokenDetails) => {
        if (err)
          return reject({
            error: true,
            message: "Case-B |Invalid refresh token-B",
          });
        resolve({
          tokenDetails,
          error: false,
          message: "Valid refresh token",
        });
      });
    } else {
      return reject({ error: true, message: "Case-A |Invalid refresh token" });
    }
  });
};
const verifyAuthToken = async (AccessToken) => {
  const privateKey = process.env.ACCESS_TOKEN_PRIVATE_KEY;

  return new Promise((resolve, reject) => {
    jwt.verify(AccessToken, privateKey, (err, tokenDetails) => {
      if (err) return reject({ error: true, message: "Invalid Access token" });
      resolve({
        tokenDetails,
        error: false,
        message: "Valid Access token",
      });
    });
  });
};

module.exports = {
  verifyRefreshToken: verifyRefreshToken,
  verifyAuthToken: verifyAuthToken,
};
