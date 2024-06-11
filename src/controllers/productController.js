const connection = require("../models/db");


const getAllProducts = (req, res) => {
  connection.query("SELECT * FROM sanPham", (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  });
};
const getProductsByIDDanhMucSP = (req, res) => {
  const { idDanhMuc } = req.params;
  const query = "SELECT * FROM sanPham WHERE danhMucSP = ?";
  connection.query(query, [idDanhMuc], (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  });
};
const getProductById = (req, res) => {
  const { idSanPham } = req.params;
  const query = "SELECT * FROM sanPham WHERE idSanPham = ?";
  connection.query(query, [idSanPham], (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (results.length === 0) {
      return res.status(404).send("Sản phẩm không tồn tại");
    }
    res.json(results[0]);
  });
};

const addProduct = (req, res) => {
  const {
    tenSanPham,
    donGia,
    thongTinSP,
    soLuong,
    hinhSP,
    danhMucSP,
    dongDT
  } = req.body;
  const query =
    "INSERT INTO sanPham (tenSanPham, donGia, thongTinSP, soLuong, hinhSp, danhMucSP, dongDT) VALUES (?, ?, ?, ?, ?, ?, ?)";
  connection.query(
    query,
    [
      tenSanPham,
      donGia,
      thongTinSP,
      soLuong,
      hinhSP,
      danhMucSP,
      dongDT
    ],
    (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.status(201).json({ idSanPham: results.insertId });
    }
  );
};

const updateProduct = (req, res) => {
  const { idSanPham } = req.params;
  const {
    tenSanPham,
    donGia,
    thongTinSP,
    soLuong,
    hinhSP,
    danhMucSP,
    dongDT
  } = req.body;
  const query =
    "UPDATE sanPham SET tenSanPham = ?, donGia = ?, thongTinSP = ?, soLuong = ?, hinhSP = ?, danhMucSP = ?, dongDT = ? WHERE idSanPham = ?";
  connection.query(
    query,
    [
      tenSanPham,
      donGia,
      thongTinSP,
      soLuong,
      hinhSP,
      danhMucSP,
      dongDT,
      idSanPham,
    ],
    (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results.affectedRows === 0) {
        return res.status(404).send("Sản phẩm không tồn tại");
      }
      res.status(200).send("Cập nhật sản phẩm thành công");
    }
  );
};

const deleteProduct = (req, res) => {
    const { idSanPham } = req.params;
    const query = "DELETE FROM sanPham WHERE idSanPham = ?";
    connection.query(query, [idSanPham], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });
      }
      res.status(200).json({ success: true, message: "Xóa sản phẩm thành công" });
    });
  };
  

module.exports = {
  getAllProducts,
  getProductsByIDDanhMucSP,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
};
