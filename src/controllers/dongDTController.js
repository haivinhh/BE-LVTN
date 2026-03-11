const connection = require('../models/db');

const dongDTController = {
  getAlldongDT: (req, res) => {
    connection.query('SELECT * FROM dongdt', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  },
  addDongDT: (req, res) => {
    const { tenDongDT, loaiDienThoai } = req.body;
    if (!tenDongDT) return res.status(400).json({ message: 'Tên dòng điện thoại là bắt buộc' });
    connection.query(
      `INSERT INTO dongdt ("tenDongDT","loaiDienThoai") VALUES ($1,$2) RETURNING "idDongDT"`,
      [tenDongDT, loaiDienThoai],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({ message: 'Thêm dòng điện thoại thành công', id: results[0].idDongDT });
      }
    );
  },
  updateDongDT: (req, res) => {
    const { idDongDT } = req.params;
    const { tenDongDT, loaiDienThoai } = req.body;
    if (!tenDongDT) return res.status(400).json({ message: 'Tên dòng điện thoại là bắt buộc' });
    connection.query(
      `UPDATE dongdt SET "tenDongDT"=$1,"loaiDienThoai"=$2 WHERE "idDongDT"=$3`,
      [tenDongDT, loaiDienThoai, idDongDT],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy dòng điện thoại' });
        res.json({ message: 'Cập nhật dòng điện thoại thành công' });
      }
    );
  },
  deleteDongDT: (req, res) => {
    const { idDongDT } = req.params;
    connection.query(
      `SELECT COUNT(*) AS "productCount" FROM sanpham WHERE "dongDT" = $1`,
      [idDongDT],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (parseInt(results[0].productCount) > 0)
          return res.status(400).json({ message: 'Không thể xóa dòng điện thoại vì vẫn còn sản phẩm thuộc dòng này' });
        connection.query(
          `DELETE FROM dongdt WHERE "idDongDT" = $1`,
          [idDongDT],
          (err, results) => {
            if (err) return res.status(500).send(err);
            if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy dòng điện thoại' });
            res.json({ message: 'Xóa dòng điện thoại thành công' });
          }
        );
      }
    );
  },
};

module.exports = dongDTController;
