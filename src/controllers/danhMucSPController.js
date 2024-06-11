const connection = require("../models/db");

const getAlldanhMucSP = (req, res) => {
    connection.query("SELECT * FROM danhMucSP", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  };

  module.exports = {
    
    getAlldanhMucSP
  };