<?php

/** @var array $request */
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
    <div>
        <div class="d-flex align-items-center gap-2 mb-1">
            <h4 class="fw-bold mb-0">Yêu Cầu: <?= e($request['request_code']) ?></h4>
            <span class="badge bg-<?= match ($request['priority']) {
                                        'urgent' => 'danger',
                                        'high' => 'warning text-dark',
                                        'medium' => 'info text-dark',
                                        default => 'secondary'
                                    } ?>">
                <?= match ($request['priority']) {
                    'urgent' => 'Khẩn cấp',
                    'high' => 'Ưu tiên cao',
                    'medium' => 'Trung bình',
                    default => 'Thấp'
                } ?>
            </span>
        </div>
        <span class="text-muted small">Phòng <?= e($request['room_code']) ?> &bull; <?= e($request['tenant_name']) ?> &bull; <?= format_datetime($request['created_at']) ?></span>
    </div>
    <a href="<?= url('/maintenance') ?>" class="btn btn-outline-secondary btn-sm">
        <i class="bi bi-arrow-left"></i> Danh Sách
    </a>
</div>

<div class="row g-4">
    <!-- Chi tiết sự cố -->
    <div class="col-lg-7">
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white fw-bold">
                <i class="bi bi-exclamation-triangle text-warning me-2"></i>Chi Tiết Sự Cố Báo Hỏng
            </div>
            <div class="card-body">
                <h5 class="fw-bold text-dark mb-3"><?= e($request['title']) ?></h5>
                <p class="text-secondary" style="white-space: pre-line; line-height: 1.7;"><?= e($request['description']) ?></p>

                <?php if (!empty($request['image_path'])): ?>
                    <div class="mt-4">
                        <h6 class="fw-bold text-dark mb-2"><i class="bi bi-image me-1"></i> Hình ảnh chụp thực tế từ khách:</h6>
                        <a href="<?= upload_url($request['image_path']) ?>" target="_blank">
                            <img src="<?= upload_url($request['image_path']) ?>" class="img-fluid rounded border shadow-sm" style="max-height: 320px;" alt="Ảnh sự cố">
                        </a>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Cập nhật tiến độ xử lý -->
    <div class="col-lg-5">
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white fw-bold">
                <i class="bi bi-person-lines-fill text-primary me-2"></i>Thông Tin Liên Hệ Khách
            </div>
            <div class="card-body p-0">
                <ul class="list-group list-group-flush small">
                    <li class="list-group-item d-flex justify-content-between py-2">
                        <span class="text-muted">Khách thuê:</span>
                        <span class="fw-bold"><?= e($request['tenant_name']) ?></span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between py-2">
                        <span class="text-muted">Số điện thoại:</span>
                        <a href="tel:<?= e($request['tenant_phone']) ?>" class="fw-bold text-primary text-decoration-none"><i class="bi bi-telephone"></i> <?= e($request['tenant_phone']) ?></a>
                    </li>
                    <li class="list-group-item d-flex justify-content-between py-2">
                        <span class="text-muted">Phòng:</span>
                        <span class="fw-bold"><?= e($request['room_code']) ?> - <?= e($request['room_number']) ?></span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between py-2">
                        <span class="text-muted">Khu trọ:</span>
                        <span><?= e($request['area_name']) ?></span>
                    </li>
                </ul>
            </div>
        </div>

        <div class="card shadow-sm">
            <div class="card-header bg-white fw-bold">
                <i class="bi bi-gear-fill text-primary me-2"></i>Cập Nhật Tiến Độ & Chi Phí
            </div>
            <div class="card-body">
                <form action="<?= url('/maintenance/update/' . $request['id']) ?>" method="POST">
                    <?= csrf_field() ?>

                    <div class="mb-3">
                        <label for="status" class="form-label fw-bold small">Trạng Thái Xử Lý <span class="text-danger">*</span></label>
                        <select name="status" id="status" class="form-select">
                            <option value="pending" <?= $request['status'] === 'pending' ? 'selected' : '' ?>>Chờ xử lý</option>
                            <option value="in_progress" <?= $request['status'] === 'in_progress' ? 'selected' : '' ?>>Đang xử lý / Đã hẹn thợ</option>
                            <option value="completed" <?= $request['status'] === 'completed' ? 'selected' : '' ?>>Đã sửa xong (Hoàn thành)</option>
                            <option value="rejected" <?= $request['status'] === 'rejected' ? 'selected' : '' ?>>Từ chối yêu cầu</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label for="cost" class="form-label fw-bold small">Chi Phí Sửa Chữa (VNĐ)</label>
                        <input type="number" step="10000" class="form-control" id="cost" name="cost" value="<?= (float)$request['cost'] ?>" placeholder="0">
                        <div class="form-text">Nhập số tiền thực tế đã chi cho thợ/vật tư thay thế.</div>
                    </div>

                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="record_expense" name="record_expense" value="1" checked>
                        <label class="form-check-label small fw-bold" for="record_expense">
                            Tự động hạch toán vào mục Chi phí vận hành khi Hoàn thành
                        </label>
                    </div>

                    <div class="mb-3">
                        <label for="admin_notes" class="form-label fw-bold small">Phản Hồi & Ghi Chú Của Chủ Trọ</label>
                        <textarea class="form-control" id="admin_notes" name="admin_notes" rows="3" placeholder="Ghi chú nội dung đã xử lý, thợ sửa chữa, bảo hành..."><?= e($request['admin_notes'] ?? '') ?></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary w-100">
                        <i class="bi bi-check-lg me-1"></i> Lưu Cập Nhật Tiến Độ
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>