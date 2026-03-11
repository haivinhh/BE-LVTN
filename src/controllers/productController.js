const connection = require('../models/db');

const productController = {
  getAllProducts: (req, res) => {
    connection.query('SELECT * FROM sanpham', (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  },
  getProductsByIDDanhMucSP: (req, res) => {
    const { idDanhMuc } = req.params;
    connection.query(
      `SELECT * FROM sanpham WHERE "danhMucSP" = $1`,
      [idDanhMuc],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
      }
    );
  },
  getProductById: (req, res) => {
    const { idSanPham } = req.params;
    connection.query(
      `SELECT * FROM sanpham WHERE "idSanPham" = $1`,
      [idSanPham],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('Sản phẩm không tồn tại');
        res.json(results[0]);
      }
    );
  },
  getPhoneModelsByPhoneType: (req, res) => {
    const { idSanPham } = req.params;
    connection.query(
      `SELECT d2.*
       FROM sanpham sp
       JOIN dongdt d1 ON sp."dongDT" = d1."idDongDT"
       JOIN dongdt d2 ON d1."loaiDienThoai" = d2."loaiDienThoai"
       WHERE sp."idSanPham" = $1`,
      [idSanPham],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('Không có dòng điện thoại nào cùng loại');
        res.json(results);
      }
    );
  },
  getProductsByIDLoaiDT: (req, res) => {
    const { idLoaiDT } = req.params;
    connection.query(
      `SELECT sp.*
       FROM sanpham sp
       JOIN dongdt d ON sp."dongDT" = d."idDongDT"
       JOIN loaidienthoai ldt ON d."loaiDienThoai" = ldt."idLoaiDT"
       WHERE ldt."idLoaiDT" = $1`,
      [idLoaiDT],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
      }
    );
  },
  getProductsByIDDongDT: (req, res) => {
    const { idDongDT } = req.params;
    connection.query(
      `SELECT * FROM sanpham WHERE "dongDT" = $1`,
      [idDongDT],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
      }
    );
  },
  getFilteredProducts: (req, res) => {
    const { idLoaiDT, idDongDT, idDanhMuc } = req.query;
    let query = `SELECT sp.* FROM sanpham sp JOIN dongdt d ON sp."dongDT" = d."idDongDT" JOIN loaidienthoai ldt ON d."loaiDienThoai" = ldt."idLoaiDT" WHERE 1=1`;
    const queryParams = [];

    if (idLoaiDT) {
      const arr = idLoaiDT.split(',').map(Number);
      query += ` AND ldt."idLoaiDT" IN (${arr.map((_, i) => `$${queryParams.length + i + 1}`).join(',')})`;
      queryParams.push(...arr);
    }
    if (idDongDT) {
      const arr = idDongDT.split(',').map(Number);
      query += ` AND sp."dongDT" IN (${arr.map((_, i) => `$${queryParams.length + i + 1}`).join(',')})`;
      queryParams.push(...arr);
    }
    if (idDanhMuc) {
      const arr = idDanhMuc.split(',').map(Number);
      query += ` AND sp."danhMucSP" IN (${arr.map((_, i) => `$${queryParams.length + i + 1}`).join(',')})`;
      queryParams.push(...arr);
    }

    connection.query(query, queryParams, (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) return res.json(false);
      res.json(results);
    });
  },
  searchProductByName: (req, res) => {
    const { productName } = req.params;
    connection.query(
      `SELECT * FROM sanpham WHERE "tenSanPham" ILIKE $1`,
      [`%${productName}%`],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
      }
    );
  },
  addProduct: (req, res) => {
    const { tenSanPham, donGia, thongTinSP, soLuong, hinhSP, danhMucSP, dongDT } = req.body;
    connection.query(
      `INSERT INTO sanpham ("tenSanPham","donGia","thongTinSP","soLuong","hinhSP","danhMucSP","dongDT") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING "idSanPham"`,
      [tenSanPham, donGia, thongTinSP, soLuong, hinhSP, danhMucSP, dongDT],
      (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({ idSanPham: results[0].idSanPham });
      }
    );
  },
  updateProduct: (req, res) => {
    const { idSanPham } = req.params;
    const { tenSanPham, donGia, thongTinSP, soLuong, hinhSP, danhMucSP, dongDT } = req.body;
    connection.query(
      `UPDATE sanpham SET "tenSanPham"=$1,"donGia"=$2,"thongTinSP"=$3,"soLuong"=$4,"hinhSP"=$5,"danhMucSP"=$6,"dongDT"=$7 WHERE "idSanPham"=$8`,
      [tenSanPham, donGia, thongTinSP, soLuong, hinhSP, danhMucSP, dongDT, idSanPham],
      (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.affectedRows === 0) return res.status(404).send('Sản phẩm không tồn tại');
        res.status(200).send('Cập nhật sản phẩm thành công');
      }
    );
  },
  deleteProduct: (req, res) => {
    const { idSanPham } = req.params;
    connection.query(
      `DELETE FROM sanpham WHERE "idSanPham" = $1`,
      [idSanPham],
      (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.affectedRows === 0) return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        res.status(200).json({ success: true, message: 'Xóa sản phẩm thành công' });
      }
    );
  },
};

module.exports = productController;
