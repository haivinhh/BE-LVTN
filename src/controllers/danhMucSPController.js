const connection = require("../models/db");

const danhMucSPController = {
  getAlldanhMucSP: (req, res) => {
    connection.query("SELECT * FROM danhMucSP", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
};

module.exports = danhMucSPController;
