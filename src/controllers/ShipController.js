const connection = require('../models/db');

const shipController = {
  getAllDVVC: (req, res) => {
    connection.query('SELECT * FROM donvivanchuyen', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  },
  addDVVC: (req, res) => {
    const { tenDonVi } = req.body;
    if (!tenDonVi) return res.status(400).json({ message: 'Tên đơn vị vận chuyển là bắt buộc' });
    connection.query(
      `INSERT INTO donvivanchuyen ("tenDonVi") VALUES ($1) RETURNING "idDonViVanChuyen"`,
      [tenDonVi],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({ message: 'Thêm đơn vị vận chuyển thành công', id: results[0].idDonViVanChuyen });
      }
    );
  },
  updateDVVC: (req, res) => {
    const { idDonViVanChuyen } = req.params;
    const { tenDonVi } = req.body;
    if (!tenDonVi) return res.status(400).json({ message: 'Tên đơn vị vận chuyển là bắt buộc' });
    connection.query(
      `UPDATE donvivanchuyen SET "tenDonVi" = $1 WHERE "idDonViVanChuyen" = $2`,
      [tenDonVi, idDonViVanChuyen],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy đơn vị vận chuyển' });
        res.json({ message: 'Cập nhật đơn vị vận chuyển thành công' });
      }
    );
  },
  deleteDVVC: (req, res) => {
    const { idDonViVanChuyen } = req.params;
    connection.query(
      `DELETE FROM donvivanchuyen WHERE "idDonViVanChuyen" = $1`,
      [idDonViVanChuyen],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy đơn vị vận chuyển' });
        res.json({ message: 'Xóa đơn vị vận chuyển thành công' });
      }
    );
  },
};

module.exports = shipController;
