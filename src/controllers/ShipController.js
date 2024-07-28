const connection = require("../models/db");

const shipController = {
  getAllDVVC: (req, res) => {
    connection.query("SELECT * FROM donViVanChuyen", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  addDVVC: (req, res) => {
    const { tenDonVi } = req.body;
    if (!tenDonVi) {
      return res.status(400).json({ message: "Tên đơn vị vận chuyển là bắt buộc" });
    }
    const query = "INSERT INTO donViVanChuyen (tenDonVi) VALUES (?)";
    connection.query(query, [tenDonVi], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(201).json({ message: "Thêm đơn vị vận chuyển thành công", id: results.insertId });
    });
  },
  updateDVVC: (req, res) => {
    const { idDonViVanChuyen } = req.params;
    const { tenDonVi } = req.body;
    if (!tenDonVi) {
      return res.status(400).json({ message: "Tên đơn vị vận chuyển là bắt buộc" });
    }
    const query = "UPDATE donViVanChuyen SET tenDonVi = ? WHERE idDonViVanChuyen = ?";
    connection.query(query, [tenDonVi, idDonViVanChuyen], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn vị vận chuyển" });
      }
      res.json({ message: "Cập nhật đơn vị vận chuyển thành công" });
    });
  }
  
};



module.exports = shipController;
