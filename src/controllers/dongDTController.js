const connection = require("../models/db");

const getAlldongDT = (req, res) => {
    connection.query("SELECT * FROM dongDT", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  };

  module.exports = {
   
    getAlldongDT
  };