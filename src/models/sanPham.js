const { DataTypes } = require('sequelize');
const connection = require('../config/dbConfig'); 

const sanPham = connection.define('sanPham', {
    idSanPham: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenSanPham: {
        type: DataTypes.STRING,
        allowNull: false
    },
    donGia: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    thongTinSP: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    soLuong: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    hinhSP:{
        type: DataTypes.TEXT,
        allowNull: true
    },
    danhMucSP:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dongDT: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    hangLoi: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

module.exports = sanPham;