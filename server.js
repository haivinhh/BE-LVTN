const app = require('./app');
const port = 3001;

// Bắt đầu server trên cổng 3001
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
