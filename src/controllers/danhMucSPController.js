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
  addDanhMucSP: (req, res) => {
    const { tenDanhMuc } = req.body;
    if (!tenDanhMuc) {
      return res.status(400).json({ message: "Tên danh mục sản phẩm là bắt buộc" });
    }
    const query = "INSERT INTO danhMucSP (tenDanhMuc) VALUES (?)";
    connection.query(query, [tenDanhMuc], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(201).json({ message: "Thêm danh mục sản phẩm thành công", id: results.insertId });
    });
  },
  updateDanhMucSP: (req, res) => {
    const { idDanhMuc } = req.params;
    const { tenDanhMuc } = req.body;
    if (!tenDanhMuc) {
      return res.status(400).json({ message: "Tên danh mục sản phẩm là bắt buộc" });
    }
    const query = "UPDATE danhMucSP SET tenDanhMuc = ? WHERE idDanhMuc = ?";
    connection.query(query, [tenDanhMuc, idDanhMuc], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy danh mục sản phẩm" });
      }
      res.json({ message: "Cập nhật danh mục sản phẩm thành công" });
    });
  },
  deleteDanhMucSP: (req, res) => {
    const { idDanhMuc } = req.params;

    // Check if there are any products in this category
    const checkQuery = "SELECT COUNT(*) AS productCount FROM sanPham WHERE danhMucSP = ?";
    connection.query(checkQuery, [idDanhMuc], (err, results) => {
      if (err) {
        console.error("Error checking products in danh muc SP:", err);
        return res.status(500).send(err);
      }
      if (results[0].productCount > 0) {
        return res.status(400).json({ message: "Không thể xóa danh mục sản phẩm vì vẫn còn sản phẩm trong danh mục này" });
      }

      // Proceed to delete the category
      const deleteQuery = "DELETE FROM danhMucSP WHERE idDanhMuc = ?";
      connection.query(deleteQuery, [idDanhMuc], (err, results) => {
        if (err) {
          console.error("Error deleting danh muc SP:", err);
          return res.status(500).send(err);
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: "Không tìm thấy danh mục sản phẩm" });
        }
        res.json({ message: "Xóa danh mục sản phẩm thành công" });
      });
    });
  }
};



module.exports = danhMucSPController;
