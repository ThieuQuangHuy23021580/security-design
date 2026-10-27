'use strict';

const express = require('express');
const config = require('../config');
const { users } = require('../data/users');
const { requireJwt } = require('../middleware/auth');
const {
  createPresignedPutUrl,
  ensureBucket,
  statObject,
} = require('../services/minio.service');

/**
 * Router cho API nguoi dung.
 *
 * Router duoc mount tai `/users`, khop voi route cua API Gateway
 * (Nginx dinh tuyen /users -> User Service). Nho vay khong can
 * dung co che "strip prefix" phuc tap, va API truc tiep cua service
 * van dung duong dan nhu client goi qua Gateway.
 */
const router = express.Router();

/** Chuẩn hóa lỗi thành JSON thống nhất. */
function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: code, message, ...extra });
}

/**
 * GET /users/me — thông tin người dùng hiện tại.
 * userId LUÔN lấy từ JWT đã xác thực (req.user.sub), không tin client.
 */
router.get('/me', requireJwt, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return fail(res, 404, 'user_not_found', 'Không tìm thấy người dùng.');
  return res.json({ user });
});

/**
 * GET /users/:id — xem hồ sơ cơ bản của một người dùng.
 */
router.get('/:id', requireJwt, (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return fail(res, 404, 'user_not_found', 'Không tìm thấy người dùng.');
  return res.json({ user });
});

// ---------------------------------------------------------------------------
// Valet Key — cấp pre-signed URL tải ảnh đại diện lên MinIO
// ---------------------------------------------------------------------------

/**
 * POST /users/me/avatar/presign
 *
 * Trả về pre-signed URL cho phép HTTP PUT lên đúng object của người dùng.
 * Client tải ảnh THẲNG lên MinIO, không đi qua Gateway hay User Service.
 */
router.post('/me/avatar/presign', requireJwt, async (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return fail(res, 404, 'user_not_found', 'Không tìm thấy người dùng.');

  const contentType = req.body?.contentType ?? 'image/png';

  // Chỉ cho phép định dạng ảnh phổ biến để giảm rủi ro upload file độc hại.
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(contentType)) {
    return fail(
      res,
      400,
      'invalid_content_type',
      `contentType không được hỗ trợ. Chấp nhận: ${allowedTypes.join(', ')}.`,
    );
  }

  // Tên object LUÔN gắn với user lấy từ JWT → user không thể ghi đè
  // ảnh của người khác, dù có truyền userId tùy ý trong body.
  const extension = contentType.split('/')[1];
  const objectName = `avatars/${user.id}/avatar.${extension}`;
  const expiry = config.minio.presignExpiry; // 300 giây = 5 phút

  try {
    const uploadUrl = await createPresignedPutUrl(objectName, expiry);

    return res.json({
      uploadUrl,
      method: 'PUT',
      objectName,
      bucket: config.minio.bucket,
      contentType,
      expiresIn: expiry,
      expiresAt: new Date(Date.now() + expiry * 1000).toISOString(),
      instructions:
        'Gửi HTTP PUT lên uploadUrl với header Content-Type khớp contentType. Không gửi file qua Gateway.',
    });
  } catch (err) {
    return fail(
      res,
      503,
      'presign_failed',
      'Không tạo được pre-signed URL tại thời điểm này.',
      { detail: err.message },
    );
  }
});

/**
 * POST /users/me/avatar/confirm
 *
 * Xác nhận object đã được tải lên MinIO và cập nhật avatarUrl cho user.
 */
router.post('/me/avatar/confirm', requireJwt, async (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return fail(res, 404, 'user_not_found', 'Không tìm thấy người dùng.');

  const objectName = typeof req.body?.objectName === 'string' ? req.body.objectName : '';

  // Chỉ chấp nhận object nằm trong thư mục của chính user này.
  const expectedPrefix = `avatars/${user.id}/`;
  if (!objectName.startsWith(expectedPrefix)) {
    return fail(
      res,
      403,
      'forbidden_object',
      `objectName phải bắt đầu bằng "${expectedPrefix}".`,
    );
  }

  try {
    const stat = await statObject(objectName);
    user.avatarUrl = `/${config.minio.bucket}/${objectName}`;
    return res.json({
      user,
      avatar: { objectName, size: stat.size, contentType: stat.contentType },
    });
  } catch (err) {
    return fail(
      res,
      404,
      'object_not_found',
      'Chưa tìm thấy object trên MinIO. Hãy tải ảnh lên trước khi xác nhận.',
      { detail: err.message },
    );
  }
});

module.exports = { router, ensureBucket };
