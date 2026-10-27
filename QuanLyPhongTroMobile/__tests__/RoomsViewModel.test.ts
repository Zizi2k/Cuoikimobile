import { RoomsViewModel } from "../src/viewmodels/useRoomsViewModel";
import { MockRoomRepository } from "../src/repositories/MockRoomRepository";

describe("RoomsViewModel (MVVM Pattern)", () => {
  let mockRepo: MockRoomRepository;
  let vm: RoomsViewModel;

  beforeEach(() => {
    mockRepo = new MockRoomRepository();
    vm = new RoomsViewModel(mockRepo);
  });

  it("Test Case 1: Tải danh sách phòng thành công và tính toán thống kê", async () => {
    expect(vm.loading).toBe(false);
    expect(vm.rooms).toHaveLength(0);

    await vm.loadRooms();

    expect(vm.loading).toBe(false);
    expect(vm.error).toBeNull();
    expect(vm.rooms).toHaveLength(3);
    expect(vm.rooms[0].room_number).toBe("Phòng 101");
    expect(vm.stats.total).toBe(3);
    expect(vm.stats.rented).toBe(1);
    expect(vm.stats.empty).toBe(1);
    expect(vm.stats.maintenance).toBe(1);
  });

  it("Test Case 2: Xử lý lỗi khi Repository gặp sự cố (API Error Handling)", async () => {
    mockRepo.shouldFail = true;
    mockRepo.errorMessage = "Mất kết nối máy chủ WAMP";

    await vm.loadRooms();

    expect(vm.loading).toBe(false);
    expect(vm.error).toBe("Mất kết nối máy chủ WAMP");
    expect(vm.rooms).toHaveLength(0);
    expect(vm.isEmpty).toBe(true);
  });

  it("Test Case 3: Thêm phòng mới với validation hợp lệ", async () => {
    await vm.loadRooms();
    const initialCount = vm.rooms.length;

    // Validation lỗi: thiếu số phòng
    const failRes = await vm.addRoom({ price: 2000000 });
    expect(failRes.success).toBe(false);
    expect(failRes.message).toContain("Số phòng");

    // Thêm hợp lệ
    const successRes = await vm.addRoom({
      room_number: "Phòng 104",
      room_code: "P104",
      price: 3000000,
      area_size: 30,
      status: "empty",
    });

    expect(successRes.success).toBe(true);
    expect(vm.rooms.length).toBe(initialCount + 1);
    expect(vm.rooms.some((r) => r.room_number === "Phòng 104")).toBe(true);
  });

  it("Test Case 4: Lọc phòng trọ theo trạng thái (statusFilter)", async () => {
    await vm.loadRooms();

    vm.setStatusFilter("empty");
    expect(vm.filteredRooms).toHaveLength(1);
    expect(vm.filteredRooms[0].room_code).toBe("P102");

    vm.setStatusFilter("rented");
    expect(vm.filteredRooms).toHaveLength(1);
    expect(vm.filteredRooms[0].room_code).toBe("P101");

    vm.setStatusFilter("all");
    expect(vm.filteredRooms).toHaveLength(3);
  });
});
