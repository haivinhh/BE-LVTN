const connection = require("../models/db");

const dongDTController = {
  getAlldongDT: (req, res) => {
    connection.query("SELECT * FROM dongDT", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  addDongDT: (req, res) => {
    const { tenDongDT,loaiDienThoai } = req.body;
    if (!tenDongDT) {
      return res.status(400).json({ message: "Tên dòng điện thoại là bắt buộc" });
    }
    const query = "INSERT INTO dongDT (tenDongDT,loaiDienThoai) VALUES (?, ?)";
    connection.query(query, [tenDongDT,loaiDienThoai], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(201).json({ message: "Thêm dòng điện thoại thành công", id: results.insertId });
    });
  },
  updateDongDT: (req, res) => {
    const { idDongDT } = req.params;
    const { tenDongDT,loaiDienThoai} = req.body;
    if (!tenDongDT) {
      return res.status(400).json({ message: "Tên dòng điện thoại là bắt buộc" });
    }
    const query = "UPDATE dongDT SET tenDongDT = ?,loaiDienThoai = ? WHERE idDongDT = ?";
    connection.query(query, [tenDongDT,loaiDienThoai, idDongDT], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy dòng điện thoại" });
      }
      res.json({ message: "Cập nhật dòng điện thoại thành công" });
    });
  },
  deleteDongDT: (req, res) => {
    const { idDongDT } = req.params;

    // Check if there are any related products
    const checkQuery = "SELECT COUNT(*) AS productCount FROM sanPham WHERE dongDT = ?";
    connection.query(checkQuery, [idDongDT], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results[0].productCount > 0) {
        return res.status(400).json({ message: "Không thể xóa dòng điện thoại vì vẫn còn sản phẩm thuộc dòng này" });
      }

      // Proceed to delete the dongDT
      const deleteQuery = "DELETE FROM dongDT WHERE idDongDT = ?";
      connection.query(deleteQuery, [idDongDT], (err, results) => {
        if (err) {
          return res.status(500).send(err);
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: "Không tìm thấy dòng điện thoại" });
        }
        res.json({ message: "Xóa dòng điện thoại thành công" });
      });
    });
  }
};

module.exports = dongDTController;
