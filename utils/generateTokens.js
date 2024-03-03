const jwt = require("jsonwebtoken");
const tokens = require("../mongo/user/tokens");

const generateTokens = async (user) => {
  try {
    const payload = { email: user.email, username: user.username };
    const accessToken = jwt.sign(
      payload,
      process.env.ACCESS_TOKEN_PRIVATE_KEY,
      { expiresIn: "1h" }
      // { expiresIn: "10s" }
    );
    const refreshToken = jwt.sign(
      payload,
      process.env.REFRESH_TOKEN_PRIVATE_KEY,
      { expiresIn: "1d" }
    );
    await tokens.deleteOne({ userEmail: user.email });

    await new tokens({
      userEmail: user.email,
      refreshToken: refreshToken,
    }).save();
    return Promise.resolve({ accessToken, refreshToken });
  } catch (err) {
    return Promise.reject(err);
  }
};

module.exports = generateTokens;
