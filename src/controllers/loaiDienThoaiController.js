const connection = require("../models/db");

const loaiDienThoaiController = {
  getAllloaiDT: (req, res) => {
    connection.query("SELECT * FROM loaiDienThoai", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  addLoaiDT: (req, res) => {
    const { tenLoaiDienThoai } = req.body;
    if (!tenLoaiDienThoai) {
      return res.status(400).json({ message: "Tên loại điện thoại là bắt buộc" });
    }
    const query = "INSERT INTO loaiDienThoai (tenLoaiDienThoai) VALUES (?)";
    connection.query(query, [tenLoaiDienThoai], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(201).json({ message: "Thêm loại điện thoại thành công", id: results.insertId });
    });
  },
  updateLoaiDT: (req, res) => {
    const { idLoaiDT } = req.params;
    const { tenLoaiDienThoai } = req.body;
    if (!tenLoaiDienThoai) {
      return res.status(400).json({ message: "Tên loại điện thoại là bắt buộc" });
    }
    const query = "UPDATE loaiDienThoai SET tenLoaiDienThoai = ? WHERE idLoaiDT = ?";
    connection.query(query, [tenLoaiDienThoai, idLoaiDT], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy loại điện thoại" });
      }
      res.json({ message: "Cập nhật loại điện thoại thành công" });
    });
  },
  deleteLoaiDT: (req, res) => {
    const { idLoaiDT } = req.params;

    // Check if there are any related records in dongDT
    const checkQuery = "SELECT COUNT(*) AS dongDTCount FROM dongDT WHERE loaiDienThoai = ?";
    connection.query(checkQuery, [idLoaiDT], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results[0].dongDTCount > 0) {
        return res.status(400).json({ message: "Không thể xóa loại điện thoại vì vẫn còn dòng điện thoại thuộc loại này" });
      }

      // Proceed to delete the loaiDienThoai
      const deleteQuery = "DELETE FROM loaiDienThoai WHERE idLoaiDT = ?";
      connection.query(deleteQuery, [idLoaiDT], (err, results) => {
        if (err) {
          return res.status(500).send(err);
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: "Không tìm thấy loại điện thoại" });
        }
        res.json({ message: "Xóa loại điện thoại thành công" });
      });
    });
  }
};

module.exports = loaiDienThoaiController;
