const app = require('./app');
const port = process.env.PORT || 3001;

// Bắt đầu server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
