const connection = require('../models/db');

const loaiDienThoaiController = {
  getAllloaiDT: (req, res) => {
    connection.query('SELECT * FROM loaidienthoai', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  },
  addLoaiDT: (req, res) => {
    const { tenLoaiDienThoai } = req.body;
    if (!tenLoaiDienThoai) return res.status(400).json({ message: 'Tên loại điện thoại là bắt buộc' });
    connection.query(
      `INSERT INTO loaidienthoai ("tenLoaiDienThoai") VALUES ($1) RETURNING "idLoaiDT"`,
      [tenLoaiDienThoai],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({ message: 'Thêm loại điện thoại thành công', id: results[0].idLoaiDT });
      }
    );
  },
  updateLoaiDT: (req, res) => {
    const { idLoaiDT } = req.params;
    const { tenLoaiDienThoai } = req.body;
    if (!tenLoaiDienThoai) return res.status(400).json({ message: 'Tên loại điện thoại là bắt buộc' });
    connection.query(
      `UPDATE loaidienthoai SET "tenLoaiDienThoai" = $1 WHERE "idLoaiDT" = $2`,
      [tenLoaiDienThoai, idLoaiDT],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy loại điện thoại' });
        res.json({ message: 'Cập nhật loại điện thoại thành công' });
      }
    );
  },
  deleteLoaiDT: (req, res) => {
    const { idLoaiDT } = req.params;
    connection.query(
      `SELECT COUNT(*) AS "dongDTCount" FROM dongdt WHERE "loaiDienThoai" = $1`,
      [idLoaiDT],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (parseInt(results[0].dongDTCount) > 0)
          return res.status(400).json({ message: 'Không thể xóa loại điện thoại vì vẫn còn dòng điện thoại thuộc loại này' });
        connection.query(
          `DELETE FROM loaidienthoai WHERE "idLoaiDT" = $1`,
          [idLoaiDT],
          (err, results) => {
            if (err) return res.status(500).send(err);
            if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy loại điện thoại' });
            res.json({ message: 'Xóa loại điện thoại thành công' });
          }
        );
      }
    );
  },
};

module.exports = loaiDienThoaiController;
