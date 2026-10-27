# Thiết kế cho bảo mật — API Gateway

Dự án minh họa các **Security Design Patterns** thông qua hệ thống gồm User Service, Order Service, API Gateway và MinIO.

## 1. Chức năng chính

| Yêu cầu | Mô tả | Thành phần |
|---|---|---|
| Gateway Routing | Định tuyến `/users` và `/orders` đến đúng service | Nginx |
| Gateway Offloading | Xác thực JWT và giới hạn tốc độ request | Nginx |
| Gateway Aggregation | Tổng hợp thông tin người dùng và đơn hàng tại `/dashboard` | Gateway Core |
| Valet Key | Cấp pre-signed URL để tải ảnh trực tiếp lên MinIO, hết hạn sau 5 phút | User Service, MinIO |
| Benchmark | So sánh độ trễ khi gọi trực tiếp service và qua Gateway | k6 |

## 2. Kiến trúc hệ thống

- **API Gateway (Nginx):** Điểm truy cập chính, chịu trách nhiệm định tuyến, xác thực JWT và giới hạn request.
- **User Service:** Quản lý thông tin người dùng và tạo pre-signed URL cho ảnh đại diện.
- **Order Service:** Quản lý và truy vấn đơn hàng.
- **Gateway Core:** Gọi User Service và Order Service song song, sau đó tổng hợp dữ liệu cho `/dashboard`.
- **MinIO:** Lưu trữ ảnh đại diện. Client tải ảnh trực tiếp bằng pre-signed URL.
- **k6:** Đo hiệu năng API.

Gateway Core chỉ thực hiện điều phối và tổng hợp dữ liệu, không chứa nghiệp vụ của User Service hoặc Order Service.

## 3. Công nghệ sử dụng

- Node.js và Express.js
- Nginx
- Docker Compose
- MinIO
- k6

## 4. Cài đặt và khởi chạy

### Yêu cầu

- Docker Desktop hoặc Docker Engine có hỗ trợ Docker Compose.
- `curl` để kiểm thử API.

### Khởi chạy

Tạo file `.env` từ `.env.example` và thay đổi các thông tin bí mật trước khi chạy.

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Trên Windows PowerShell, có thể tạo file cấu hình bằng lệnh:

```powershell
Copy-Item .env.example .env
```

Các cổng chính:

| Cổng | Dịch vụ |
|---|---|
| `8080` | API Gateway |
| `9000` | MinIO API |
| `9001` | MinIO Console |

User Service, Order Service và Gateway Core chạy trong Docker network nội bộ.

Dừng hệ thống:

```bash
docker compose down
```

## 5. Kiểm thử các API

### Đăng nhập lấy JWT

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}'
```

Lấy giá trị `token` từ response và sử dụng trong các request tiếp theo.

### Gateway Routing

```bash
curl http://localhost:8080/users/me \
  -H "Authorization: Bearer <TOKEN>"

curl http://localhost:8080/orders/me \
  -H "Authorization: Bearer <TOKEN>"
```

### JWT và Rate Limiting

Các API được bảo vệ phải từ chối token không hợp lệ hoặc hết hạn bằng HTTP `401`.

Gửi nhiều request để kiểm tra giới hạn tốc độ:

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:8080/users/me \
    -H "Authorization: Bearer <TOKEN>"
done
```

Gateway được cấu hình với tốc độ mục tiêu **10 request/giây**. Request vượt giới hạn có thể nhận HTTP `429`, tùy cấu hình burst và trạng thái giới hạn hiện tại.

### Gateway Aggregation

```bash
curl http://localhost:8080/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

Response gồm thông tin người dùng và danh sách đơn hàng tương ứng. Gateway lấy danh tính từ JWT đã xác thực, gọi hai service song song và tổng hợp kết quả.

### Valet Key — Upload ảnh lên MinIO

Xin pre-signed URL:

```bash
curl -X POST http://localhost:8080/users/me/avatar/presign \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"contentType":"image/png"}'
```

Sử dụng `uploadUrl` nhận được để tải ảnh trực tiếp lên MinIO bằng HTTP `PUT`.

Pre-signed URL có thời hạn **300 giây (5 phút)** và chỉ cấp quyền thao tác trên object được chỉ định. Không tải ảnh qua Gateway hoặc User Service.

Có thể mở MinIO Console tại [http://localhost:9001](http://localhost:9001) để kiểm tra bucket ảnh đại diện.

## 6. Benchmark

Sử dụng k6 để so sánh hai trường hợp:

- **Direct:** Gọi trực tiếp User Service.
- **Gateway:** Gọi cùng API thông qua API Gateway.

Lấy JWT hợp lệ trước khi chạy. Sau đó thực hiện các kịch bản benchmark được cung cấp trong thư mục `benchmark/`.

Ví dụ, nếu Docker Compose định nghĩa profile `bench` và service `k6` như trong cấu hình dự án:

```bash
docker compose --profile bench run --rm \
  -e JWT_TOKEN="<TOKEN>" -e VUS=10 -e DURATION=30s \
  k6 run /benchmark/direct-user-service.js
```

```bash
docker compose --profile bench run --rm \
  -e JWT_TOKEN="<TOKEN>" -e VUS=10 -e DURATION=30s \
  k6 run /benchmark/via-gateway.js
```

Các chỉ số cần so sánh:

- Độ trễ trung bình.
- P95 latency.
- Request/giây (RPS).
- Tỷ lệ request lỗi.

Hai kịch bản cần sử dụng cùng endpoint, dữ liệu và điều kiện thử nghiệm tương đương. Benchmark overhead cơ bản nên được tách khỏi bài kiểm tra rate limiting để tránh giới hạn request làm sai lệch kết quả.

Chỉ điền bảng kết quả sau khi chạy benchmark thực tế.

## 7. Cấu hình môi trường

Các biến môi trường chính được khai báo trong `.env.example`:

| Biến | Ý nghĩa |
|---|---|
| `JWT_SECRET` | Khóa ký và xác thực JWT |
| `JWT_ISSUER` | Đơn vị phát hành token |
| `INTERNAL_API_TOKEN` | Bảo vệ API nội bộ |
| `GATEWAY_PORT` | Cổng API Gateway |
| `RATE_LIMIT_RATE` | Tốc độ request cho phép |
| `RATE_LIMIT_BURST` | Số request vượt tốc độ trung bình được xử lý theo cấu hình burst |
| `MINIO_ROOT_USER` | Tài khoản quản trị MinIO |
| `MINIO_ROOT_PASSWORD` | Mật khẩu quản trị MinIO |
| `MINIO_PUBLIC_ENDPOINT` | Endpoint MinIO mà client sử dụng |
| `MINIO_PRESIGN_EXPIRY` | Thời hạn pre-signed URL, tính bằng giây |

Không sử dụng thông tin xác thực mặc định khi triển khai thực tế và không commit file `.env` chứa bí mật lên repository.

## 8. Lưu ý bảo mật

- Gateway kiểm tra JWT trước khi chuyển request đến các API được bảo vệ.
- Các service xác thực lại JWT và kiểm tra quyền truy cập cần thiết.
- Không tin tưởng danh tính người dùng do client tự gửi qua header hoặc query string.
- API nội bộ phải được bảo vệ và không công khai trực tiếp.
- Pre-signed URL là quyền truy cập tạm thời; không chia sẻ URL hoặc ghi đầy đủ URL vào log.
- Cấu hình benchmark chỉ phục vụ đo hiệu năng và không được làm lộ các API nội bộ trong môi trường thông thường.