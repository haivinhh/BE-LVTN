const BaseRepository = require('./baseRepository');

class CartRepository extends BaseRepository {
  constructor() {
    super('donhang');
  }

  async findUnpaidCart(idUser) {
    const results = await this.query(
      `SELECT "idDonHang" FROM donhang WHERE "idUser" = $1 AND "trangThai" = 'unpaid'`,
      [idUser]
    );
    return results[0] || null;
  }

  async createCart(idUser) {
    const results = await this.query(
      `INSERT INTO donhang ("idUser","trangThai","ngayDatHang") VALUES ($1,'unpaid',NOW()) RETURNING "idDonHang"`,
      [idUser]
    );
    return results[0];
  }

  async getCartDetail(idUser) {
    return this.query(
      `SELECT dc."idChiTietDH",dc."idDonHang",dc."idSanPham",dc."soLuong",dc."tongTien",
              p."tenSanPham",p."donGia",p."hinhSP",c."tongTienDH",c."khuyenMai"
       FROM chitietdonhang dc
       JOIN sanpham p ON dc."idSanPham" = p."idSanPham"
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE c."idUser" = $1 AND c."trangThai" = 'unpaid'`,
      [idUser]
    );
  }

  async getCartItemPromo(idDonHang) {
    const results = await this.query(
      `SELECT SUM(dc."soLuong") AS "totalQuantity", c."idUser", k."KHThanThiet"
       FROM chitietdonhang dc
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       JOIN taikhoankh k ON c."idUser" = k."idUser"
       WHERE dc."idDonHang" = $1
       GROUP BY c."idUser", k."KHThanThiet"`,
      [idDonHang]
    );
    return results[0] || null;
  }

  async setDiscount(idDonHang, discount) {
    return this.query(
      `UPDATE donhang SET "khuyenMai" = $1 WHERE "idDonHang" = $2 AND "trangThai" = 'unpaid'`,
      [discount, idDonHang]
    );
  }

  async findCartItem(idDonHang, idSanPham) {
    const results = await this.query(
      `SELECT * FROM chitietdonhang WHERE "idDonHang" = $1 AND "idSanPham" = $2`,
      [idDonHang, idSanPham]
    );
    return results[0] || null;
  }

  async updateCartItemQuantity(idChiTietDH, soLuong) {
    return this.query(
      `UPDATE chitietdonhang SET "soLuong" = $1 WHERE "idChiTietDH" = $2`,
      [soLuong, idChiTietDH]
    );
  }

  async insertCartItem(idDonHang, idSanPham, soLuong) {
    return this.query(
      `INSERT INTO chitietdonhang ("idDonHang","idSanPham","soLuong") VALUES ($1,$2,$3)`,
      [idDonHang, idSanPham, soLuong]
    );
  }

  async updateDetailTotal(idDonHang, idSanPham) {
    return this.query(
      `UPDATE chitietdonhang
       SET "tongTien" = chitietdonhang."soLuong" * sanpham."donGia"
       FROM sanpham
       WHERE chitietdonhang."idSanPham" = sanpham."idSanPham"
         AND chitietdonhang."idDonHang" = $1
         AND chitietdonhang."idSanPham" = $2`,
      [idDonHang, idSanPham]
    );
  }

  async updateCartTotal(idDonHang) {
    const results = await this.query(
      `SELECT SUM(dc."tongTien") AS "totalBeforeDiscount", c."khuyenMai"
       FROM chitietdonhang dc
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE dc."idDonHang" = $1 AND c."trangThai" = 'unpaid'
       GROUP BY c."idDonHang"`,
      [idDonHang]
    );
    if (results.length === 0) return;
    const { totalBeforeDiscount, khuyenMai } = results[0];
    const total = totalBeforeDiscount - totalBeforeDiscount * (khuyenMai || 0);
    return this.query(
      `UPDATE donhang SET "tongTienDH" = $1 WHERE "idDonHang" = $2 AND "trangThai" = 'unpaid'`,
      [total, idDonHang]
    );
  }

  async getCartItemWithOwner(idChiTietDH, idUser) {
    const results = await this.query(
      `SELECT dc.*,c."idUser" FROM chitietdonhang dc
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE dc."idChiTietDH" = $1 AND c."idUser" = $2 AND c."trangThai" = 'unpaid'`,
      [idChiTietDH, idUser]
    );
    return results[0] || null;
  }

  async deleteCartItem(idChiTietDH) {
    return this.query(`DELETE FROM chitietdonhang WHERE "idChiTietDH" = $1`, [idChiTietDH]);
  }

  async getOrdersByUser(idUser) {
    return this.query(
      `SELECT * FROM donhang WHERE "idUser" = $1 AND "trangThai" != 'unpaid'`,
      [idUser]
    );
  }

  async getOrderDetailOfUser(idUser, idDonHang) {
    return this.query(
      `SELECT dc."idChiTietDH",dc."idDonHang",dc."idSanPham",dc."soLuong",dc."tongTien",
              p."tenSanPham",p."donGia",p."hinhSP",c."tongTienDH"
       FROM chitietdonhang dc
       JOIN sanpham p ON dc."idSanPham" = p."idSanPham"
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE c."idUser" = $1 AND dc."idDonHang" = $2`,
      [idUser, idDonHang]
    );
  }

  async payCOD(idDonHang, recipientName, recipientPhone, recipientAddress) {
    return this.query(
      `UPDATE donhang SET "trangThai"='waiting',"tenNguoiNhan"=$1,"SDT"=$2,"diaChi"=$3,"phuongThucTT"='COD',"ngayDatHang"=$4
       WHERE "idDonHang"=$5`,
      [recipientName, recipientPhone, recipientAddress, new Date(), idDonHang]
    );
  }

  async cancelOrder(idDonHang) {
    return this.query(
      `UPDATE donhang SET "tenNguoiNhan"=NULL,"diaChi"=NULL,"SDT"=NULL,"trangThai"='unpaid'
       WHERE "idDonHang" = $1`,
      [idDonHang]
    );
  }
}

module.exports = new CartRepository();
