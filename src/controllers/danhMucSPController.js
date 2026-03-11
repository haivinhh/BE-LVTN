const connection = require('../models/db');

const danhMucSPController = {
  getAlldanhMucSP: (req, res) => {
    connection.query('SELECT * FROM danhmucsp', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  },
  addDanhMucSP: (req, res) => {
    const { tenDanhMuc } = req.body;
    if (!tenDanhMuc) return res.status(400).json({ message: 'Tên danh mục sản phẩm là bắt buộc' });
    connection.query(
      `INSERT INTO danhmucsp ("tenDanhMuc") VALUES ($1) RETURNING "idDanhMuc"`,
      [tenDanhMuc],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({ message: 'Thêm danh mục sản phẩm thành công', id: results[0].idDanhMuc });
      }
    );
  },
  updateDanhMucSP: (req, res) => {
    const { idDanhMuc } = req.params;
    const { tenDanhMuc } = req.body;
    if (!tenDanhMuc) return res.status(400).json({ message: 'Tên danh mục sản phẩm là bắt buộc' });
    connection.query(
      `UPDATE danhmucsp SET "tenDanhMuc" = $1 WHERE "idDanhMuc" = $2`,
      [tenDanhMuc, idDanhMuc],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy danh mục sản phẩm' });
        res.json({ message: 'Cập nhật danh mục sản phẩm thành công' });
      }
    );
  },
  deleteDanhMucSP: (req, res) => {
    const { idDanhMuc } = req.params;
    connection.query(
      `SELECT COUNT(*) AS "productCount" FROM sanpham WHERE "danhMucSP" = $1`,
      [idDanhMuc],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (parseInt(results[0].productCount) > 0)
          return res.status(400).json({ message: 'Không thể xóa danh mục sản phẩm vì vẫn còn sản phẩm trong danh mục này' });
        connection.query(
          `DELETE FROM danhmucsp WHERE "idDanhMuc" = $1`,
          [idDanhMuc],
          (err, results) => {
            if (err) return res.status(500).send(err);
            if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy danh mục sản phẩm' });
            res.json({ message: 'Xóa danh mục sản phẩm thành công' });
          }
        );
      }
    );
  },
};

module.exports = danhMucSPController;
