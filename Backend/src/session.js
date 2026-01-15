const session = require("express-session");

module.exports = session({
  name: "sid",
  secret: "keyboard cat",
  resave: false,            
  saveUninitialized: false, 
});
