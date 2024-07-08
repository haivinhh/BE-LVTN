const connection = require("../models/db");

const productController = {
  getAllProducts: (req, res) => {
    connection.query("SELECT * FROM sanPham", (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  getProductsByIDDanhMucSP: (req, res) => {
    const { idDanhMuc } = req.params;
    const query = "SELECT * FROM sanPham WHERE danhMucSP = ?";
    connection.query(query, [idDanhMuc], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  getProductById: (req, res) => {
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
  },
  getPhoneModelsByPhoneType: (req, res) => {
    const { idSanPham } = req.params;

    const query = `
    SELECT d2.*
    FROM sanPham sp
    JOIN dongDT d1 ON sp.dongDT = d1.idDongDT
    JOIN dongDT d2 ON d1.loaiDienThoai = d2.loaiDienThoai
    WHERE sp.idSanPham = ?;
  `;

    connection.query(query, [idSanPham], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      if (results.length === 0) {
        return res.status(404).send("Không có dòng điện thoại nào cùng loại");
      }
      res.json(results);
    });
  },
  getProductsByIDLoaiDT: (req, res) => {
    const { idLoaiDT } = req.params;
    const query = `
    SELECT sp.*
    FROM sanPham sp
    JOIN dongDT d ON sp.dongDT = d.idDongDT
    JOIN loaiDienThoai ldt ON d.loaiDienThoai = ldt.idLoaiDT
    WHERE ldt.idLoaiDT = ?
  `;
    connection.query(query, [idLoaiDT], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  getProductsByIDDongDT: (req, res) => {
    const { idDongDT } = req.params;
    const query = `
    SELECT sp.*
    FROM sanPham sp
    WHERE sp.dongDT = ?
  `;
    connection.query(query, [idDongDT], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  getFilteredProducts: (req, res) => {
    const { idLoaiDT, idDongDT, idDanhMuc } = req.query;

    // Base query
    let query =
      "SELECT sp.* FROM sanPham sp JOIN dongDT d ON sp.dongDT = d.idDongDT JOIN loaiDienThoai ldt ON d.loaiDienThoai = ldt.idLoaiDT WHERE 1=1";
    const queryParams = [];

    // Add filters dynamically
    if (idLoaiDT) {
      const idLoaiDTArray = idLoaiDT.split(",").map(Number); // Convert string to array of numbers
      query +=
        " AND ldt.idLoaiDT IN (" + idLoaiDTArray.map(() => "?").join(",") + ")";
      queryParams.push(...idLoaiDTArray);
    }

    if (idDongDT) {
      const idDongDTArray = idDongDT.split(",").map(Number); // Convert string to array of numbers
      query +=
        " AND sp.dongDT IN (" + idDongDTArray.map(() => "?").join(",") + ")";
      queryParams.push(...idDongDTArray);
    }

    if (idDanhMuc) {
      const idDanhMucArray = idDanhMuc.split(",").map(Number); // Convert string to array of numbers
      query +=
        " AND sp.danhMucSP IN (" +
        idDanhMucArray.map(() => "?").join(",") +
        ")";
      queryParams.push(...idDanhMucArray);
    }

    // Execute the query with the constructed parameters
    connection.query(query, queryParams, (err, results) => {
      if (err) {
        return res.status(500).send(err); // Return error if any
      }
      if (results.length === 0) {
        return res.json(false); // Return false if no products found
      }
      res.json(results); // Return the results as JSON
    });
  },

  searchProductByName: (req, res) => {
    const { productName } = req.params;
    const query = "SELECT * FROM sanPham WHERE tenSanPham LIKE ?";
    const searchTerm = `%${productName}%`;
    connection.query(query, [searchTerm], (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },

  addProduct: (req, res) => {
    const {
      tenSanPham,
      donGia,
      thongTinSP,
      soLuong,
      hinhSP,
      danhMucSP,
      dongDT,
    } = req.body;
    const query =
      "INSERT INTO sanPham (tenSanPham, donGia, thongTinSP, soLuong, hinhSp, danhMucSP, dongDT) VALUES (?, ?, ?, ?, ?, ?, ?)";
    connection.query(
      query,
      [tenSanPham, donGia, thongTinSP, soLuong, hinhSP, danhMucSP, dongDT],
      (err, results) => {
        if (err) {
          return res.status(500).send(err);
        }
        res.status(201).json({ idSanPham: results.insertId });
      }
    );
  },

  updateProduct: (req, res) => {
    const { idSanPham } = req.params;
    const {
      tenSanPham,
      donGia,
      thongTinSP,
      soLuong,
      hinhSP,
      danhMucSP,
      dongDT,
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
  },

  deleteProduct: (req, res) => {
    const { idSanPham } = req.params;
    const query = "DELETE FROM sanPham WHERE idSanPham = ?";
    connection.query(query, [idSanPham], (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Sản phẩm không tồn tại" });
      }
      res
        .status(200)
        .json({ success: true, message: "Xóa sản phẩm thành công" });
    });
  },
};

module.exports = productController;
