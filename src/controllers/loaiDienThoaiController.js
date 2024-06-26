const connection = require("../models/db");

const getAllloaiDT = (req, res) => {
    connection.query("SELECT * FROM loaiDienThoai", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  };

  module.exports = {
   
    getAllloaiDT
  };