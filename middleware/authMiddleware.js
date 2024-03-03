const jwt = require("jsonwebtoken");
const { verifyAuthToken } = require("../utils/verifyTokens");

const requireAuth = async (req, res, next) => {
  let authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7, authHeader.length);
    await verifyAuthToken(token)
      .then(() => {
        next();
      })
      .catch((err) => {
        res.status(401).send({ err: err });
      });
  } else {
    res.status(401).send({ err: "Auth Token not found" });
  }
  // next()
};

module.exports = { requireAuth };
