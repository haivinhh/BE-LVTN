// models/DonHang.js
const { DataTypes } = require('sequelize');
const { Sequelize } = require('sequelize');

const connection = require('../config/dbConfig'); 

const DonHang = connection.define('DonHang', {
    idDonHang: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUser: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    trangThaiTT: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = DonHang;
